/**
 * CommandRegistry · fuente única de comandos.
 *
 * La regla que este módulo hace cumplir es la de CRI-9 D-09 y CRI-10 §11: el
 * MISMO `commandId` se invoca desde el botón visible, desde las acciones
 * contextuales, desde el atajo de teclado y desde la paleta (Fase B). No puede
 * haber tres implementaciones del mismo comando, y ninguna capacidad puede
 * vivir sólo en un desbordamiento o sólo en la paleta.
 *
 * `routes` es esa comprobación hecha dato: si un comando declarase una sola
 * ruta y ésa fuese `palette`, incumpliría el contrato de paridad.
 * `commandsViolatingParity` lo verifica; `smoke.mjs` lo ejercita en Chromium.
 *
 * Fase B no asigna un atajo de una sola letra a ninguna herramienta de
 * creación: CRI-9 G-01 deja pendiente la auditoría de colisiones con el
 * navegador, y asignar atajos sin esa auditoría es exactamente el riesgo que
 * el propio informe pide evitar. Las herramientas viven en `visible` +
 * `palette`, no en `shortcut`.
 */

import type { TranslationKey } from './i18n';

export type CommandId =
  | 'project.continue'
  | 'project.new'
  | 'project.import'
  | 'selection.clear'
  | 'selection.delete'
  | 'selection.locate'
  | 'member.changeSection'
  | 'analysis.solve'
  | 'view.evidence.none'
  | 'view.evidence.N'
  | 'view.evidence.V'
  | 'view.evidence.M'
  | 'view.evidence.deformed'
  | 'surface.view.toggle'
  | 'surface.detail.toggle'
  | 'surface.dense.toggle'
  | 'surface.doctor.toggle'
  | 'surface.palette.toggle'
  | 'surface.preferences.toggle'
  | 'surface.output.toggle'
  | 'surface.recovery.toggle'
  | 'surface.analysisSetup.toggle'
  | 'draft.commit'
  | 'draft.cancel'
  | 'workspace.back'
  | 'history.undo'
  | 'history.redo'
  | 'mode.toggle'
  | 'theme.toggle'
  | 'locale.toggle'
  | 'tool.select'
  | 'tool.node'
  | 'tool.member'
  | 'tool.support'
  | 'tool.load'
  | 'canvas.zoomIn'
  | 'canvas.zoomOut'
  | 'canvas.resetView';

export type CommandRoute = 'visible' | 'contextual' | 'shortcut' | 'palette' | 'row';

export interface CommandSpec {
  id: CommandId;
  labelKey: TranslationKey;
  /** Rutas por las que se puede invocar. Nunca `['palette']` a secas. */
  routes: CommandRoute[];
  /** Atajo declarado. Se audita contra el navegador antes de asignarlo. */
  shortcut?: string;
  /** Requiere alguna selección (nodo o miembro). */
  requiresSelection?: boolean;
  /** Requiere selección de miembro específicamente (p. ej. cambiar sección). */
  requiresMemberSelection?: boolean;
  /** Requiere resultado vivo. */
  requiresResult?: boolean;
}

export const COMMANDS: CommandSpec[] = [
  { id: 'project.continue', labelKey: 'welcome.continue', routes: ['visible'] },
  { id: 'project.new', labelKey: 'welcome.new', routes: ['visible'] },
  { id: 'project.import', labelKey: 'welcome.import', routes: ['visible'] },
  { id: 'selection.clear', labelKey: 'command.clearSelection', routes: ['contextual', 'shortcut'], shortcut: 'Esc' },
  {
    id: 'selection.delete',
    labelKey: 'command.delete',
    routes: ['visible', 'contextual', 'shortcut', 'palette'],
    shortcut: 'Delete',
    requiresSelection: true,
  },
  {
    id: 'selection.locate',
    labelKey: 'command.locate',
    routes: ['visible', 'contextual', 'row', 'palette'],
    requiresSelection: true,
  },
  {
    id: 'member.changeSection',
    labelKey: 'command.changeSection',
    routes: ['visible', 'contextual', 'palette'],
    requiresMemberSelection: true,
  },
  { id: 'analysis.solve', labelKey: 'command.solve', routes: ['visible', 'shortcut', 'palette'] },
  { id: 'view.evidence.none', labelKey: 'evidence.none', routes: ['visible', 'contextual'] },
  { id: 'view.evidence.N', labelKey: 'evidence.N', routes: ['visible', 'contextual', 'palette'], requiresResult: true },
  { id: 'view.evidence.V', labelKey: 'evidence.V', routes: ['visible', 'contextual', 'palette'], requiresResult: true },
  { id: 'view.evidence.M', labelKey: 'evidence.M', routes: ['visible', 'contextual', 'palette'], requiresResult: true },
  { id: 'view.evidence.deformed', labelKey: 'evidence.deformed', routes: ['visible', 'contextual', 'palette'], requiresResult: true },
  { id: 'surface.view.toggle', labelKey: 'surface.view', routes: ['visible', 'palette'] },
  { id: 'surface.detail.toggle', labelKey: 'surface.detail', routes: ['visible', 'contextual'] },
  { id: 'surface.dense.toggle', labelKey: 'surface.dense', routes: ['visible', 'palette'] },
  { id: 'surface.doctor.toggle', labelKey: 'surface.doctor', routes: ['visible', 'palette'] },
  { id: 'surface.palette.toggle', labelKey: 'command.palette', routes: ['visible', 'shortcut'], shortcut: 'Ctrl/⌘+K' },
  { id: 'surface.preferences.toggle', labelKey: 'surface.preferences', routes: ['visible', 'palette'] },
  { id: 'surface.output.toggle', labelKey: 'surface.output', routes: ['visible', 'palette'] },
  { id: 'surface.recovery.toggle', labelKey: 'surface.recovery', routes: ['visible', 'palette'] },
  { id: 'surface.analysisSetup.toggle', labelKey: 'surface.analysisSetup', routes: ['visible', 'palette'] },
  { id: 'draft.commit', labelKey: 'command.commit', routes: ['visible', 'shortcut'], shortcut: 'Enter' },
  { id: 'draft.cancel', labelKey: 'command.cancel', routes: ['visible', 'shortcut'], shortcut: 'Esc' },
  { id: 'workspace.back', labelKey: 'command.back', routes: ['visible'] },
  { id: 'history.undo', labelKey: 'command.undo', routes: ['visible', 'shortcut', 'palette'], shortcut: 'Ctrl/⌘+Z' },
  { id: 'history.redo', labelKey: 'command.redo', routes: ['visible', 'shortcut', 'palette'], shortcut: 'Ctrl/⌘+Shift+Z' },
  { id: 'mode.toggle', labelKey: 'command.modeToggle', routes: ['visible', 'palette'] },
  { id: 'theme.toggle', labelKey: 'command.themeToggle', routes: ['visible', 'palette'] },
  { id: 'locale.toggle', labelKey: 'command.localeToggle', routes: ['visible', 'palette'] },
  { id: 'tool.select', labelKey: 'toolrail.select', routes: ['visible', 'palette'] },
  { id: 'tool.node', labelKey: 'toolrail.node', routes: ['visible', 'palette'] },
  { id: 'tool.member', labelKey: 'toolrail.member', routes: ['visible', 'palette'] },
  { id: 'tool.support', labelKey: 'toolrail.support', routes: ['visible', 'palette'], requiresSelection: false },
  { id: 'tool.load', labelKey: 'toolrail.load', routes: ['visible', 'palette'] },
  { id: 'canvas.zoomIn', labelKey: 'command.zoomIn', routes: ['visible', 'palette'] },
  { id: 'canvas.zoomOut', labelKey: 'command.zoomOut', routes: ['visible', 'palette'] },
  { id: 'canvas.resetView', labelKey: 'command.resetView', routes: ['visible', 'palette'] },
];

export const commandById = (id: CommandId): CommandSpec =>
  COMMANDS.find((command) => command.id === id) ?? COMMANDS[0];

export interface CommandContext {
  hasSelection: boolean;
  hasMemberSelection: boolean;
  hasLiveResult: boolean;
}

export const isCommandAvailable = (command: CommandSpec, context: CommandContext): boolean => {
  if (command.requiresSelection && !context.hasSelection) return false;
  if (command.requiresMemberSelection && !context.hasMemberSelection) return false;
  if (command.requiresResult && !context.hasLiveResult) return false;
  return true;
};

/**
 * Contrato de paridad, comprobable: ninguna capacidad puede alcanzarse sólo por
 * la paleta o sólo por un atajo.
 */
export const commandsViolatingParity = (): CommandSpec[] =>
  COMMANDS.filter((command) => {
    const reachable = command.routes.filter((route) => route !== 'palette' && route !== 'shortcut');
    return reachable.length === 0;
  });
