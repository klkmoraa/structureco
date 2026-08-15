/**
 * TopBar · exactamente tres naturalezas (CRI-9 §15.7):
 * identidad del documento, acción global y estado. Nada más entra aquí.
 *
 * El estado de análisis y la fiabilidad viven en esta banda porque son globales,
 * persistentes y la afirmación más crítica del producto (D-03). Y la causa de
 * la fiabilidad es un BOTÓN, no un `title`: D-14 existe porque hoy esa
 * explicación sólo alcanza a quien usa ratón.
 */

import { useState } from 'react';
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
  const { state, derived } = usePrototype();
  const { solve, dispatch } = useActions();
  const { t, phase, composition } = derived;
  const [causeOpen, setCauseOpen] = useState(false);
  const compact = composition === 'K0';
  const spanish = state.axes.locale === 'es-MX';
  const governing = state.analysis.result?.governing;

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

      <div className="pt-topbar__action">
        <button
          type="button"
          className="sc-button sc-button--primary sc-button--sm"
          onClick={solve}
          disabled={state.analysis.isAnalyzing}
        >
          <span className="sc-button__label">{state.analysis.isAnalyzing ? t('state.calculating') : t('topbar.solve')}</span>
        </button>
      </div>

      <div className="pt-topbar__status">
        {state.analysis.connectivity === 'offline' ? (
          <span className="pt-chip pt-chip--offline">{t('state.offline')}</span>
        ) : null}
        {state.analysis.persistence === 'conflict' ? (
          <button type="button" className="pt-chip pt-chip--recovery" onClick={() => setCauseOpen(false)}>
            {t('state.recovery')}
          </button>
        ) : (
          !compact && <span className="pt-chip pt-chip--quiet">{t('topbar.saved')}</span>
        )}

        <button
          type="button"
          className="pt-chip pt-chip--state"
          data-phase={phase}
          aria-expanded={causeOpen}
          onClick={() => setCauseOpen((open) => !open)}
        >
          <span className="pt-chip__dot" aria-hidden="true" />
          {t(PHASE_KEY[phase])}
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
            {state.analysis.persistence === 'conflict' ? (
              <p className="pt-cause__note">{t('state.recovery.detail')}</p>
            ) : null}
          </div>
        ) : null}
      </div>
    </header>
  );
};
