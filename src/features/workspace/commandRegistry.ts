/**
 * Single source of truth for every command the workspace exposes as a
 * Command Palette entry and/or a keyboard shortcut (CRI-103).
 *
 * A command is defined exactly once here — `commandId`, i18n label, category,
 * displayed shortcut, enabled predicate, execution — and `CommandPalette`
 * projects this instead of building its own list. Tool commands are
 * *derived* from `TOOL_REGISTRY` (`../canvas/toolRegistry`), never
 * duplicated: that file stays the single source for tools specifically, this
 * one composes it into the wider command set. `isOwnHistoryScope` is the
 * shared definition of "has its own editing history" that gates the global
 * `Ctrl+Z`/`Ctrl+Y` binding (see `WorkspaceShell`).
 *
 * Commands that also have a dedicated button (undo/redo, datasheet, Model
 * Doctor, analyze, theme) read the same underlying store values the button
 * does — `canUndo`/`canRedo`/`undo`/`redo` and friends all come from
 * `useProject()`, so there is exactly one computation of each command's
 * enabled state in the app, not two independent copies that could drift.
 *
 * What stays out, deliberately: node/member navigation is generated from live
 * project data (unbounded, no fixed `commandId`, no button or shortcut
 * anywhere else), so it is built as data, not registered as a command.
 */
import type { ComponentType } from 'react';
import {
  ChartNoAxesCombined,
  BoxSelect,
  ClipboardList,
  Download,
  Grid3x3,
  GitCompareArrows,
  Layers3,
  LocateFixed,
  Moon,
  Play,
  Redo2,
  Sheet,
  Sun,
  Undo2,
  Wrench,
} from 'lucide-react';
import type { TranslationKey } from '../../i18n/catalogs';
import type { ProjectModel, Selection, Tool } from '../../types';
import type { ResultTab } from '../../store/ProjectContext';
import { TOOL_REGISTRY } from '../canvas/toolRegistry';
import { SELECTION_QUERIES, countOf, toSelection } from '../canvas/selectByProperty';
import type { EditorLayerAction, EditorLayerPresetId } from '../canvas/editorLayers';
import { activateEvidenceLayer, EVIDENCE_LAYERS } from '../canvas/evidenceLayers';
import { emitWorkspaceCommand } from './workspaceCommands';
import { readCanvasViewSettings, withCanvasViewSettings } from '../view/canvasViewSettings';
import { exportProjectJson } from '../../utils/export';

export type CommandCategory = 'tools' | 'view' | 'results' | 'analysis' | 'navigate' | 'export';

export type CommandIcon = ComponentType<{ size?: number; 'aria-hidden'?: boolean | 'true' | 'false' }>;

/** Everything a command definition needs to compute its label, state and effect. */
export interface CommandContext {
  t: (key: TranslationKey, params?: Record<string, string | number>) => string;
  project: ProjectModel;
  hasAnalysis: boolean;
  isAnalyzing: boolean;
  canUndo: boolean;
  canRedo: boolean;
  classroomMode: boolean;
  selection?: Selection;
  theme: 'light' | 'dark';
  setActiveTool: (tool: Tool) => void;
  setSelection: (selection: Selection) => void;
  setResultTab: (tab: ResultTab) => void;
  setTheme: (theme: 'light' | 'dark') => void;
  updateProjectView: (updater: (draft: ProjectModel) => ProjectModel) => void;
  dispatchLayers: (action: EditorLayerAction) => void;
  analyze: () => void;
  undo: () => void;
  redo: () => void;
}

export interface CommandDefinition {
  id: string;
  category: CommandCategory;
  icon: CommandIcon;
  /** Overrides `icon` when the icon depends on context (e.g. the theme toggle). */
  iconFor?: (ctx: CommandContext) => CommandIcon;
  label: (ctx: CommandContext) => string;
  hint?: (ctx: CommandContext) => string | undefined;
  /** Synonyms are searchable, but are never shown as the command's title. */
  aliases?: (ctx: CommandContext) => readonly string[];
  /** A compact, human-readable destination or consequence for the palette. */
  route?: (ctx: CommandContext) => string | undefined;
  /** Require an explicit review step before an irreversible browser effect. */
  requiresConfirmation?: boolean;
  /** Displayed shortcut hint (e.g. `"Ctrl Z"`). Purely presentational unless a live key binding also names this id. */
  shortcut?: string;
  isEnabled?: (ctx: CommandContext) => boolean;
  /**
   * Whether invoking this command from the Palette should close it first and
   * defer the effect to the next frame — the choreography surfaces that mount
   * on open (Model Doctor, Datasheet, the generator) need to avoid racing the
   * Palette's own close/focus-restore. Plain commands run immediately.
   */
  deferredOpen?: boolean;
  run: (ctx: CommandContext) => void;
}

export interface CommandListItem extends Omit<CommandDefinition, 'icon' | 'iconFor' | 'label' | 'hint' | 'aliases' | 'route' | 'isEnabled' | 'run'> {
  icon: CommandIcon;
  label: string;
  hint?: string;
  aliases?: readonly string[];
  route?: string;
  disabled: boolean;
  run: () => void;
}

const STATIC_COMMANDS: readonly CommandDefinition[] = [
  {
    id: 'analysis:run',
    category: 'analysis',
    icon: Play,
    label: (ctx) => ctx.t('analysis.run'),
    hint: (ctx) => ctx.t('palette.analyzeHint'),
    aliases: () => ['calcular', 'resolver', 'run', 'solve'],
    route: () => 'Análisis',
    isEnabled: (ctx) => !ctx.isAnalyzing,
    run: (ctx) => {
      emitWorkspaceCommand('analysis-requested');
      ctx.analyze();
    },
  },
  {
    id: 'analysis:undo',
    category: 'analysis',
    icon: Undo2,
    label: (ctx) => ctx.t('history.undo'),
    shortcut: 'Ctrl Z',
    isEnabled: (ctx) => ctx.canUndo,
    run: (ctx) => ctx.undo(),
  },
  {
    id: 'analysis:redo',
    category: 'analysis',
    icon: Redo2,
    label: (ctx) => ctx.t('history.redo'),
    shortcut: 'Ctrl Y',
    isEnabled: (ctx) => ctx.canRedo,
    run: (ctx) => ctx.redo(),
  },
  {
    id: 'analysis:model-doctor',
    category: 'analysis',
    icon: Wrench,
    // Product name, not translated in either language today (matches the TopBar button).
    label: () => 'Model Doctor',
    hint: (ctx) => ctx.t('palette.modelDoctorHint'),
    aliases: () => ['diagnóstico', 'diagnostico', 'validar', 'errores', 'diagnostics', 'validation'],
    route: () => 'Análisis › Model Doctor',
    deferredOpen: true,
    run: () => emitWorkspaceCommand('open-model-doctor'),
  },
  {
    id: 'tool:datasheet',
    category: 'tools',
    icon: Sheet,
    label: (ctx) => ctx.t('datasheet.title'),
    hint: (ctx) => ctx.t('datasheet.description'),
    aliases: () => ['tabla', 'hoja de datos', 'sheet', 'table'],
    route: () => 'Herramientas › Tabla de datos',
    deferredOpen: true,
    run: () => emitWorkspaceCommand('open-datasheet'),
  },
  {
    id: 'tool:structure-generator',
    category: 'tools',
    icon: Grid3x3,
    label: (ctx) => ctx.t('generator.launcher'),
    hint: (ctx) => ctx.t('generator.paletteHint'),
    aliases: () => ['generar', 'plantilla', 'template', 'generate'],
    route: () => 'Herramientas › Generador',
    deferredOpen: true,
    run: () => emitWorkspaceCommand('open-structure-generator'),
  },
  {
    id: 'view:fit',
    category: 'view',
    icon: LocateFixed,
    label: (ctx) => ctx.t('canvas.fit'),
    run: () => emitWorkspaceCommand('fit-canvas'),
  },
  {
    id: 'view:grid',
    category: 'view',
    icon: Layers3,
    label: (ctx) => ctx.t(readCanvasViewSettings(ctx.project).showGrid ? 'canvas.gridOff' : 'canvas.gridOn'),
    run: (ctx) => ctx.updateProjectView((draft) => withCanvasViewSettings(draft, { showGrid: !readCanvasViewSettings(draft).showGrid })),
  },
  {
    id: 'view:snap',
    category: 'view',
    icon: Layers3,
    label: (ctx) => ctx.t(readCanvasViewSettings(ctx.project).snap ? 'canvas.snapOff' : 'canvas.snapOn'),
    run: (ctx) => ctx.updateProjectView((draft) => withCanvasViewSettings(draft, { snap: !readCanvasViewSettings(draft).snap })),
  },
  {
    id: 'view:theme',
    category: 'view',
    icon: Moon,
    iconFor: (ctx) => (ctx.theme === 'light' ? Moon : Sun),
    label: (ctx) => ctx.t(ctx.theme === 'light' ? 'theme.dark' : 'theme.light'),
    run: (ctx) => ctx.setTheme(ctx.theme === 'light' ? 'dark' : 'light'),
  },
  {
    id: 'export:bom',
    category: 'export',
    icon: ClipboardList,
    label: (ctx) => ctx.t('bom.title'),
    hint: (ctx) => ctx.t('bom.description'),
    aliases: () => ['materiales', 'cantidades', 'informe', 'report', 'takeoff'],
    route: () => 'Exportar › Materiales',
    deferredOpen: true,
    run: () => emitWorkspaceCommand('open-structural-bom'),
  },
  {
    id: 'analysis:compare-revisions',
    category: 'analysis',
    icon: GitCompareArrows,
    label: (ctx) => ctx.t('revision.title'),
    hint: (ctx) => ctx.t('revision.description'),
    deferredOpen: true,
    run: () => emitWorkspaceCommand('open-revision-comparison'),
  },
  {
    id: 'export:json',
    category: 'export',
    icon: Download,
    label: (ctx) => ctx.t('export.projectJson'),
    hint: () => 'Descarga una copia JSON del proyecto actual',
    aliases: () => ['exportar', 'guardar', 'descargar', 'download', 'backup'],
    route: () => 'Exportar › Archivo JSON',
    requiresConfirmation: true,
    run: (ctx) => {
      exportProjectJson(ctx.project);
      emitWorkspaceCommand('show-toast', { message: ctx.t('export.completed'), description: ctx.project.name, tone: 'success' });
    },
  },
  {
    id: 'export:svg',
    category: 'export',
    icon: Download,
    label: (ctx) => ctx.t('export.imageSvg'),
    hint: () => 'Descarga un dibujo vectorial SVG',
    aliases: () => ['exportar', 'imagen', 'vector', 'download'],
    route: () => 'Exportar › Imagen SVG',
    requiresConfirmation: true,
    run: (ctx) => {
      emitWorkspaceCommand('export-svg');
      emitWorkspaceCommand('show-toast', { message: ctx.t('export.completed'), tone: 'success' });
    },
  },
  {
    id: 'export:png',
    category: 'export',
    icon: Download,
    label: (ctx) => ctx.t('export.imagePng'),
    hint: () => 'Descarga una imagen PNG del lienzo',
    aliases: () => ['exportar', 'imagen', 'captura', 'download'],
    route: () => 'Exportar › Imagen PNG',
    requiresConfirmation: true,
    run: (ctx) => {
      emitWorkspaceCommand('export-png');
      emitWorkspaceCommand('show-toast', { message: ctx.t('export.completed'), tone: 'success' });
    },
  },
  {
    id: 'export:print',
    category: 'export',
    icon: Download,
    label: (ctx) => ctx.t('export.print'),
    hint: () => 'Abre el diálogo del sistema para imprimir o guardar como PDF',
    aliases: () => ['exportar', 'informe', 'pdf', 'imprimir', 'print', 'report'],
    route: () => 'Exportar › PDF o impresión',
    requiresConfirmation: true,
    run: () => window.print(),
  },
];

const LAYER_PRESETS: ReadonlyArray<{ id: EditorLayerPresetId; labelKey: TranslationKey }> = [
  { id: 'all', labelKey: 'canvas.layerPresetAll' },
  { id: 'model', labelKey: 'canvas.layerPresetModel' },
  { id: 'loads', labelKey: 'canvas.layerPresetLoads' },
  { id: 'results', labelKey: 'canvas.layerPresetResults' },
  { id: 'clean', labelKey: 'canvas.layerPresetClean' },
];

/**
 * Only the dense/second-half surfaces still open the Results panel (CRI-100):
 * summary, reactions, influence and "learn" have no canvas-layer equivalent yet.
 */
const PANEL_RESULT_TABS: ReadonlyArray<{ id: ResultTab; labelKey: TranslationKey }> = [
  { id: 'summary', labelKey: 'results.summary' },
  { id: 'reactions', labelKey: 'results.reactions' },
  { id: 'influence', labelKey: 'results.influence' },
  { id: 'learn', labelKey: 'results.learn' },
];

const layerPresetCommands = (ctx: CommandContext): CommandListItem[] => LAYER_PRESETS.map((preset): CommandListItem => ({
  id: `layers:${preset.id}`,
  category: 'view',
  icon: Layers3,
  label: ctx.t('palette.layerPreset', { preset: ctx.t(preset.labelKey) }),
  disabled: false,
  run: () => ctx.dispatchLayers({ type: 'preset', preset: preset.id }),
}));

const resultTabCommands = (ctx: CommandContext): CommandListItem[] => PANEL_RESULT_TABS.map((tab): CommandListItem => ({
  id: `results:${tab.id}`,
  category: 'results',
  icon: ChartNoAxesCombined,
  label: ctx.t('palette.openResultTab', { tab: ctx.t(tab.labelKey) }),
  disabled: !ctx.hasAnalysis,
  run: () => {
    ctx.setResultTab(tab.id);
    emitWorkspaceCommand('open-results', {});
  },
}));

/**
 * N / V / M / deformada / mapa are canvas evidence layers (CRI-100): they
 * light a layer on the drawing, they never open the Results panel.
 */
const evidenceLayerCommands = (ctx: CommandContext): CommandListItem[] => EVIDENCE_LAYERS.map((evidence): CommandListItem => ({
  id: `evidence:${evidence.id}`,
  category: 'results',
  icon: ChartNoAxesCombined,
  label: ctx.t('palette.toggleEvidenceLayer', { layer: ctx.t(evidence.labelKey) }),
  disabled: !ctx.hasAnalysis,
  run: () => activateEvidenceLayer(evidence.id, { setResultTab: ctx.setResultTab, dispatchLayers: ctx.dispatchLayers }),
}));

const diagramStackCommand = (ctx: CommandContext): CommandListItem => ({
  id: 'evidence:acm',
  category: 'results',
  icon: ChartNoAxesCombined,
  label: ctx.t('palette.toggleDiagramStack'),
  hint: ctx.t('canvas.evidenceStack'),
  disabled: !ctx.hasAnalysis,
  run: () => emitWorkspaceCommand('toggle-diagram-stack'),
});

const selectionQueryCommands = (ctx: CommandContext): CommandListItem[] => SELECTION_QUERIES
  .map((query) => ({ query, result: query.run(ctx.project, ctx.selection ?? null) }))
  .filter(({ query, result }) => countOf(result) > 0 || query.needsSelection)
  .map(({ query, result }): CommandListItem => ({
    id: `select:${query.id}`,
    category: 'navigate',
    icon: BoxSelect,
    label: ctx.t('select.paletteEntry', { query: ctx.t(query.labelKey), count: countOf(result) }),
    disabled: countOf(result) === 0,
    run: () => ctx.setSelection(toSelection(result)),
  }));

const toolCommands = (ctx: CommandContext): CommandListItem[] => TOOL_REGISTRY
  .filter((tool) => !(ctx.classroomMode && tool.classroomAdvanced))
  .map((tool): CommandListItem => ({
    id: `tool:${tool.id}`,
    category: 'tools',
    icon: Wrench,
    label: ctx.t(tool.labelKey),
    hint: tool.detailKey ? ctx.t(tool.detailKey) : undefined,
    shortcut: tool.shortcut,
    disabled: false,
    run: () => ctx.setActiveTool(tool.id),
  }));

const nodeCommands = (ctx: CommandContext): CommandListItem[] => ctx.project.nodes.map((node): CommandListItem => ({
  id: `node:${node.id}`,
  category: 'navigate',
  icon: LocateFixed,
  label: `${ctx.t('inspector.node')} ${node.id}`,
  hint: `X ${node.x} · Y ${node.y}`,
  disabled: false,
  run: () => {
    ctx.setSelection({ kind: 'node', id: node.id });
    emitWorkspaceCommand('focus-object', { kind: 'node', id: node.id });
  },
}));

const memberCommands = (ctx: CommandContext): CommandListItem[] => ctx.project.members.map((member): CommandListItem => ({
  id: `member:${member.id}`,
  category: 'navigate',
  icon: LocateFixed,
  label: `${ctx.t('inspector.member')} ${member.id}`,
  hint: `${member.i} → ${member.j}`,
  disabled: false,
  run: () => {
    ctx.setSelection({ kind: 'member', id: member.id });
    emitWorkspaceCommand('focus-object', { kind: 'member', id: member.id });
  },
}));

const projectStatic = (ctx: CommandContext): CommandListItem[] => STATIC_COMMANDS.map((command): CommandListItem => ({
  ...command,
  icon: command.iconFor ? command.iconFor(ctx) : command.icon,
  label: command.label(ctx),
  hint: command.hint?.(ctx),
  aliases: command.aliases?.(ctx),
  route: command.route?.(ctx),
  disabled: command.isEnabled ? !command.isEnabled(ctx) : false,
  run: () => command.run(ctx),
}));

/**
 * Whether `target` sits inside a surface with its own editing/history scope —
 * a text field, the Datasheet grid, or any modal surface — where the global
 * `Ctrl+Z`/`Ctrl+Y` shortcut must stay silent (G-01). Exported so the single
 * definition of "own history scope" is shared with whoever binds the keys.
 */
export const isOwnHistoryScope = (target: EventTarget | null): boolean => {
  if (!(target instanceof HTMLElement)) return false;
  return Boolean(target.closest('input, textarea, [contenteditable="true"], [role="grid"], [aria-modal="true"]'));
};

/**
 * The full, ordered command set. `CommandPalette` projects this rather than
 * building its own list.
 */
export const buildCommands = (ctx: CommandContext): CommandListItem[] => [
  ...projectStatic(ctx),
  ...toolCommands(ctx),
  ...layerPresetCommands(ctx),
  ...resultTabCommands(ctx),
  ...evidenceLayerCommands(ctx),
  diagramStackCommand(ctx),
  ...selectionQueryCommands(ctx),
  ...nodeCommands(ctx),
  ...memberCommands(ctx),
];

/**
 * Static commands that also have a dedicated visible button (TopBar) — the
 * ones `resolveTopBarCommand` is allowed to look up. Restricted on purpose:
 * every command in this list has been checked to only read `TopBarCommandContext`
 * (never canvas tool/selection/results/layer state), which is what lets
 * `resolveTopBarCommand` stub the rest of `CommandContext` safely instead of
 * forcing every button call site to fabricate unrelated callbacks.
 */
const TOPBAR_COMMAND_IDS = [
  'analysis:run', 'analysis:undo', 'analysis:redo', 'analysis:model-doctor',
  'tool:datasheet', 'view:theme',
  'export:bom', 'export:json', 'export:svg', 'export:png', 'export:print',
] as const;

export type TopBarCommandId = (typeof TOPBAR_COMMAND_IDS)[number];

export type TopBarCommandContext = Pick<CommandContext,
  't' | 'project' | 'isAnalyzing' | 'canUndo' | 'canRedo' | 'theme' | 'setTheme' | 'analyze' | 'undo' | 'redo'>;

/** Never invoked: every `TopBarCommandId` command is verified to not touch these. */
const unusedByTopBar = (): never => {
  throw new Error('commandRegistry: a TopBar command unexpectedly touched canvas/selection/results state.');
};

const TOPBAR_CONTEXT_STUBS: Pick<CommandContext,
  'hasAnalysis' | 'classroomMode' | 'setActiveTool' | 'setSelection' | 'setResultTab' | 'updateProjectView' | 'dispatchLayers'> = {
  hasAnalysis: false,
  classroomMode: false,
  setActiveTool: unusedByTopBar,
  setSelection: unusedByTopBar,
  setResultTab: unusedByTopBar,
  updateProjectView: unusedByTopBar,
  dispatchLayers: unusedByTopBar,
};

/**
 * Resolves one command's projected state (label, disabled, run, shortcut)
 * for a button outside the Palette — TopBar's undo/redo, datasheet, Model
 * Doctor, analyze, theme and export controls. The button reads `.label`,
 * `.disabled` and `.run` straight off the result instead of recomputing them,
 * so the button and the Palette entry for the same `commandId` can never
 * drift apart.
 */
export const resolveTopBarCommand = (id: TopBarCommandId, ctx: TopBarCommandContext): CommandListItem => {
  const full: CommandContext = { ...TOPBAR_CONTEXT_STUBS, ...ctx };
  const command = projectStatic(full).find((item) => item.id === id);
  if (!command) throw new Error(`commandRegistry: unknown TopBar command "${id}"`);
  return command;
};
