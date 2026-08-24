import { BookOpenCheck, CircleSlash, TriangleAlert } from 'lucide-react';
import { useMemo } from 'react';
import { summarizeNtcSteelTensionDesign, type NtcSteelDesignBlocker } from '../../design/ntcSteel2023';
import { toDisplay, unitLabel } from '../../engine/units';
import { useI18n } from '../../i18n/useI18n';
import { useProject } from '../../store/ProjectContext';
import { formatFixed } from '../../utils/numberFormat';
import './ntcSteelDesignCard.css';

const copy = {
  es: {
    title: 'Diseño normativo separado',
    eyebrow: 'DesignResult · separado de AnalysisResult',
    inconclusive: 'No concluyente',
    unavailable: 'Diseño no disponible',
    unavailableGeneric: 'Ningún miembro entra en el alcance inicial: truss + A992 + perfil I AISC con identidad explícita.',
    unavailableCombination: 'Selecciona y analiza una combinación última NTC CDMX 2023 con procedencia completa.',
    unavailableReliability: 'El análisis debe tener calidad numérica confiable antes de alimentar el módulo de diseño.',
    unavailableIdentity: 'Asigna identidades de catálogo compatibles; no se reconoce material o sección por sus números.',
    unavailableFamily: 'El primer slice sólo evalúa barras truss con A992 y perfiles I AISC.',
    unavailableDrift: 'Las propiedades numéricas ya no coinciden con la sección identificada; revisa el miembro.',
    unavailableDemand: 'El primer slice exige una demanda de tensión axial pura y positiva.',
    within: 'Dentro de este componente',
    outside: 'Fuera de este componente',
    ratio: 'Ratio del componente',
    demand: 'Demanda',
    resistance: 'Resistencia del componente',
    subject: 'Miembro e identidades',
    coverage: 'Cobertura inicial',
    coverageValue: (evaluated: number, total: number) => `${evaluated}/${total} evaluables`,
    trace: 'Ecuación y sustitución',
    missing: 'Checks ausentes',
    fracture: 'Fractura de la sección neta no evaluada.',
    connection: 'Conexión, agujeros y excentricidad no evaluados.',
    conclusion: 'El estado del componente no concluye el diseño del miembro ni del proyecto.',
    source: 'Fuente oficial · página PDF 325 · página impresa 84',
  },
  en: {
    title: 'Separate code design',
    eyebrow: 'DesignResult · separate from AnalysisResult',
    inconclusive: 'Inconclusive',
    unavailable: 'Design unavailable',
    unavailableGeneric: 'No member enters the initial scope: truss + A992 + explicitly identified AISC I shape.',
    unavailableCombination: 'Select and analyze a fully traceable NTC CDMX 2023 ultimate combination.',
    unavailableReliability: 'The analysis must have reliable numerical quality before it can feed code design.',
    unavailableIdentity: 'Assign compatible catalog identities; material and section are never recognized from numbers.',
    unavailableFamily: 'The first slice only evaluates truss members with A992 and AISC I shapes.',
    unavailableDrift: 'Numeric properties no longer match the identified section; review the member.',
    unavailableDemand: 'The first slice requires a pure, positive axial-tension demand.',
    within: 'Within this component',
    outside: 'Outside this component',
    ratio: 'Component ratio',
    demand: 'Demand',
    resistance: 'Component resistance',
    subject: 'Member and identities',
    coverage: 'Initial coverage',
    coverageValue: (evaluated: number, total: number) => `${evaluated}/${total} evaluable`,
    trace: 'Equation and substitution',
    missing: 'Missing checks',
    fracture: 'Net-section fracture was not evaluated.',
    connection: 'Connection, holes, and eccentricity were not evaluated.',
    conclusion: 'The component state does not conclude the design of the member or project.',
    source: 'Official source · PDF page 325 · printed page 84',
  },
} as const;

const blockerCopy = (blocker: NtcSteelDesignBlocker | undefined, language: 'es' | 'en'): string => {
  const text = copy[language];
  if (blocker === 'ntc-ultimate-combination-required') return text.unavailableCombination;
  if (blocker === 'reliable-analysis-required') return text.unavailableReliability;
  if (blocker === 'explicit-catalog-identity-required') return text.unavailableIdentity;
  if (blocker === 'unsupported-member-family' || blocker === 'unsupported-material-section-family') return text.unavailableFamily;
  if (blocker === 'catalog-properties-drifted') return text.unavailableDrift;
  if (blocker === 'pure-axial-demand-required' || blocker === 'positive-tension-required') return text.unavailableDemand;
  return text.unavailableGeneric;
};

export const NtcSteelDesignCard = () => {
  const { project, analysis, selectedCombinationId } = useProject();
  const { language } = useI18n();
  const text = copy[language];
  const summary = useMemo(() => summarizeNtcSteelTensionDesign({
    project,
    analysis,
    combinationId: selectedCombinationId,
  }), [analysis, project, selectedCombinationId]);

  if (summary.status === 'unavailable') {
    return <section
      className="ntc-design-card"
      data-testid="ntc-steel-design-card"
      data-result-kind="design"
      data-status="unavailable"
      aria-label={text.title}
    >
      <header className="ntc-design-card__header">
        <div><CircleSlash size={17} aria-hidden="true" /><span><small>{text.eyebrow}</small><strong>{text.title}</strong></span></div>
        <b>{text.inconclusive}</b>
      </header>
      <div className="ntc-design-card__unavailable">
        <strong>{text.unavailable}</strong>
        <p>{blockerCopy(summary.skipped[0]?.blockers[0], language)}</p>
      </div>
      <small className="ntc-design-card__limit">{text.conclusion}</small>
    </section>;
  }

  const result = summary.highest;
  const units = project.settings.units;
  const demand = formatFixed(toDisplay(result.demand.value, units, 'force'), 2, 'inspector');
  const resistance = formatFixed(toDisplay(result.resistance.value, units, 'force'), 2, 'inspector');
  const forceUnit = unitLabel(units, 'force');
  const componentLabel = result.componentStatus === 'within-component' ? text.within : text.outside;
  const total = summary.results.length + summary.skipped.length;

  return <section
    className="ntc-design-card"
    data-testid="ntc-steel-design-card"
    data-result-kind="design"
    data-status={result.status}
    data-component-status={result.componentStatus}
    aria-label={text.title}
  >
    <header className="ntc-design-card__header">
      <div><BookOpenCheck size={17} aria-hidden="true" /><span><small>{text.eyebrow}</small><strong>{text.title}</strong></span></div>
      <b>{text.inconclusive}</b>
    </header>

    <div className="ntc-design-card__standard">
      <span>NTC Acero CDMX 2023 · §5.3.1.a</span>
      <span data-component-status={result.componentStatus}>{componentLabel}</span>
    </div>

    <p className="ntc-design-card__ratio">{text.ratio} <strong>{formatFixed(result.ratio.value, 2, 'inspector')}</strong></p>

    <dl className="ntc-design-card__values">
      <div><dt>{text.demand}</dt><dd>Pu = {demand} {forceUnit}</dd></div>
      <div><dt>{text.resistance}</dt><dd>Rt,y = {resistance} {forceUnit}</dd></div>
      <div><dt>{text.subject}</dt><dd>{result.subject.memberId}<small>{result.subject.materialId} · {result.subject.sectionId}</small></dd></div>
      <div><dt>{text.coverage}</dt><dd>{text.coverageValue(summary.results.length, total)}</dd></div>
    </dl>

    <details className="ntc-design-card__trace">
      <summary>{text.trace}</summary>
      <code>{result.check.equation}</code>
      <p>FR = 0.90 · Fy = {formatFixed(result.substitutions[2].value, 0, 'inspector')} kN/m² · A = {formatFixed(result.substitutions[3].value, 6, 'inspector')} m²</p>
      <a href={result.standard.sourceUrl} target="_blank" rel="noreferrer">{text.source}</a>
    </details>

    <div className="ntc-design-card__missing" role="note">
      <TriangleAlert size={16} aria-hidden="true" />
      <div><strong>{text.missing}</strong><ul><li>{text.fracture}</li><li>{text.connection}</li></ul></div>
    </div>
    <small className="ntc-design-card__limit">{text.conclusion}</small>
  </section>;
};
