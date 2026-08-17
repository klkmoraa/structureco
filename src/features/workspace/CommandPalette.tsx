import { useCallback, useEffect, useId, useMemo, useRef, useState, type Dispatch, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import {
  ChartNoAxesCombined,
  Download,
  Grid3x3,
  Layers3,
  LocateFixed,
  Moon,
  Play,
  Redo2,
  Search,
  Sheet,
  Sun,
  Undo2,
  Wrench,
} from 'lucide-react';
import { useI18n } from '../../i18n/useI18n';
import type { TranslationKey } from '../../i18n/catalogs';
import { useProject, type ResultTab } from '../../store/ProjectContext';
import { exportProjectJson } from '../../utils/export';
import { TOOL_REGISTRY } from '../canvas/toolRegistry';
import type { EditorLayerAction, EditorLayerPresetId } from '../canvas/editorLayers';
import { activateEvidenceLayer, EVIDENCE_LAYERS } from '../canvas/evidenceLayers';
import type { SurfacePresentation } from './surfacePresentation';
import { emitWorkspaceCommand } from './workspaceCommands';
import { readCanvasViewSettings, withCanvasViewSettings } from '../view/canvasViewSettings';

export interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  dispatchLayers: Dispatch<EditorLayerAction>;
  presentation?: Extract<SurfacePresentation, 'overlay' | 'sheet'>;
}

type CommandGroupId = 'tools' | 'view' | 'results' | 'analysis' | 'navigate' | 'export';

interface PaletteCommand {
  id: string;
  group: CommandGroupId;
  label: string;
  hint?: string;
  shortcut?: string;
  icon: typeof Search;
  disabled?: boolean;
  run: () => void;
}

const GROUP_LABEL_KEYS: Record<CommandGroupId, TranslationKey> = {
  tools: 'palette.groupTools',
  view: 'palette.groupView',
  results: 'palette.groupResults',
  analysis: 'palette.groupAnalysis',
  navigate: 'palette.groupNavigate',
  export: 'palette.groupExport',
};

const GROUP_ORDER: readonly CommandGroupId[] = ['analysis', 'tools', 'navigate', 'results', 'view', 'export'];

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

const LAYER_PRESETS: ReadonlyArray<{ id: EditorLayerPresetId; labelKey: TranslationKey }> = [
  { id: 'all', labelKey: 'canvas.layerPresetAll' },
  { id: 'model', labelKey: 'canvas.layerPresetModel' },
  { id: 'loads', labelKey: 'canvas.layerPresetLoads' },
  { id: 'results', labelKey: 'canvas.layerPresetResults' },
  { id: 'clean', labelKey: 'canvas.layerPresetClean' },
];

/** Coincidencia por subcadena sobre etiqueta y pista, sin acentos ni mayúsculas. */
const normalize = (value: string) => value
  .toLocaleLowerCase('es')
  .normalize('NFD')
  .replace(/\p{Diacritic}/gu, '');

/**
 * Paleta de comandos (Ctrl/⌘ + K).
 *
 * No inventa acciones: cada entrada llama a un comando que la aplicación ya
 * expone — herramientas del `TOOL_REGISTRY`, pestañas de resultados, presets de
 * capas, historial, exportaciones y el bus `workspaceCommands`. Su valor está en
 * alcanzarlas con el teclado sin recordar dónde vive cada control, y en poder
 * saltar a un nudo o una barra por su identificador.
 */
export const CommandPalette = ({ open, onClose, dispatchLayers, presentation = 'overlay' }: CommandPaletteProps) => {
  const {
    project, analysis, theme, canUndo, canRedo, isAnalyzing, selection,
    setActiveTool, setSelection, setResultTab, setTheme, updateProjectView, analyze, undo, redo,
  } = useProject();
  const { t } = useI18n();
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const listId = useId();
  const titleId = useId();

  const close = useCallback(() => onClose(), [onClose]);

  const commands = useMemo<PaletteCommand[]>(() => {
    const run = (action: () => void) => () => { action(); close(); };
    const classroom = project.settings.calculationMode === 'classroom';
    const items: PaletteCommand[] = [];

    items.push({
      id: 'analysis:run',
      group: 'analysis',
      label: t('analysis.run'),
      hint: t('palette.analyzeHint'),
      icon: Play,
      disabled: isAnalyzing,
      run: run(analyze),
    });
    items.push({
      id: 'analysis:model-doctor',
      group: 'analysis',
      label: 'Model Doctor',
      hint: t('palette.modelDoctorHint'),
      icon: Wrench,
      run: () => {
        close();
        window.requestAnimationFrame(() => emitWorkspaceCommand('open-model-doctor'));
      },
    });
    // La hoja de datos audita el modelo, no lo analiza: vive con las
    // herramientas y no depende de que exista un resultado.
    items.push({
      id: 'tool:datasheet',
      group: 'tools',
      label: t('datasheet.title'),
      hint: t('datasheet.description'),
      icon: Sheet,
      run: () => {
        close();
        window.requestAnimationFrame(() => emitWorkspaceCommand('open-datasheet'));
      },
    });
    items.push({
      id: 'analysis:undo', group: 'analysis', label: t('history.undo'), shortcut: 'Ctrl Z',
      icon: Undo2, disabled: !canUndo, run: run(undo),
    });
    items.push({
      id: 'analysis:redo', group: 'analysis', label: t('history.redo'), shortcut: 'Ctrl Y',
      icon: Redo2, disabled: !canRedo, run: run(redo),
    });

    // La generación vive con las herramientas de creación, no con las de
    // análisis: crea geometría. No depende de la selección, así que nunca
    // aparece deshabilitada por no haber elegido nada.
    items.push({
      id: 'tool:structure-generator',
      group: 'tools',
      label: t('generator.launcher'),
      hint: t('generator.paletteHint'),
      icon: Grid3x3,
      run: () => {
        close();
        window.requestAnimationFrame(() => emitWorkspaceCommand('open-structure-generator'));
      },
    });

    for (const tool of TOOL_REGISTRY) {
      if (classroom && tool.classroomAdvanced) continue;
      items.push({
        id: `tool:${tool.id}`,
        group: 'tools',
        label: t(tool.labelKey),
        hint: tool.detailKey ? t(tool.detailKey) : undefined,
        shortcut: tool.shortcut,
        icon: Wrench,
        run: run(() => setActiveTool(tool.id)),
      });
    }

    for (const preset of LAYER_PRESETS) {
      items.push({
        id: `layers:${preset.id}`,
        group: 'view',
        label: t('palette.layerPreset', { preset: t(preset.labelKey) }),
        icon: Layers3,
        run: run(() => dispatchLayers({ type: 'preset', preset: preset.id })),
      });
    }
    items.push({
      id: 'view:fit', group: 'view', label: t('canvas.fit'), icon: LocateFixed,
      run: run(() => emitWorkspaceCommand('fit-canvas')),
    });
    items.push({
      id: 'view:grid',
      group: 'view',
      label: t(readCanvasViewSettings(project).showGrid ? 'canvas.gridOff' : 'canvas.gridOn'),
      icon: Layers3,
      run: run(() => updateProjectView((draft) => withCanvasViewSettings(draft, { showGrid: !readCanvasViewSettings(draft).showGrid }))),
    });
    items.push({
      id: 'view:snap',
      group: 'view',
      label: t(readCanvasViewSettings(project).snap ? 'canvas.snapOff' : 'canvas.snapOn'),
      icon: Layers3,
      run: run(() => updateProjectView((draft) => withCanvasViewSettings(draft, { snap: !readCanvasViewSettings(draft).snap }))),
    });
    items.push({
      id: 'view:theme',
      group: 'view',
      label: t(theme === 'light' ? 'theme.dark' : 'theme.light'),
      icon: theme === 'light' ? Moon : Sun,
      run: run(() => setTheme(theme === 'light' ? 'dark' : 'light')),
    });

    for (const tab of PANEL_RESULT_TABS) {
      items.push({
        id: `results:${tab.id}`,
        group: 'results',
        label: t('palette.openResultTab', { tab: t(tab.labelKey) }),
        icon: ChartNoAxesCombined,
        disabled: !analysis,
        run: run(() => {
          setResultTab(tab.id);
          emitWorkspaceCommand('open-results');
        }),
      });
    }

    // N / V / M / deformada / mapa are canvas evidence layers (CRI-100): the
    // palette lights the layer on the drawing, it never opens the Results panel.
    for (const evidence of EVIDENCE_LAYERS) {
      items.push({
        id: `evidence:${evidence.id}`,
        group: 'results',
        label: t('palette.toggleEvidenceLayer', { layer: t(evidence.labelKey) }),
        icon: ChartNoAxesCombined,
        disabled: !analysis,
        run: run(() => activateEvidenceLayer(evidence.id, { setResultTab, dispatchLayers })),
      });
    }

    for (const node of project.nodes) {
      items.push({
        id: `node:${node.id}`,
        group: 'navigate',
        label: `${t('inspector.node')} ${node.id}`,
        hint: `X ${node.x} · Y ${node.y}`,
        icon: LocateFixed,
        run: run(() => {
          setSelection({ kind: 'node', id: node.id });
          emitWorkspaceCommand('focus-object', { kind: 'node', id: node.id });
        }),
      });
    }
    for (const member of project.members) {
      items.push({
        id: `member:${member.id}`,
        group: 'navigate',
        label: `${t('inspector.member')} ${member.id}`,
        hint: `${member.i} → ${member.j}`,
        icon: LocateFixed,
        run: run(() => {
          setSelection({ kind: 'member', id: member.id });
          emitWorkspaceCommand('focus-object', { kind: 'member', id: member.id });
        }),
      });
    }

    items.push({
      id: 'export:json', group: 'export', label: t('export.projectJson'), icon: Download,
      run: run(() => {
        exportProjectJson(project);
        emitWorkspaceCommand('show-toast', { message: t('export.completed'), description: project.name, tone: 'success' });
      }),
    });
    items.push({
      id: 'export:svg', group: 'export', label: t('export.imageSvg'), icon: Download,
      run: run(() => emitWorkspaceCommand('export-svg')),
    });
    items.push({
      id: 'export:png', group: 'export', label: t('export.imagePng'), icon: Download,
      run: run(() => emitWorkspaceCommand('export-png')),
    });
    items.push({
      id: 'export:print', group: 'export', label: t('export.print'), icon: Download,
      run: run(() => window.print()),
    });

    return items;
  }, [
    analysis, analyze, canRedo, canUndo, close, dispatchLayers, isAnalyzing, project,
    setActiveTool, setResultTab, setSelection, setTheme, t, theme, undo, redo, updateProjectView,
  ]);

  const matches = useMemo(() => {
    const needle = normalize(query.trim());
    if (!needle) return commands;
    return commands.filter((command) =>
      normalize(command.label).includes(needle) || (command.hint ? normalize(command.hint).includes(needle) : false));
  }, [commands, query]);

  const enabled = useMemo(() => matches.filter((command) => !command.disabled), [matches]);

  useEffect(() => setActiveIndex(0), [query, open]);

  useEffect(() => {
    if (!open) return;
    window.requestAnimationFrame(() => inputRef.current?.focus());
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      close();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [close, open]);

  useEffect(() => {
    if (!open) return;
    listRef.current?.querySelector<HTMLElement>('[data-palette-active="true"]')?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex, matches, open]);

  if (!open) return null;

  const move = (delta: number) => {
    if (enabled.length === 0) return;
    setActiveIndex((current) => (current + delta + enabled.length) % enabled.length);
  };

  const onInputKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') { event.preventDefault(); move(1); }
    else if (event.key === 'ArrowUp') { event.preventDefault(); move(-1); }
    else if (event.key === 'Home') { event.preventDefault(); setActiveIndex(0); }
    else if (event.key === 'End') { event.preventDefault(); setActiveIndex(Math.max(0, enabled.length - 1)); }
    else if (event.key === 'Enter') { event.preventDefault(); enabled[activeIndex]?.run(); }
  };

  const activeCommandId = enabled[activeIndex]?.id;

  return <div
    className={`command-palette-backdrop command-palette-backdrop--${presentation}`}
    data-surface-presentation={presentation}
    role="presentation"
    onPointerDown={(event) => {
    if (event.target === event.currentTarget) close();
  }}>
    <div className="command-palette" data-workspace-surface="palette" role="dialog" aria-labelledby={titleId}>
      <h2 id={titleId} className="command-palette-title">{t('palette.title')}</h2>
      <div className="command-palette-search">
        <Search size={17} aria-hidden="true" />
        <input
          ref={inputRef}
          data-surface-focus-key="command-query"
          type="text"
          role="combobox"
          aria-expanded="true"
          aria-controls={listId}
          aria-activedescendant={activeCommandId ? `${listId}-${activeCommandId}` : undefined}
          aria-autocomplete="list"
          autoComplete="off"
          placeholder={t('palette.placeholder')}
          aria-label={t('palette.placeholder')}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={onInputKeyDown}
        />
        <kbd>Esc</kbd>
      </div>

      <div className="command-palette-list" id={listId} role="listbox" aria-label={t('palette.title')} ref={listRef}>
        {matches.length === 0 ? <p className="command-palette-empty">{t('palette.noResults', { query: query.trim() })}</p> : null}
        {GROUP_ORDER.map((group) => {
          const groupCommands = matches.filter((command) => command.group === group);
          if (groupCommands.length === 0) return null;
          return <section key={group} className="command-palette-group">
            <h3>{t(GROUP_LABEL_KEYS[group])}</h3>
            {groupCommands.map((command) => {
              const Icon = command.icon;
              const isActive = command.id === activeCommandId;
              return <button
                key={command.id}
                id={`${listId}-${command.id}`}
                type="button"
                role="option"
                /* Sin etiqueta explícita, el nombre accesible concatena
                   `strong`+`small`+`kbd` sin separación ("NodoN"). */
                aria-label={[command.label, command.hint, command.shortcut].filter(Boolean).join(' · ')}
                aria-selected={isActive}
                aria-disabled={command.disabled}
                data-palette-active={isActive}
                className={`command-palette-item${isActive ? ' is-active' : ''}`}
                disabled={command.disabled}
                onPointerEnter={() => {
                  const index = enabled.findIndex((candidate) => candidate.id === command.id);
                  if (index >= 0) setActiveIndex(index);
                }}
                onClick={command.run}
              >
                <Icon size={16} aria-hidden="true" />
                <span className="command-palette-label">
                  <strong>{command.label}</strong>
                  {command.hint ? <small>{command.hint}</small> : null}
                </span>
                {command.shortcut ? <kbd>{command.shortcut}</kbd> : null}
              </button>;
            })}
          </section>;
        })}
      </div>

      <footer className="command-palette-footer">
        <span>{t('palette.hintNavigate')}</span>
        <span>{selection && selection.kind !== 'multi' ? t('palette.currentSelection', { id: selection.id }) : t('palette.noSelection')}</span>
      </footer>
    </div>
  </div>;
};
