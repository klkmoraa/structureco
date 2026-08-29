import { StrictMode, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { LazyMotion } from 'motion/react';
import App from './App';
import { ErrorBoundary } from './design-system/components/errorBoundary';
import { preloadPreferredCatalog } from './i18n/languagePreference';
import { startLaunchQueue } from './platform/launchedFile';

preloadPreferredCatalog();
startLaunchQueue();
const root = createRoot(document.getElementById('root')!);
const loadMotionFeatures = () => import('./design-system/motionFeatures').then((module) => module.default);

/**
 * `strict` makes a stray `motion.*` component throw instead of silently pulling the full
 * feature bundle back into the entry chunk — the regression this setup exists to prevent.
 */
const render = (content: ReactNode) => root.render(
  <ErrorBoundary>
    <StrictMode>
      <LazyMotion features={loadMotionFeatures} strict>{content}</LazyMotion>
    </StrictMode>
  </ErrorBoundary>,
);

if (import.meta.env.DEV && window.location.pathname === '/__illustration-studio') {
  void import('./features/structural-assets/studio/IllustrationStudio').then(({ IllustrationStudioRoute }) => render(<IllustrationStudioRoute />));
} else if (import.meta.env.DEV && window.location.pathname === '/__three-assets') {
  void import('./features/structural-assets/ThreeAssetRenderLab').then(({ ThreeAssetRenderLab }) => render(<ThreeAssetRenderLab />));
} else if (import.meta.env.DEV && window.location.pathname === '/__assets') {
  void import('./features/structural-assets/StructuralAssetStudio').then(({ StructuralAssetStudio }) => render(<StructuralAssetStudio />));
} else if (import.meta.env.DEV && window.location.pathname === '/__components') {
  void import('./design-system/lab/ComponentLab').then(({ ComponentLab }) => render(<ComponentLab />));
} else {
  render(<App />);
}
