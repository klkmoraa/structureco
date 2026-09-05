import {
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  CircleSlash,
  Crosshair,
  Layers,
  ShieldCheck,
  Sparkles,
  XCircle,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { findStandardSection, type StandardSection } from '../../data/standardSections';
import { recommendAiscSections } from '../../design/aiscOptimizer';
import { evaluateAiscSteel360Project } from '../../design/aiscSteel360';
import type { AiscCheckDetail, AiscCheckKind, AiscCheckStatus } from '../../design/aiscSteel360Types';
import { toDisplay, unitLabel } from '../../engine/units';
import { useI18n } from '../../i18n/useI18n';
import { useProject } from '../../store/ProjectContext';
import { formatFixed } from '../../utils/numberFormat';
import { AiscCrossSectionDiagram } from './AiscCrossSectionDiagram';
import './aiscSteelDesignCard.css';

type ActiveTab = 'overview' | 'limits' | 'sheet' | 'sizer';

const copy = {
  es: {
    title: 'Diseño de acero estructural',
    eyebrow: 'ANSI/AISC 360-16 / 360-22 · LRFD',
    statusPass: 'Aprobado (LRFD)',
    statusWarning: 'Atención (>90%)',
    statusFail: 'No satisface',
    statusUnavailable: 'No disponible',
    tabOverview: 'Visión General',
    tabLimits: 'Estados Límite',
    tabSheet: 'Memoria de Cálculo',
    tabSizer: 'Optimizador (Smart Sizer)',
    evaluated: 'Evaluados',
    passing: 'Pasa',
    warning: 'Alerta',
    failing: 'Falla',
    selectMember: 'Miembro:',
    criticalBadge: '(Crítico)',
    focusCanvas: 'Enfocar en canvas',
    governingTitle: 'Estado límite gobernante',
    governingRatio: 'Ratio gobernante de demanda / capacidad',
    slenderness: 'Esbeltez KL/r',
    safeZone: 'Seguro (≤ 0.90)',
    warningZone: 'Atención (0.90–1.00)',
    failZone: 'Excedido (> 1.00)',
    suggestedOptimal: 'Sección óptima sugerida:',
    weightSavings: 'ahorro de peso',
    weightIncrease: 'aumento de peso',
    adopt: 'Adoptar',
    currentSection: 'Sección actual',
    tableSection: 'Perfil',
    tableWeight: 'Peso (kN/m)',
    tableRatio: 'Ratio η',
    tableStatus: 'Estado',
    tableDelta: 'Var. Peso',
    tableAction: 'Acción',
    disclaimer: 'Verificación según ANSI/AISC 360 LRFD para perfiles I laminados en caliente. No contempla conexiones ni efectos torsionales fuera del plano.',
    unavailableMsg: 'Se requiere un análisis confiable con miembros de acero y secciones I de catálogo AISC.',
    kinds: {
      tension: 'Tensión (Cap. D)',
      compression: 'Compresión (Cap. E)',
      flexure: 'Flexión (Cap. F)',
      shear: 'Cortante (Cap. G)',
      interaction: 'Interacción (Cap. H)',
    },
  },
  en: {
    title: 'Structural steel design',
    eyebrow: 'ANSI/AISC 360-16 / 360-22 · LRFD',
    statusPass: 'Pass (LRFD)',
    statusWarning: 'Warning (>90%)',
    statusFail: 'Exceeds capacity',
    statusUnavailable: 'Unavailable',
    tabOverview: 'Overview',
    tabLimits: 'Limit States',
    tabSheet: 'Calculation Sheet',
    tabSizer: 'Section Sizer',
    evaluated: 'Evaluated',
    passing: 'Passing',
    warning: 'Warning',
    failing: 'Failing',
    selectMember: 'Member:',
    criticalBadge: '(Critical)',
    focusCanvas: 'Focus canvas',
    governingTitle: 'Governing limit state',
    governingRatio: 'Governing demand / capacity ratio',
    slenderness: 'Slenderness KL/r',
    safeZone: 'Safe (≤ 0.90)',
    warningZone: 'Warning (0.90–1.00)',
    failZone: 'Overstressed (> 1.00)',
    suggestedOptimal: 'Suggested optimal section:',
    weightSavings: 'weight savings',
    weightIncrease: 'weight increase',
    adopt: 'Adopt',
    currentSection: 'Current section',
    tableSection: 'Section',
    tableWeight: 'Weight (kN/m)',
    tableRatio: 'Ratio η',
    tableStatus: 'Status',
    tableDelta: 'Weight Δ',
    tableAction: 'Action',
    disclaimer: 'Design check in accordance with ANSI/AISC 360 LRFD for hot-rolled I-shapes. Does not cover connections or unmodeled out-of-plane effects.',
    unavailableMsg: 'A reliable analysis with structural steel members and catalog AISC I-shapes is required.',
    kinds: {
      tension: 'Tension (Ch. D)',
      compression: 'Compression (Ch. E)',
      flexure: 'Flexure (Ch. F)',
      shear: 'Shear (Ch. G)',
      interaction: 'Interaction (Ch. H)',
    },
  },
} as const;

export const AiscSteelDesignCard = () => {
  const { project, analysis, selectedCombinationId, selection, setSelection, updateProject } = useProject();
  const { language } = useI18n();
  const text = copy[language];
  const units = project.settings.units;

  const [activeTab, setActiveTab] = useState<ActiveTab>('overview');
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);

  const summary = useMemo(() => evaluateAiscSteel360Project(
    project,
    analysis,
    selectedCombinationId,
  ), [analysis, project, selectedCombinationId]);

  // Sync with canvas selection
  useEffect(() => {
    if (selection?.kind === 'member') {
      const memberId = selection.id;
      if (summary.resultsByMemberId[memberId]?.isEligible) {
        setSelectedMemberId(memberId);
      }
    }
  }, [selection, summary]);

  const activeMember = useMemo(() => {
    if (!summary.evaluatedMembers) return null;
    if (selectedMemberId && summary.resultsByMemberId[selectedMemberId]?.isEligible) {
      return summary.resultsByMemberId[selectedMemberId];
    }
    return summary.criticalMember;
  }, [summary, selectedMemberId]);

  const memberModel = useMemo(() => {
    if (!activeMember) return null;
    return project.members.find((m) => m.id === activeMember.memberId) ?? null;
  }, [project.members, activeMember]);

  const memberResult = useMemo(() => {
    if (!activeMember || !analysis?.memberResults) return null;
    return analysis.memberResults.find((r) => r.memberId === activeMember.memberId) ?? null;
  }, [analysis?.memberResults, activeMember]);

  const currentSection = useMemo(() => {
    if (!activeMember) return null;
    return findStandardSection(activeMember.sectionId) as StandardSection | undefined;
  }, [activeMember]);

  // Section optimizer recommendation
  const sizerResult = useMemo(() => {
    if (!memberModel || !memberResult) return null;
    return recommendAiscSections({ member: memberModel, memberResult, project });
  }, [memberModel, memberResult, project]);

  const globalStatus: AiscCheckStatus = useMemo(() => {
    if (!summary.evaluatedMembers) return 'indeterminate';
    if (summary.failingMembers > 0) return 'fail';
    if (summary.warningMembers > 0) return 'warning';
    return 'pass';
  }, [summary]);

  if (!summary.evaluatedMembers || !activeMember || !currentSection) {
    return (
      <section
        className="aisc-design-card"
        data-testid="aisc-steel-design-card"
        data-result-kind="design"
        data-status="unavailable"
        aria-label={text.title}
      >
        <header className="aisc-design-card__header">
          <div className="aisc-design-card__header-left">
            <CircleSlash size={18} aria-hidden="true" />
            <span>
              <small>{text.eyebrow}</small>
              <strong>{text.title}</strong>
            </span>
          </div>
          <span className="aisc-design-card__badge" data-status="unavailable">
            {text.statusUnavailable}
          </span>
        </header>
        <div className="aisc-design-card__unavailable">
          <p>{text.unavailableMsg}</p>
        </div>
        <small className="aisc-design-card__footer">{text.disclaimer}</small>
      </section>
    );
  }

  const badgeText = globalStatus === 'pass'
    ? text.statusPass
    : globalStatus === 'warning'
      ? text.statusWarning
      : text.statusFail;

  // Pointer position on 0.0 to 1.25 scale (1.00 is at 80%)
  const gaugePercent = Math.min(100, Math.max(0, (activeMember.maxRatio / 1.25) * 100));

  const formatCapacity = (check: AiscCheckDetail) => {
    if (check.kind === 'flexure') {
      const val = toDisplay(check.designCapacity, units, 'moment');
      return `${formatFixed(val, 2, 'inspector')} ${unitLabel(units, 'moment')}`;
    }
    if (check.kind === 'interaction') return '1.00';
    const val = toDisplay(check.designCapacity, units, 'force');
    return `${formatFixed(val, 2, 'inspector')} ${unitLabel(units, 'force')}`;
  };

  const formatDemand = (check: AiscCheckDetail) => {
    if (check.kind === 'flexure') {
      const val = toDisplay(check.demand, units, 'moment');
      return `${formatFixed(val, 2, 'inspector')} ${unitLabel(units, 'moment')}`;
    }
    if (check.kind === 'interaction') return formatFixed(check.demand, 3, 'inspector');
    const val = toDisplay(check.demand, units, 'force');
    return `${formatFixed(val, 2, 'inspector')} ${unitLabel(units, 'force')}`;
  };

  const activeChecks = Object.values(activeMember.checks).filter(
    (c): c is AiscCheckDetail => c !== undefined,
  );

  const handleAdoptSection = (sectionId: string) => {
    const targetSection = findStandardSection(sectionId);
    if (!targetSection) return;
    updateProject((prev) => ({
      ...prev,
      members: prev.members.map((m) =>
        m.id === activeMember.memberId
          ? {
              ...m,
              sectionId: targetSection.id,
              sectionOrigin: 'catalog' as const,
              A: targetSection.area,
              I: targetSection.inertiaX,
            }
          : m,
      ),
    }));
  };

  const handleFocusCanvas = () => {
    setSelection({ kind: 'member', id: activeMember.memberId });
  };

  return (
    <section
      className="aisc-design-card"
      data-testid="aisc-steel-design-card"
      data-result-kind="design"
      data-status={globalStatus}
      aria-label={text.title}
    >
      <header className="aisc-design-card__header">
        <div className="aisc-design-card__header-left">
          {globalStatus === 'pass' && <ShieldCheck size={18} aria-hidden="true" color="var(--sc-color-state-success, #168a6c)" />}
          {globalStatus === 'warning' && <AlertTriangle size={18} aria-hidden="true" color="var(--sc-color-state-warning, #d97706)" />}
          {globalStatus === 'fail' && <XCircle size={18} aria-hidden="true" color="var(--danger, #dc2626)" />}
          <span>
            <small>{text.eyebrow}</small>
            <strong>{text.title}</strong>
          </span>
        </div>
        <span className="aisc-design-card__badge" data-status={globalStatus}>
          {globalStatus === 'pass' && <CheckCircle2 size={13} aria-hidden="true" />}
          {globalStatus === 'warning' && <AlertTriangle size={13} aria-hidden="true" />}
          {globalStatus === 'fail' && <XCircle size={13} aria-hidden="true" />}
          {badgeText}
        </span>
      </header>

      {/* Tab Navigation */}
      <nav className="aisc-tabs" aria-label="AISC Navigation Tabs">
        <button
          type="button"
          className={`aisc-tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          <Layers size={14} aria-hidden="true" />
          {text.tabOverview}
        </button>
        <button
          type="button"
          className={`aisc-tab-btn ${activeTab === 'limits' ? 'active' : ''}`}
          onClick={() => setActiveTab('limits')}
        >
          <ShieldCheck size={14} aria-hidden="true" />
          {text.tabLimits}
        </button>
        <button
          type="button"
          className={`aisc-tab-btn ${activeTab === 'sheet' ? 'active' : ''}`}
          onClick={() => setActiveTab('sheet')}
        >
          <BookOpen size={14} aria-hidden="true" />
          {text.tabSheet}
        </button>
        <button
          type="button"
          className={`aisc-tab-btn ${activeTab === 'sizer' ? 'active' : ''}`}
          onClick={() => setActiveTab('sizer')}
        >
          <Sparkles size={14} aria-hidden="true" />
          {text.tabSizer}
        </button>
      </nav>

      {/* Toolbar: Member Picker + Focus Canvas */}
      <div className="aisc-design-card__toolbar">
        <div className="aisc-design-card__member-selector">
          <label htmlFor="aisc-member-select">
            <small>{text.selectMember}</small>
          </label>
          <select
            id="aisc-member-select"
            value={activeMember.memberId}
            onChange={(e) => setSelectedMemberId(e.target.value)}
          >
            {Object.values(summary.resultsByMemberId)
              .filter((r) => r.isEligible)
              .map((r) => (
                <option key={r.memberId} value={r.memberId}>
                  {r.memberId} · {r.sectionName} (η = {formatFixed(r.maxRatio, 2, 'inspector')})
                  {summary.criticalMember?.memberId === r.memberId ? ` ${text.criticalBadge}` : ''}
                </option>
              ))}
          </select>
        </div>

        <button
          type="button"
          className="aisc-canvas-focus-btn"
          onClick={handleFocusCanvas}
          title={text.focusCanvas}
        >
          <Crosshair size={13} aria-hidden="true" />
          {text.focusCanvas}
        </button>
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <>
          {/* Utilization Dial / Segmented Gauge */}
          <div className="aisc-gauge-container">
            <div className="aisc-gauge-header">
              <div>
                <span className="aisc-gauge-ratio-huge" style={{
                  color: activeMember.status === 'pass'
                    ? 'var(--sc-color-state-success, #168a6c)'
                    : activeMember.status === 'warning'
                      ? 'var(--sc-color-state-warning, #d97706)'
                      : 'var(--danger, #dc2626)',
                }}>
                  {formatFixed(activeMember.maxRatio, 2, 'inspector')}
                </span>
                <small style={{ color: 'var(--muted)', marginLeft: 8 }}>
                  ({text.governingTitle}: <strong>{text.kinds[activeMember.governingCheck as AiscCheckKind] ?? activeMember.governingCheck}</strong>)
                </small>
              </div>
              <small style={{ color: 'var(--muted)', fontFamily: 'var(--sc-font-mono)' }}>
                {text.slenderness}: <strong>{formatFixed(activeMember.slendernessKLr, 1, 'inspector')}</strong>
              </small>
            </div>

            <div className="aisc-gauge-track" title={`${text.governingRatio}: ${formatFixed(activeMember.maxRatio, 3, 'inspector')}`}>
              <div className="aisc-gauge-seg-safe" title={text.safeZone} />
              <div className="aisc-gauge-seg-warning" title={text.warningZone} />
              <div className="aisc-gauge-seg-fail" title={text.failZone} />
            </div>

            <div className="aisc-gauge-pointer-rail">
              <div className="aisc-gauge-pointer" style={{ left: `${gaugePercent}%` }}>
                ▲
              </div>
            </div>

            <div className="aisc-gauge-labels">
              <span>0.0</span>
              <span>{text.safeZone}</span>
              <span>0.90</span>
              <span>1.00</span>
              <span>{text.failZone}</span>
            </div>
          </div>

          {/* Section Geometry & Properties */}
          <div className="aisc-overview-grid">
            <AiscCrossSectionDiagram
              section={currentSection}
              governingCheck={activeMember.governingCheck}
              units={units}
            />

            <dl className="aisc-props-table">
              <div className="aisc-props-item">
                <dt>Perfil</dt>
                <dd>{currentSection.name}</dd>
              </div>
              <div className="aisc-props-item">
                <dt>Material</dt>
                <dd>{activeMember.materialName.split('/')[0]}</dd>
              </div>
              <div className="aisc-props-item">
                <dt>Área Ag</dt>
                <dd>{formatFixed(toDisplay(currentSection.area, units, 'area') * 10000, 1, 'inspector')} cm²</dd>
              </div>
              <div className="aisc-props-item">
                <dt>Inercia Ix</dt>
                <dd>{formatFixed(toDisplay(currentSection.inertiaX, units, 'length') * 100000000, 0, 'inspector')} cm⁴</dd>
              </div>
              <div className="aisc-props-item">
                <dt>Módulo Zx</dt>
                <dd>{formatFixed(currentSection.plasticModulusX * 1000000, 0, 'inspector')} cm³</dd>
              </div>
              <div className="aisc-props-item">
                <dt>Peso</dt>
                <dd>{formatFixed(currentSection.linearWeight, 2, 'inspector')} kN/m</dd>
              </div>
            </dl>
          </div>

          {/* Quick Smart Sizer Alert if available */}
          {sizerResult?.recommendedSection && sizerResult.recommendedSection.section.id !== currentSection.id && (
            <div className="aisc-sizer-summary-box">
              <div>
                <small style={{ color: 'var(--muted)', display: 'block' }}>{text.suggestedOptimal}</small>
                <strong>{sizerResult.recommendedSection.section.name}</strong>
                <span style={{ margin: '0 8px', color: 'var(--muted)' }}>·</span>
                <span>η = {formatFixed(sizerResult.recommendedSection.governingRatio, 2, 'inspector')}</span>
                <span style={{ margin: '0 8px', color: 'var(--muted)' }}>·</span>
                <span className={`aisc-weight-delta ${sizerResult.recommendedSection.weightDeltaPercent < 0 ? 'lighter' : 'heavier'}`}>
                  {sizerResult.recommendedSection.weightDeltaPercent < 0 ? '−' : '+'}
                  {formatFixed(Math.abs(sizerResult.recommendedSection.weightDeltaPercent), 1, 'inspector')}% {text.weightSavings}
                </span>
              </div>
              <button
                type="button"
                className="aisc-adopt-btn"
                onClick={() => handleAdoptSection(sizerResult.recommendedSection!.section.id)}
              >
                {text.adopt} {sizerResult.recommendedSection.section.name}
              </button>
            </div>
          )}
        </>
      )}

      {/* TAB 2: LIMIT STATES */}
      {activeTab === 'limits' && (
        <div className="aisc-limit-states-grid">
          {activeChecks.map((check) => {
            const isGov = check.kind === activeMember.governingCheck;
            const barWidth = Math.min(100, Math.round(check.ratio * 100));
            return (
              <div key={check.kind} className={`aisc-limit-card ${isGov ? 'is-governing' : ''}`}>
                <div className="aisc-limit-card-header">
                  <strong>{text.kinds[check.kind] ?? check.kind}</strong>
                  <small>{check.clause.split('·')[1]?.trim() ?? check.clause}</small>
                </div>

                <div className="aisc-limit-card-ratio" style={{
                  color: check.status === 'pass'
                    ? 'var(--sc-color-state-success, #168a6c)'
                    : check.status === 'warning'
                      ? 'var(--sc-color-state-warning, #d97706)'
                      : 'var(--danger, #dc2626)',
                }}>
                  η = {formatFixed(check.ratio, 2, 'inspector')}
                </div>

                <div className="aisc-limit-card-meter">
                  <div
                    className="aisc-limit-card-bar"
                    style={{
                      width: `${barWidth}%`,
                      background: check.status === 'pass'
                        ? 'var(--sc-color-state-success, #168a6c)'
                        : check.status === 'warning'
                          ? 'var(--sc-color-state-warning, #d97706)'
                          : 'var(--danger, #dc2626)',
                    }}
                  />
                </div>

                <div className="aisc-limit-card-inequality">
                  {formatDemand(check)} / {formatCapacity(check)}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* TAB 3: STEP-BY-STEP CALCULATION SHEET */}
      {activeTab === 'sheet' && (
        <div className="aisc-calc-sheet">
          {activeChecks.map((check) => (
            <div key={check.kind} className="aisc-calc-block">
              <div className="aisc-calc-title">
                <span>{check.title}</span>
                <span className="aisc-calc-clause">{check.clause}</span>
              </div>
              <div className="aisc-calc-eq">
                {check.equation} → {check.inequality}
              </div>
              <ul className="aisc-calc-vars">
                {check.variables.map((v) => (
                  <li key={v.symbol} className="aisc-calc-var-item">
                    <b>{v.symbol}</b> = {typeof v.value === 'number' && Number.isFinite(v.value) ? formatFixed(v.value, v.value > 100 ? 1 : 3, 'inspector') : v.value} {v.unit !== '1' ? v.unit : ''}
                    <small style={{ display: 'block', color: 'var(--muted)', fontSize: '0.65rem' }}>{v.label}</small>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      {/* TAB 4: SMART SECTION SIZER */}
      {activeTab === 'sizer' && sizerResult && (
        <div className="aisc-sizer-panel">
          <div className="aisc-sizer-summary-box">
            <div>
              <strong>{text.currentSection}: {currentSection.name}</strong>
              <span style={{ margin: '0 8px', color: 'var(--muted)' }}>·</span>
              <span>{formatFixed(currentSection.linearWeight, 2, 'inspector')} kN/m</span>
              <span style={{ margin: '0 8px', color: 'var(--muted)' }}>·</span>
              <span>η = {formatFixed(sizerResult.currentRatio, 2, 'inspector')}</span>
            </div>
            {sizerResult.recommendedSection && (
              <span className="aisc-sizer-highlight-badge">
                {text.suggestedOptimal} {sizerResult.recommendedSection.section.name}
              </span>
            )}
          </div>

          <div className="aisc-sizer-table-wrap">
            <table className="aisc-sizer-table">
              <thead>
                <tr>
                  <th>{text.tableSection}</th>
                  <th>{text.tableWeight}</th>
                  <th>{text.tableRatio}</th>
                  <th>{text.tableStatus}</th>
                  <th>{text.tableDelta}</th>
                  <th>{text.tableAction}</th>
                </tr>
              </thead>
              <tbody>
                {sizerResult.allCandidates.map((c) => {
                  const isCurrent = c.section.id === currentSection.id;
                  const isRec = sizerResult.recommendedSection?.section.id === c.section.id;
                  return (
                    <tr key={c.section.id} className={`aisc-sizer-row ${isCurrent ? 'is-current' : ''} ${isRec ? 'is-recommended' : ''}`}>
                      <td>
                        <strong>{c.section.name}</strong>
                        {isCurrent && <small> ({text.currentSection})</small>}
                        {isRec && <small> ★</small>}
                      </td>
                      <td>{formatFixed(c.weightPerMeter, 2, 'inspector')}</td>
                      <td style={{
                        color: c.status === 'pass'
                          ? 'var(--sc-color-state-success, #168a6c)'
                          : c.status === 'warning'
                            ? 'var(--sc-color-state-warning, #d97706)'
                            : 'var(--danger, #dc2626)',
                        fontWeight: 700,
                      }}>
                        {formatFixed(c.governingRatio, 2, 'inspector')}
                      </td>
                      <td>
                        <span className="aisc-design-card__badge" data-status={c.status} style={{ padding: '2px 6px', fontSize: '0.7rem' }}>
                          {c.status}
                        </span>
                      </td>
                      <td>
                        <span className={`aisc-weight-delta ${c.weightDeltaPercent < 0 ? 'lighter' : 'heavier'}`}>
                          {c.weightDeltaPercent > 0 ? '+' : ''}{formatFixed(c.weightDeltaPercent, 1, 'inspector')}%
                        </span>
                      </td>
                      <td>
                        {!isCurrent && (
                          <button
                            type="button"
                            className="aisc-adopt-btn"
                            onClick={() => handleAdoptSection(c.section.id)}
                          >
                            {text.adopt}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <small className="aisc-design-card__footer">{text.disclaimer}</small>
    </section>
  );
};
