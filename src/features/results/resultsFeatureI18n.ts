import { useCallback } from 'react';
import { useI18n } from '../../i18n/useI18n';

/**
 * Copy used only by the result surfaces introduced in the review loop. It is
 * kept beside those lazy surfaces so Spanish does not make the first paint
 * download labels that are not visible until results are opened.
 */
const resultsFeatureCopy = {
  'results.scenarioNavigator': { es: 'Navegador de escenarios', en: 'Scenario navigator' },
  'results.scenarioNavigatorEyebrow': { es: 'Cobertura de análisis', en: 'Analysis coverage' },
  'results.scenarioNavigatorHint': { es: 'Compara cada caso sin perder los que no pudieron resolverse.', en: 'Compare every case without losing the ones that could not be solved.' },
  'results.scenarioFilters': { es: 'Filtro de escenarios', en: 'Scenario filter' },
  'results.scenarioFilterAll': { es: 'Todos', en: 'All' },
  'results.scenarioFilterUsable': { es: 'Utilizables', en: 'Usable' },
  'results.scenarioFilterFailed': { es: 'Fallidos', en: 'Failed' },
  'results.scenarioFilterEmpty': { es: 'No hay escenarios en este filtro.', en: 'No scenarios match this filter.' },
  'results.scenarioCurrent': { es: 'Activo', en: 'Active' },
  'results.scenarioKindCase': { es: 'Caso', en: 'Case' },
  'results.scenarioKindCombination': { es: 'Combinación', en: 'Combination' },
  'results.scenarioStatusReliable': { es: 'Confiable', en: 'Reliable' },
  'results.scenarioStatusLimited': { es: 'Limitado', en: 'Limited' },
  'results.scenarioStatusUnreliable': { es: 'No confiable', en: 'Unreliable' },
  'results.scenarioStatusFailed': { es: 'Fallido', en: 'Failed' },
  'results.scenarioValues': { es: 'Extremos N, V y M', en: 'N, V, and M extremes' },
  'results.scenarioUse': { es: 'Usar', en: 'Use' },
  'results.scenarioUseCombination': { es: 'Usar combinación {name}', en: 'Use combination {name}' },
  'results.sensitivityEyebrow': { es: 'Estudio aislado', en: 'Isolated study' },
  'results.sensitivityTitle': { es: 'Explorador de sensibilidad', en: 'Sensitivity explorer' },
  'results.sensitivityHint': { es: 'Cambia E, A o I en copias efímeras para ver qué respuesta domina.', en: 'Change E, A, or I in ephemeral copies to see which response governs.' },
  'results.sensitivityRun': { es: 'Calcular sensibilidad', en: 'Calculate sensitivity' },
  'results.sensitivityRunning': { es: 'Calculando…', en: 'Calculating…' },
  'results.sensitivityMember': { es: 'Miembro', en: 'Member' },
  'results.sensitivityParameter': { es: 'Propiedad', en: 'Property' },
  'results.sensitivityParameterE': { es: 'E · módulo elástico', en: 'E · elastic modulus' },
  'results.sensitivityParameterA': { es: 'A · área', en: 'A · area' },
  'results.sensitivityParameterI': { es: 'I · inercia', en: 'I · inertia' },
  'results.sensitivityBaseline': { es: 'Base', en: 'Baseline' },
  'results.sensitivityUnavailable': { es: 'No disponible', en: 'Unavailable' },
  'results.sensitivityVariantFailed': { es: 'Esta variación no produjo un resultado utilizable.', en: 'This variation did not produce a usable result.' },
  'results.sensitivityFailed': { es: 'No se pudo completar el estudio de sensibilidad.', en: 'The sensitivity study could not be completed.' },
  'results.sensitivityMetricAxial': { es: 'Máx. axial N', en: 'Max axial N' },
  'results.sensitivityMetricShear': { es: 'Máx. cortante V', en: 'Max shear V' },
  'results.sensitivityMetricMoment': { es: 'Máx. momento M', en: 'Max moment M' },
  'results.sensitivityMetricDeflection': { es: 'Máx. desplazamiento v', en: 'Max displacement v' },
  'results.sensitivityNoMutation': { es: 'No cambia el modelo: sólo se analizan copias temporales.', en: 'The model does not change: only temporary copies are analysed.' },
  'results.sensitivityLimit': { es: 'Lectura comparativa; no es una verificación de seguridad ni de norma.', en: 'Comparative reading; not a safety or code-compliance check.' },
  'results.reviewEyebrow': { es: 'Preparación de revisión', en: 'Review readiness' },
  'results.reviewTitle': { es: 'Tablero de evidencia', en: 'Evidence board' },
  'results.reviewHint': { es: 'Comprueba que el modelo, el análisis y su trazabilidad estén listos para compartir.', en: 'Check that the model, analysis, and traceability are ready to share.' },
  'results.reviewReadyCount': { es: '{ready} de {total} comprobaciones listas', en: '{ready} of {total} checks ready' },
  'results.reviewDisclaimer': { es: 'Esto organiza evidencia de trabajo; no es una certificación de seguridad ni de cumplimiento normativo.', en: 'This organizes working evidence; it is not a safety or code-compliance certification.' },
  'results.reviewStatusReady': { es: 'Listo', en: 'Ready' },
  'results.reviewStatusAttention': { es: 'Atención', en: 'Attention' },
  'results.reviewStatusBlocked': { es: 'Bloqueado', en: 'Blocked' },
  'results.reviewStatusPending': { es: 'Pendiente', en: 'Pending' },
  'results.reviewStatusRunning': { es: 'En curso', en: 'Running' },
  'results.reviewModel': { es: 'Modelo', en: 'Model' },
  'results.reviewAnalysis': { es: 'Análisis', en: 'Analysis' },
  'results.reviewCoverage': { es: 'Cobertura', en: 'Coverage' },
  'results.reviewCertificate': { es: 'Certificado numérico', en: 'Numeric certificate' },
  'results.reviewModelReady': { es: 'Sin hallazgos que bloqueen la corrida.', en: 'No findings block the run.' },
  'results.reviewModelAttention': { es: 'Hay hallazgos que conviene resolver antes de compartir.', en: 'Some findings should be resolved before sharing.' },
  'results.reviewModelBlocked': { es: 'Hay hallazgos críticos que impiden confiar en la corrida.', en: 'Critical findings prevent confidence in the run.' },
  'results.reviewModelPending': { es: 'Todavía no hay diagnóstico del modelo.', en: 'The model has not been diagnosed yet.' },
  'results.reviewAnalysisReady': { es: 'La solución tiene una fiabilidad numérica utilizable.', en: 'The solution has usable numerical reliability.' },
  'results.reviewAnalysisAttention': { es: 'La solución existe, pero su fiabilidad numérica es limitada.', en: 'The solution exists, but numerical reliability is limited.' },
  'results.reviewAnalysisBlocked': { es: 'La solución falló o no es numéricamente confiable.', en: 'The solution failed or is numerically unreliable.' },
  'results.reviewAnalysisPending': { es: 'Ejecuta el análisis para generar resultados.', en: 'Run the analysis to create results.' },
  'results.reviewCoverageReady': { es: 'Todos los casos y combinaciones comparados son utilizables.', en: 'All compared cases and combinations are usable.' },
  'results.reviewCoverageAttention': { es: 'Hay escenarios fallidos, no confiables o aún no cubiertos.', en: 'Some scenarios failed, are unreliable, or remain uncovered.' },
  'results.reviewCoverageBlocked': { es: 'La cobertura no puede respaldar una revisión todavía.', en: 'Coverage cannot support a review yet.' },
  'results.reviewCoveragePending': { es: 'Compara casos y combinaciones para completar la cobertura.', en: 'Compare cases and combinations to complete coverage.' },
  'results.reviewCertificateReady': { es: 'Las comprobaciones numéricas independientes se cumplen.', en: 'The independent numerical checks hold.' },
  'results.reviewCertificateAttention': { es: 'La comprobación numérica tiene observaciones o no es verificable.', en: 'The numerical check has observations or is not verifiable.' },
  'results.reviewCertificateBlocked': { es: 'La comprobación numérica no respalda el resultado.', en: 'The numerical check does not support the result.' },
  'results.reviewCertificatePending': { es: 'Ejecuta el certificado numérico para añadir esta evidencia.', en: 'Run the numeric certificate to add this evidence.' },
  'results.reviewOpenDoctor': { es: 'Abrir Model Doctor', en: 'Open Model Doctor' },
  'results.reviewCompare': { es: 'Comparar escenarios', en: 'Compare scenarios' },
  'results.reviewRun': { es: 'Actualizar revisión', en: 'Update review' },
  'results.reviewRunning': { es: 'Actualizando revisión…', en: 'Updating review…' },
  'results.reviewComplete': { es: 'Revisión actualizada. Verifica los estados antes de compartir.', en: 'Review updated. Check the statuses before sharing.' },
  'results.reviewFailed': { es: 'La revisión requiere atención; revisa los pasos marcados.', en: 'The review needs attention; check the marked steps.' },
  'results.reviewRunHint': { es: 'Un pase actualiza análisis, cobertura y certificado.', en: 'One pass updates analysis, coverage, and certificate.' },
  'results.reviewRunSteps': { es: 'Pasos del pase de revisión', en: 'Review pass steps' },
} as const;

export type ResultsFeatureTranslationKey = keyof typeof resultsFeatureCopy;
export type ResultsFeatureTranslate = (key: ResultsFeatureTranslationKey, variables?: Record<string, string | number>) => string;

const translateFeature = (language: 'es' | 'en', key: ResultsFeatureTranslationKey, variables?: Record<string, string | number>): string => {
  const template = resultsFeatureCopy[key][language] ?? resultsFeatureCopy[key].es;
  if (!variables) return template;
  return template.replace(/\{([A-Za-z0-9_]+)\}/g, (match, name: string) => (
    Object.hasOwn(variables, name) ? String(variables[name]) : match));
};

export const useResultsFeatureI18n = (): { language: 'es' | 'en'; t: ResultsFeatureTranslate } => {
  const { language } = useI18n();
  const t = useCallback<ResultsFeatureTranslate>((key, variables) => translateFeature(language, key, variables), [language]);
  return { language, t };
};
