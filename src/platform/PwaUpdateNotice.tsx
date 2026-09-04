import { useEffect, useState } from 'react';
import { DownloadCloud, X } from 'lucide-react';
import { usePhase2I18n } from '../i18n/usePhase2I18n';
import { useI18n } from '../i18n/useI18n';
import { watchForPwaUpdates, type PwaUpdateController } from './pwaLifecycle';
import { isNativeHost } from './nativeBridge';
import './pwa.css';

export const PwaUpdateNotice = () => {
  const { language } = useI18n();
  const { t } = usePhase2I18n(language);
  const [controller, setController] = useState<PwaUpdateController | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Dentro del shell nativo no hay actualización que vigilar: el contenido
    // viaja en el paquete de la aplicación y lo renueva la App Store, no un
    // worker. Registrarlo ahí sólo añadiría una segunda copia del build y un
    // aviso de «hay una versión nueva» que no puede ser cierto.
    if (!('serviceWorker' in navigator) || import.meta.env.DEV || isNativeHost()) return;
    let reloading = false;
    let disposed = false;
    let lifecycle: PwaUpdateController | null = null;
    void watchForPwaUpdates(navigator.serviceWorker, (next) => {
      if (disposed) {
        next.dispose();
        return;
      }
      lifecycle = next;
      // A stale worker can keep an older hashed CSS/JS bundle alive on a phone
      // after Pages has published the fix. Once this page is already controlled,
      // activate the waiting worker immediately so the next render is coherent;
      // first install still remains silent until a controller exists.
      if (navigator.serviceWorker.controller) next.applyUpdate();
      setController(next);
      setDismissed(false);
    }, () => {
      if (reloading) return;
      reloading = true;
      window.location.reload();
    }).then((next) => {
      if (disposed) next.dispose();
      else lifecycle = next;
    });
    return () => {
      disposed = true;
      lifecycle?.dispose();
    };
  }, []);

  if (!controller || dismissed) return null;
  return <aside className="pwa-update-notice" role="status" aria-live="polite">
    <DownloadCloud size={20} aria-hidden="true" />
    <div><strong>{t('pwa.updateTitle')}</strong><p>{t('pwa.updateDescription')}</p></div>
    <button type="button" onClick={() => controller.applyUpdate()}>{t('pwa.updateNow')}</button>
    <button type="button" className="pwa-update-notice__dismiss" aria-label={t('pwa.later')} onClick={() => setDismissed(true)}><X size={18} /></button>
  </aside>;
};
