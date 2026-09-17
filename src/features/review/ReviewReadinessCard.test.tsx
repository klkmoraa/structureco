// @vitest-environment jsdom
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ProjectProvider } from '../../store/ProjectContext';
import type { ReviewReadinessSnapshot } from './reviewReadiness';
import { ReviewReadinessCard } from './ReviewReadinessCard';

afterEach(cleanup);

const snapshot: ReviewReadinessSnapshot = {
  status: 'attention',
  readyCount: 2,
  totalCount: 4,
  rows: [
    { id: 'model', status: 'attention', labelKey: 'results.reviewModel', detailKey: 'results.reviewModelAttention', action: 'doctor' },
    { id: 'analysis', status: 'ready', labelKey: 'results.reviewAnalysis', detailKey: 'results.reviewAnalysisReady', action: null },
    { id: 'coverage', status: 'pending', labelKey: 'results.reviewCoverage', detailKey: 'results.reviewCoveragePending', action: 'compare' },
    { id: 'certificate', status: 'pending', labelKey: 'results.reviewCertificate', detailKey: 'results.reviewCertificatePending', action: null },
  ],
};

const blockedSnapshot: ReviewReadinessSnapshot = {
  ...snapshot,
  status: 'blocked',
  rows: snapshot.rows.map((row) => row.id === 'model' ? { ...row, status: 'blocked' } : row),
};

describe('ReviewReadinessCard', () => {
  it('shows evidence readiness, keeps the safety boundary visible, and routes review actions', async () => {
    const user = userEvent.setup();
    const onOpenDoctor = vi.fn();
    const onCompare = vi.fn();
    render(<ProjectProvider><ReviewReadinessCard snapshot={snapshot} onOpenDoctor={onOpenDoctor} onCompare={onCompare} /></ProjectProvider>);

    expect(screen.getByTestId('review-readiness-card')).toBeTruthy();
    expect(screen.getByText('2/4')).toBeTruthy();
    expect(screen.getByText(/no es una certificación de seguridad/i)).toBeTruthy();
    expect(screen.getAllByRole('listitem')).toHaveLength(4);

    await user.click(screen.getByRole('button', { name: 'Abrir Model Doctor' }));
    await user.click(screen.getByRole('button', { name: 'Comparar escenarios' }));

    expect(onOpenDoctor).toHaveBeenCalledOnce();
    expect(onCompare).toHaveBeenCalledOnce();
  });

  it('starts a review pass and exposes each evidence step while it runs', async () => {
    const user = userEvent.setup();
    const onRunReview = vi.fn();
    const view = render(<ProjectProvider><ReviewReadinessCard
      snapshot={snapshot}
      onOpenDoctor={vi.fn()}
      onCompare={vi.fn()}
      onRunReview={onRunReview}
      isReviewRunning={false}
      analysisBusy={false}
      comparisonBusy={false}
      certificateBusy={false}
    /></ProjectProvider>);

    await user.click(screen.getByRole('button', { name: 'Actualizar revisión' }));

    expect(onRunReview).toHaveBeenCalledOnce();

    view.rerender(<ProjectProvider><ReviewReadinessCard
      snapshot={snapshot}
      onOpenDoctor={vi.fn()}
      onCompare={vi.fn()}
      onRunReview={onRunReview}
      isReviewRunning={true}
      analysisBusy={true}
      comparisonBusy={true}
      certificateBusy={true}
    /></ProjectProvider>);

    expect(screen.getByRole('status').textContent).toContain('Actualizando revisión');
    const steps = screen.getByRole('list', { name: 'Pasos del pase de revisión' });
    expect(within(steps).getAllByRole('listitem')).toHaveLength(4);
    expect(screen.getByRole('button', { name: 'Actualizando revisión…' }).hasAttribute('disabled')).toBe(true);
    expect(screen.getByText('Modelo', { selector: '[data-review-step]' }).getAttribute('data-state')).toBe('attention');
    expect(screen.getByText('Análisis', { selector: '[data-review-step]' }).getAttribute('data-state')).toBe('running');
    expect(screen.getByText('Cobertura', { selector: '[data-review-step]' }).getAttribute('data-state')).toBe('running');
    expect(screen.getByText('Certificado numérico', { selector: '[data-review-step]' }).getAttribute('data-state')).toBe('running');
  });

  it('keeps the one-click pass behind Model Doctor when the model is blocked', () => {
    render(<ProjectProvider><ReviewReadinessCard
      snapshot={blockedSnapshot}
      onOpenDoctor={vi.fn()}
      onCompare={vi.fn()}
      onRunReview={vi.fn()}
    /></ProjectProvider>);

    expect(screen.getByRole('button', { name: 'Actualizar revisión' }).hasAttribute('disabled')).toBe(true);
  });

  it('does not start another pass while an evidence executor is already busy', async () => {
    const user = userEvent.setup();
    const onRunReview = vi.fn();
    render(<ProjectProvider><ReviewReadinessCard
      snapshot={snapshot}
      onOpenDoctor={vi.fn()}
      onCompare={vi.fn()}
      onRunReview={onRunReview}
      analysisBusy
    /></ProjectProvider>);

    const button = screen.getByRole('button', { name: 'Actualizar revisión' });
    expect(button.hasAttribute('disabled')).toBe(true);
    await user.click(button);
    expect(onRunReview).not.toHaveBeenCalled();
  });

  it('announces a failed pass with semantic step-list roles', () => {
    render(<ProjectProvider><ReviewReadinessCard
      snapshot={snapshot}
      onOpenDoctor={vi.fn()}
      onCompare={vi.fn()}
      onRunReview={vi.fn()}
      reviewPassState="failed"
      reviewPassFailures={{ analysis: false, comparison: true, certificate: false }}
    /></ProjectProvider>);

    expect(screen.getByRole('status').textContent).toContain('requiere atención');
    const steps = screen.getByRole('list', { name: 'Pasos del pase de revisión' });
    expect(steps).toBeTruthy();
    expect(screen.getByText('Cobertura', { selector: '[data-review-step]' }).getAttribute('data-state')).toBe('failed');
  });
});
