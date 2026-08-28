import { esWorkspace } from './catalogs/es-workspace';
import { esAnalysis } from './catalogs/es-analysis';
import { esModeling } from './catalogs/es-modeling';
import { esResults } from './catalogs/es-results';
import { esInterchange } from './catalogs/es-interchange';
import { enWorkspace } from './catalogs/en-workspace';
import { enAnalysis } from './catalogs/en-analysis';
import { enModeling } from './catalogs/en-modeling';
import { enResults } from './catalogs/en-results';
import { enInterchange } from './catalogs/en-interchange';

export const es = {
  ...esWorkspace,
  ...esAnalysis,
  ...esModeling,
  ...esResults,
  ...esInterchange,
  // Adiciones locales conservadas durante la extracción modular.
  'canvas.keyboardEditAlternative': 'Con un objeto seleccionado, pulsa F2 para editarlo con campos numéricos en lugar de arrastrarlo',
  'canvas.structuralEditConnectedHelp': 'Los campos numéricos son una alternativa al arrastre; los miembros incidentes permanecen conectados y acompañan a sus nodos.',
  'canvas.structuralEditDescription': 'Vista previa local · campos numéricos, una confirmación y un deshacer',
  'generator.support.detail.fixed': 'Restringe Ux, Uy y Rz en cada nudo de apoyo candidato.',
  'generator.support.detail.none': 'No restringe GDL. Completa los apoyos antes de analizar.',
  'generator.support.detail.pin': 'Restringe Ux y Uy en cada nudo de apoyo candidato.',
  'generator.support.detail.roller': 'Restringe el desplazamiento normal (Uy con ángulo de 90°) en cada nudo de apoyo candidato.',
  'generator.support.hint': 'Opcional y explícito: el generador no inventa apoyos. El preset se aplica exactamente a los nudos de apoyo de esta familia.',
  'generator.support.label': 'Preset de apoyo',
  'inspector.loadCaseCategoryAccidental': 'Accidental',
  'inspector.loadCaseCategoryOther': 'Otro',
  'inspector.loadCaseCategoryPermanent': 'Permanente',
  'inspector.loadCaseCategoryVariable': 'Variable',
  'palette.activeCommand': 'Comando activo: {label}.',
  'palette.resultCount': '{count} comandos disponibles.',
  'palette.reviewBody': 'Esta acción puede abrir el diálogo del sistema o descargar un archivo. Revísala antes de continuar.',
  'palette.reviewCancel': 'Volver a la paleta',
  'palette.reviewConfirm': 'Continuar',
  'palette.reviewTitle': 'Revisar acción',
  'results.compactForTarget': 'Caso actual: {target}',
  'results.compactGoverning': '{symbol} gobernante {value} {unit} · {member}',
  'results.compactNoGoverning': 'Revisa el resumen completo',
  'results.compactResolvedDetail': 'Resuelto · {target} · actualizado · {reliability}',
  'results.compactUnresolved': 'La corrida necesita corrección',
  'results.compactWaiting': 'Aún no hay resultados calculados',
  'results.criticalEnd': 'Extremo',
  'results.criticalJump': 'Salto',
  'results.criticalMaximum': 'Máximo',
  'results.criticalMinimum': 'Mínimo',
  'results.criticalPoints': 'Puntos notables',
  'results.criticalZero': 'Cruce por cero',
  'results.pinCriticalPoint': 'Fijar lectura en {point}',
  'results.unpinCriticalPoint': 'Quitar lectura fijada de {point}',
  'space3d.bridgeCompleteNow': 'Completar ahora',
  'space3d.bridgeNextRequirement': 'Siguiente requisito para analizar: {requirement}',
} as const;

export type TranslationKey = keyof typeof es;
export type Language = 'es' | 'en';
export type Catalog = Record<TranslationKey, string>;

export const en: Catalog = {
  ...enWorkspace,
  ...enAnalysis,
  ...enModeling,
  ...enResults,
  ...enInterchange,
  // Local additions retained during the modular extraction.
  'canvas.keyboardEditAlternative': 'With an object selected, press F2 to edit it with numeric fields instead of dragging it',
  'canvas.structuralEditConnectedHelp': 'Numeric fields are an alternative to dragging; incident members remain connected and follow their nodes.',
  'canvas.structuralEditDescription': 'Local preview · numeric fields, one confirmation, one undo',
  'generator.support.detail.fixed': 'Restrains Ux, Uy, and Rz at every candidate support node.',
  'generator.support.detail.none': 'It restrains no degrees of freedom. Complete supports before analysis.',
  'generator.support.detail.pin': 'Restrains Ux and Uy at every candidate support node.',
  'generator.support.detail.roller': 'Restrains normal displacement (Uy at a 90° angle) at every candidate support node.',
  'generator.support.hint': 'Optional and explicit: the generator does not invent supports. The preset applies exactly to this family’s support nodes.',
  'generator.support.label': 'Support preset',
  'inspector.loadCaseCategoryAccidental': 'Accidental',
  'inspector.loadCaseCategoryOther': 'Other',
  'inspector.loadCaseCategoryPermanent': 'Permanent',
  'inspector.loadCaseCategoryVariable': 'Variable',
  'palette.activeCommand': 'Active command: {label}.',
  'palette.resultCount': '{count} commands available.',
  'palette.reviewBody': 'This action may open a system dialog or download a file. Review it before continuing.',
  'palette.reviewCancel': 'Return to command palette',
  'palette.reviewConfirm': 'Continue',
  'palette.reviewTitle': 'Review action',
  'results.compactForTarget': 'Current case: {target}',
  'results.compactGoverning': 'Governing {symbol} {value} {unit} · {member}',
  'results.compactNoGoverning': 'Review the complete summary',
  'results.compactResolvedDetail': 'Solved · {target} · up to date · {reliability}',
  'results.compactUnresolved': 'The run needs correction',
  'results.compactWaiting': 'There are no calculated results yet',
  'results.criticalEnd': 'Endpoint',
  'results.criticalJump': 'Jump',
  'results.criticalMaximum': 'Maximum',
  'results.criticalMinimum': 'Minimum',
  'results.criticalPoints': 'Notable points',
  'results.criticalZero': 'Zero crossing',
  'results.pinCriticalPoint': 'Pin reading at {point}',
  'results.unpinCriticalPoint': 'Unpin reading at {point}',
  'space3d.bridgeCompleteNow': 'Complete now',
  'space3d.bridgeNextRequirement': 'Next requirement to analyse: {requirement}',
};

export const catalogs: Record<Language, Catalog> = { es, en };

export const translate = (
  language: Language,
  key: TranslationKey,
  variables?: Record<string, string | number>,
): string => {
  const template = catalogs[language][key] ?? es[key];
  if (!variables) return template;
  return template.replace(/\{([A-Za-z0-9_]+)\}/g, (match, name: string) =>
    Object.hasOwn(variables, name) ? String(variables[name]) : match);
};
