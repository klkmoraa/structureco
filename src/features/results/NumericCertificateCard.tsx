import { LoaderCircle } from 'lucide-react';
import type { CertificateStatus } from '../../engine/certificate';
import type { TranslationKey } from '../../i18n/catalogs';
import { useI18n } from '../../i18n/useI18n';

const statusKey: Record<CertificateStatus, TranslationKey> = {
  passed: 'results.certificatePassed',
  observed: 'results.certificateObserved',
  failed: 'results.certificateFailedCheck',
  'not-applicable': 'results.certificateNotApplicable',
};

export const NumericCertificateCard = ({ certificate, busy, error, run }: {
  certificate: import('../../engine/certificate').NumericCertificate | null;
  busy: boolean;
  error: string | null;
  run: () => void;
}) => {
  const { t } = useI18n();
  const verdictKey: TranslationKey = certificate?.verdict === 'verified'
    ? 'results.certificateVerified'
    : certificate?.verdict === 'observations'
      ? 'results.certificateObservations'
      : 'results.certificateNotVerifiable';
  return <section className="numeric-certificate-card" data-level="raised" aria-label={t('results.certificateTitle')}>
    <header className="numeric-certificate-heading">
      <div><span>{t('results.certificateTitle')}</span><h3 aria-live="polite">{certificate ? t(verdictKey) : t('results.certificateIdle')}</h3></div>
      <button type="button" onClick={run} disabled={busy}>
        {busy ? <><LoaderCircle className="spin" size={16} aria-hidden="true" /> {t('results.certificateRunning')}</> : certificate ? t('results.certificateRecompute') : t('results.computeCertificate')}
      </button>
    </header>
    {error ? <p className="numeric-certificate-limit" role="alert">{error}</p> : null}
    {certificate ? <>
      <ul className="numeric-certificate-checks">
        {certificate.checks.map((check) => <li key={check.id} data-state={check.status}>
          <div><strong>{check.label}</strong><span>{t(statusKey[check.status])}</span></div>
          <p>{check.message}</p>
        </li>)}
      </ul>
      <dl className="numeric-certificate-metrics"><div><dt>{t('results.certificateExtraSolves')}</dt><dd>{certificate.extraSolves}</dd></div></dl>
      <p className="numeric-certificate-limit">{certificate.summary}</p>
    </> : null}
    <p className="numeric-certificate-limit">{t('results.certificateLimit')}</p>
  </section>;
};
