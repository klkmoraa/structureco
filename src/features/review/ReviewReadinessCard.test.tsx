// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
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
});
