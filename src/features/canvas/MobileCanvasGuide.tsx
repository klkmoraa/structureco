import { LocateFixed } from 'lucide-react';
import { useI18n } from '../../i18n/useI18n';

export interface MobileCanvasGuideProps {
  solved: boolean;
  onFit: () => void;
}

/**
 * K0 keeps the canvas deliberately calm, so it cannot rely on the desktop
 * compass or camera cluster. This single contextual surface explains the
 * current reading and restores the one camera action people need most.
 */
export const MobileCanvasGuide = ({ solved, onFit }: MobileCanvasGuideProps) => {
  const { t } = useI18n();

  return (
    <aside className="mobile-canvas-guide" aria-label={t('canvas.mobileGuideLabel')}>
      <span className="mobile-canvas-guide__copy" aria-live="polite">
        <strong>{t(solved ? 'canvas.mobileResultsVisible' : 'canvas.mobileModelVisible')}</strong>
        <small>{t(solved ? 'canvas.mobileResultsHint' : 'canvas.gestureTouch')}</small>
      </span>
      <button
        type="button"
        className="mobile-canvas-guide__fit"
        onClick={onFit}
        aria-label={t('canvas.fit')}
        title={t('canvas.fit')}
      >
        <LocateFixed size={18} strokeWidth={2.1} aria-hidden="true" />
        <span>{t('canvas.fitShort')}</span>
      </button>
    </aside>
  );
};
