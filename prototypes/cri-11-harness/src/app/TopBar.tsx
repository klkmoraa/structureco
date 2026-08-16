/**
 * TopBar · exactamente tres naturalezas (CRI-9 §15.7):
 * identidad del documento, acción global y estado. Nada más entra aquí.
 *
 * El estado de análisis y la fiabilidad viven en esta banda porque son globales,
 * persistentes y la afirmación más crítica del producto (D-03). Y la causa de
 * la fiabilidad es un BOTÓN, no un `title`: D-14 existe porque hoy esa
 * explicación sólo alcanza a quien usa ratón.
 *
 * Fase B recupera puertas que Fase A dejó fuera del todo: Deshacer/Rehacer
 * (SHL-03/04, global persistente), el lanzador de Model Doctor con recuento
 * de severidad (SHL-14, hoy oculto bajo 1024px en producción — aquí NO se
 * oculta), la Command Palette (SHL-05/06) y Salida (SHL-22, que CRI-8 ya
 * confirma con icono propio en TopBar hoy). El chip de recuperación deja de
 * ser un adorno: abre la superficie `recovery` (D-08).
 *
 * Fase C añade una línea de una sola fila bajo Resolver: cuántos casos de
 * carga están activos y si el orden es P-Δ (D-09 completo — antes sólo quien
 * abría el Contexto de análisis lo sabía). Es deliberadamente texto, no un
 * bloque nuevo: cabe en la altura ya reservada para Resolver y desaparece
 * primero que cualquier otra cosa en Compact, donde ya existe la vía de
 * escape del chip "Contexto de análisis" en el chrome del lienzo.
 */

import { useState } from 'react';
import { severityCount } from '../core/doctor';
import { useActions, usePrototype } from '../state/PrototypeStore';
import type { TranslationKey } from '../core/i18n';

const PHASE_KEY: Record<string, TranslationKey> = {
  ready: 'state.ready',
  calculating: 'state.calculating',
  current: 'state.current',
  stale: 'state.stale',
  limited: 'state.limited',
  unreliable: 'state.unreliable',
  failed: 'state.failed',
};

const PHASE_DETAIL: Record<string, TranslationKey> = {
  ready: 'state.ready.detail',
  calculating: 'state.calculating.detail',
  current: 'state.current.detail',
  stale: 'state.stale.detail',
  limited: 'state.limited.detail',
  unreliable: 'state.unreliable.detail',
  failed: 'state.failed.detail',
};

export const TopBar = () => {
  const { state, derived, dispatch } = usePrototype();
  const { solve, undo, redo, openSurface, closeSurface, invoke } = useActions();
  const { t, phase, composition, findings, canUndo, canRedo } = derived;
  const [causeOpen, setCauseOpen] = useState(false);
  const compact = composition === 'K0';
  const spanish = state.axes.locale === 'es-MX';
  const governing = state.analysis.result?.governing;
  const attentionCount = severityCount(findings, 'attention') + severityCount(findings, 'notice');
  const cases = derived.fixture.cases;
  const activeCaseCount = cases.filter((item) => state.analysisSetup.activeCases[item.id] ?? true).length;
  const analysisSetupOpen = state.broker.open.includes('analysis-setup');

  return (
    <header className="pt-topbar" data-composition={composition}>
      <div className="pt-topbar__identity">
        <button
          type="button"
          className="pt-topbar__project"
          onClick={() => dispatch({ type: 'screen/welcome' })}
          aria-label={spanish ? 'Volver a la entrada' : 'Back to the entry screen'}
        >
          <span className="pt-topbar__name">{spanish ? derived.fixture.name.es : derived.fixture.name.en}</span>
          {!compact ? <span className="pt-topbar__units">{t('topbar.units')}</span> : null}
        </button>
        <span className="pt-tag pt-tag--fixture" data-fixture="true" title={t('canvas.fixtureFull')}>
          {t('canvas.fixture')}
        </span>
      </div>

      {!compact ? (
        <div className="pt-topbar__history">
          <button type="button" className="sc-icon-button sc-icon-button--ghost sc-icon-button--sm" aria-label={t('command.undo')} disabled={!canUndo} onClick={undo}>
            ↶
          </button>
          <button type="button" className="sc-icon-button sc-icon-button--ghost sc-icon-button--sm" aria-label={t('command.redo')} disabled={!canRedo} onClick={redo}>
            ↷
          </button>
        </div>
      ) : null}

      <div className="pt-topbar__action">
        <button type="button" className="sc-button sc-button--primary sc-button--sm" onClick={solve} disabled={state.analysis.isAnalyzing}>
          <span className="sc-button__label">{state.analysis.isAnalyzing ? t('state.calculating') : t('topbar.solve')}</span>
        </button>
        {!compact ? (
          <button
            type="button"
            className="pt-topbar__context"
            aria-expanded={analysisSetupOpen}
            title={t('surface.analysisSetup')}
            onClick={() => {
              invoke('surface.analysisSetup.toggle', 'visible');
              analysisSetupOpen ? closeSurface('analysis-setup') : openSurface('analysis-setup');
            }}
          >
            {activeCaseCount}/{cases.length} {t('analysisSetup.cases')}
            {state.analysisSetup.order === 'pdelta' ? ` · ${t('analysisSetup.pdeltaBadge')}` : ''}
          </button>
        ) : null}
      </div>

      <div className="pt-topbar__status">
        {/*
         * Orden deliberado, no alfabético: en Compact el cluster puede
         * desbordar y sólo se degrada por scroll horizontal declarado
         * (overflow-x:auto en CSS), nunca oculto sin aviso. Lo primero en el
         * DOM es lo que se ve sin desplazar — así que el chip de estado
         * (D-14, "la afirmación más crítica") va primero, y la paleta va al
         * final porque conserva una ruta que no depende de ser visible: el
         * atajo de teclado sigue funcionando esté o no el icono en pantalla.
         */}
        {state.analysis.connectivity === 'offline' ? <span className="pt-chip pt-chip--offline">{t('state.offline')}</span> : null}
        {state.analysis.persistence === 'conflict' ? (
          <button
            type="button"
            className="pt-chip pt-chip--recovery"
            onClick={() => {
              invoke('surface.recovery.toggle', 'visible');
              openSurface('recovery');
            }}
          >
            {t('state.recovery')}
          </button>
        ) : (
          !compact && <span className="pt-chip pt-chip--quiet">{t('topbar.saved')}</span>
        )}

        <button type="button" className="pt-chip pt-chip--state" data-phase={phase} aria-expanded={causeOpen} onClick={() => setCauseOpen((open) => !open)}>
          <span className="pt-chip__dot" aria-hidden="true" />
          {t(PHASE_KEY[phase])}
        </button>

        <button
          type="button"
          className="sc-icon-button sc-icon-button--ghost sc-icon-button--sm pt-topbar__icon"
          aria-label={`${t('surface.doctor')} (${findings.length})`}
          data-count={attentionCount > 0 || undefined}
          onClick={() => {
            invoke('surface.doctor.toggle', 'visible');
            openSurface('doctor');
          }}
        >
          ⚕
          {attentionCount > 0 ? <span className="pt-topbar__badge">{attentionCount}</span> : null}
        </button>

        {!compact ? (
          <>
            <button
              type="button"
              className="sc-icon-button sc-icon-button--ghost sc-icon-button--sm pt-topbar__icon"
              aria-label={t('surface.output')}
              onClick={() => {
                invoke('surface.output.toggle', 'visible');
                openSurface('output');
              }}
            >
              ⇩
            </button>
            <button
              type="button"
              className="sc-icon-button sc-icon-button--ghost sc-icon-button--sm pt-topbar__icon"
              aria-label={t('surface.preferences')}
              onClick={() => {
                invoke('surface.preferences.toggle', 'visible');
                openSurface('preferences');
              }}
            >
              ⚙
            </button>
          </>
        ) : null}

        <button
          type="button"
          className="sc-icon-button sc-icon-button--ghost sc-icon-button--sm pt-topbar__icon"
          aria-label={t('command.palette')}
          onClick={() => {
            invoke('surface.palette.toggle', 'visible');
            openSurface('palette');
          }}
        >
          ⌘K
        </button>

        {causeOpen ? (
          <div className="pt-cause" role="dialog" aria-label={t('state.label')}>
            <p className="pt-cause__detail">{t(PHASE_DETAIL[phase])}</p>
            {governing ? (
              <p className="pt-cause__check">
                <span className="pt-cause__label">{t('state.causeLabel')}</span>
                <span className="pt-cause__value">
                  {spanish ? governing.label.es : governing.label.en} · {governing.value.toExponential(1)} (
                  {spanish ? 'umbral' : 'threshold'} {governing.threshold.toExponential(1)})
                </span>
              </p>
            ) : null}
            <p className="pt-cause__note">{t('state.notSafety')}</p>
            {phase === 'stale' ? (
              <button type="button" className="sc-button sc-button--secondary sc-button--sm" onClick={solve}>
                <span className="sc-button__label">{t('state.staleAction')}</span>
              </button>
            ) : null}
            {state.analysis.persistence === 'conflict' ? <p className="pt-cause__note">{t('state.recovery.detail')}</p> : null}
          </div>
        ) : null}
      </div>
    </header>
  );
};
