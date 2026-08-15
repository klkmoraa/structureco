/**
 * CommandRegistry · fuente única de comandos.
 *
 * La regla que este módulo hace cumplir es la de CRI-9 D-09 y CRI-10 §11: el
 * MISMO `commandId` se invoca desde el botón visible, desde las acciones
 * contextuales, desde el atajo de teclado y —en Fase B— desde la paleta. No
 * puede haber tres implementaciones del mismo comando, y ninguna capacidad
 * puede vivir sólo en un desbordamiento o sólo en la paleta.
 *
 * `routes` es esa comprobación hecha dato: si un comando declarase una sola
 * ruta y ésa fuese `palette`, incumpliría el contrato de paridad. Fase B lo
 * convertirá en una prueba; Fase A lo deja verificable a simple vista.
 */

import type { TranslationKey } from './i18n';

export type CommandId =
  | 'project.continue'
  | 'project.new'
  | 'project.import'
  | 'selection.clear'
  | 'member.changeSection'
  | 'member.locate'
  | 'analysis.solve'
  | 'view.evidence.none'
  | 'view.evidence.N'
  | 'view.evidence.V'
  | 'view.evidence.M'
  | 'view.evidence.deformed'
  | 'surface.view.toggle'
  | 'surface.detail.toggle'
  | 'surface.dense.toggle'
  | 'draft.commit'
  | 'draft.cancel'
  | 'workspace.back';

export type CommandRoute = 'visible' | 'contextual' | 'shortcut' | 'palette' | 'row';

export interface CommandSpec {
  id: CommandId;
  labelKey: TranslationKey;
  /** Rutas por las que se puede invocar. Nunca `['palette']` a secas. */
  routes: CommandRoute[];
  /** Atajo declarado. Se audita contra el navegador antes de asignarlo. */
  shortcut?: string;
  /** Requiere selección de miembro. */
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
    id: 'member.changeSection',
    labelKey: 'command.changeSection',
    routes: ['visible', 'contextual', 'palette'],
    requiresMemberSelection: true,
  },
  {
    id: 'member.locate',
    labelKey: 'command.locate',
    routes: ['visible', 'contextual', 'row'],
    requiresMemberSelection: true,
  },
  { id: 'analysis.solve', labelKey: 'command.solve', routes: ['visible', 'shortcut', 'palette'] },
  { id: 'view.evidence.none', labelKey: 'evidence.none', routes: ['visible', 'contextual'] },
  { id: 'view.evidence.N', labelKey: 'evidence.N', routes: ['visible', 'contextual'], requiresResult: true },
  { id: 'view.evidence.V', labelKey: 'evidence.V', routes: ['visible', 'contextual'], requiresResult: true },
  { id: 'view.evidence.M', labelKey: 'evidence.M', routes: ['visible', 'contextual'], requiresResult: true },
  { id: 'view.evidence.deformed', labelKey: 'evidence.deformed', routes: ['visible', 'contextual'], requiresResult: true },
  { id: 'surface.view.toggle', labelKey: 'surface.view', routes: ['visible', 'palette'] },
  { id: 'surface.detail.toggle', labelKey: 'surface.detail', routes: ['visible', 'contextual'] },
  { id: 'surface.dense.toggle', labelKey: 'surface.dense', routes: ['visible', 'palette'] },
  { id: 'draft.commit', labelKey: 'command.commit', routes: ['visible', 'shortcut'], shortcut: 'Enter' },
  { id: 'draft.cancel', labelKey: 'command.cancel', routes: ['visible', 'shortcut'], shortcut: 'Esc' },
  { id: 'workspace.back', labelKey: 'command.back', routes: ['visible'] },
];

export const commandById = (id: CommandId): CommandSpec =>
  COMMANDS.find((command) => command.id === id) ?? COMMANDS[0];

export interface CommandContext {
  hasMemberSelection: boolean;
  hasLiveResult: boolean;
}

export const isCommandAvailable = (command: CommandSpec, context: CommandContext): boolean => {
  if (command.requiresMemberSelection && !context.hasMemberSelection) return false;
  if (command.requiresResult && !context.hasLiveResult) return false;
  return true;
};

/**
 * Contrato de paridad, comprobable: ninguna capacidad puede alcanzarse sólo por
 * la paleta o sólo por un atajo. Fase B lo ejecuta como prueba.
 */
export const commandsViolatingParity = (): CommandSpec[] =>
  COMMANDS.filter((command) => {
    const reachable = command.routes.filter((route) => route !== 'palette' && route !== 'shortcut');
    return reachable.length === 0;
  });
