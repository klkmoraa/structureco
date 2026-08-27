/**
 * Model Doctor · flujo representativo (CRI-11 §8): finding → localizar →
 * entender → actuar/cerrar, con el objeto y la evidencia sincronizados.
 *
 * Los hallazgos son de MODELADO — deterministas, derivados del modelo
 * efectivo en `core/doctor.ts` — nunca un dictamen de seguridad estructural.
 * El aviso de `doctor.disclaimer` es literal, no decorativo: StructureCo no
 * hace verificación normativa, y este prototipo tampoco puede insinuarlo.
 */

import { severityCount, type Finding, type FindingSeverity } from '../core/doctor';
import type { TranslationKey } from '../core/i18n';
import { measureInteraction } from '../core/telemetry';
import { useActions, usePrototype } from '../state/PrototypeStore';

const SEVERITY_KEY: Record<FindingSeverity, TranslationKey> = {
  attention: 'doctor.severity.attention',
  notice: 'doctor.severity.notice',
  info: 'doctor.severity.info',
};

export const ModelDoctor = () => {
  const { state, derived, dispatch } = usePrototype();
  const { closeSurface, locate, peekSurface, invoke } = useActions();
  const { t, composition, findings } = derived;

  const visible = state.doctorFilter === 'all' ? findings : findings.filter((finding) => finding.severity === state.doctorFilter);

  return (
    <section className="pt-doctor" data-composition={composition} aria-label={t('surface.doctor')}>
      <header className="pt-detail__head">
        <h2 className="pt-detail__title">
          {t('surface.doctor')}
          <span className="pt-dense__count">
            {findings.length} {t('doctor.findings')}
          </span>
        </h2>
        <button type="button" className="sc-icon-button sc-icon-button--ghost sc-icon-button--sm" aria-label={t('surface.close')} onClick={() => closeSurface('doctor')}>
          ✕
        </button>
      </header>

      <p className="pt-note pt-note--reliability">{t('doctor.disclaimer')}</p>

      <div className="pt-segmented" role="group" aria-label={t('doctor.filterAll')}>
        <button type="button" data-active={state.doctorFilter === 'all' || undefined} aria-pressed={state.doctorFilter === 'all'} onClick={() => dispatch({ type: 'doctor/filter', severity: 'all' })}>
          {t('doctor.filterAll')} ({findings.length})
        </button>
        {(['attention', 'notice', 'info'] as FindingSeverity[]).map((severity) => (
          <button
            key={severity}
            type="button"
            data-active={state.doctorFilter === severity || undefined}
            aria-pressed={state.doctorFilter === severity}
            onClick={() => dispatch({ type: 'doctor/filter', severity })}
          >
            {t(SEVERITY_KEY[severity])} ({severityCount(findings, severity)})
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <p className="pt-detail__empty">{t('doctor.empty')}</p>
      ) : (
        <ul className="pt-doctor__list">
          {visible.map((finding) => (
            <FindingCard
              key={finding.id}
              finding={finding}
              acknowledged={Boolean(state.doctorAcknowledged[finding.id])}
              onLocate={() => {
                invoke('doctor.locate', 'visible');
                measureInteraction('doctor.locate', () => {
                  locate({ kind: finding.objectKind, id: finding.objectId });
                  peekSurface('doctor');
                });
              }}
              onAct={() => {
                if (finding.objectKind === 'member') {
                  invoke('doctor.act', 'visible');
                  locate({ kind: 'member', id: finding.objectId });
                  dispatch({ type: 'surface/open', surface: 'detail', composition, invoker: 'doctor' });
                }
              }}
              onAcknowledge={() => {
                invoke('doctor.acknowledge', 'visible');
                dispatch({ type: 'doctor/acknowledge', id: finding.id });
              }}
              t={t}
            />
          ))}
        </ul>
      )}
    </section>
  );
};

const FindingCard = ({
  finding,
  acknowledged,
  onLocate,
  onAct,
  onAcknowledge,
  t,
}: {
  finding: Finding;
  acknowledged: boolean;
  onLocate: () => void;
  onAct: () => void;
  onAcknowledge: () => void;
  t: (key: TranslationKey) => string;
}) => (
  <li className="pt-doctor__card" data-severity={finding.severity} data-acknowledged={acknowledged || undefined}>
    <div className="pt-doctor__card-head">
      <span className="pt-doctor__badge" data-severity={finding.severity}>
        {t(SEVERITY_KEY[finding.severity])}
      </span>
      <p className="pt-doctor__title">{t(finding.titleKey as TranslationKey)}</p>
      {acknowledged ? <span className="pt-tag">{t('doctor.acknowledged')}</span> : null}
    </div>
    <p className="pt-doctor__body">
      <strong>{finding.objectId}</strong> {t(finding.bodyKey as TranslationKey)}
    </p>
    <div className="pt-doctor__actions">
      <button type="button" className="pt-row-action" onClick={onLocate}>
        {t('doctor.action.locate')}
      </button>
      {finding.objectKind === 'member' ? (
        <button type="button" className="pt-row-action" onClick={onAct}>
          {t('doctor.action.act')}
        </button>
      ) : null}
      <button type="button" className="pt-row-action pt-row-action--quiet" onClick={onAcknowledge} disabled={acknowledged}>
        {t('doctor.action.acknowledge')}
      </button>
    </div>
  </li>
);
