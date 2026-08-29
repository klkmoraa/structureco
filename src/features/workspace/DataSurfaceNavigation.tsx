import type { KeyboardEvent } from 'react';
import { useI18n } from '../../i18n/useI18n';

/** Independent data tools are still reachable as a single task flow. */
export type DataSurfaceDestination = 'results' | 'datasheet' | 'doctor' | 'bom';

const destinations: ReadonlyArray<{ id: DataSurfaceDestination; labelKey: 'results.center' | 'datasheet.title' | 'modelDoctor.open' | 'bom.title' }> = [
  { id: 'results', labelKey: 'results.center' },
  { id: 'datasheet', labelKey: 'datasheet.title' },
  { id: 'doctor', labelKey: 'modelDoctor.open' },
  { id: 'bom', labelKey: 'bom.title' },
];

export const DataSurfaceNavigation = ({ current, onNavigate }: {
  current: DataSurfaceDestination;
  onNavigate: (target: DataSurfaceDestination) => void;
}) => {
  const { t } = useI18n();
  const navigateTo = (target: DataSurfaceDestination) => {
    if (target === current) return;
    onNavigate(target);
    // Switching closes one surface before the next opens. Focus the same
    // control after that hand-off rather than leaving keyboard users on a
    // button that has just unmounted.
    window.requestAnimationFrame(() => window.requestAnimationFrame(() => {
      document.querySelector<HTMLButtonElement>(`[data-data-surface="${target}"][tabindex="0"]`)?.focus();
    }));
  };
  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    let next = index;
    if (event.key === 'ArrowLeft') next = (index - 1 + destinations.length) % destinations.length;
    else if (event.key === 'ArrowRight') next = (index + 1) % destinations.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = destinations.length - 1;
    else return;
    event.preventDefault();
    navigateTo(destinations[next].id);
  };
  return <nav className="data-surface-navigation" aria-label={t('results.center')}>
    {destinations.map(({ id, labelKey }, index) => <button
      key={id}
      type="button"
      aria-current={current === id ? 'page' : undefined}
      tabIndex={current === id ? 0 : -1}
      data-data-surface={id}
      onClick={() => navigateTo(id)}
      onKeyDown={(event) => onKeyDown(event, index)}
    >{t(labelKey)}</button>)}
  </nav>;
};
