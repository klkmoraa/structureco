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
});
