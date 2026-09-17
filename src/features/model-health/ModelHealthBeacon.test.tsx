// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ProjectProvider } from '../../store/ProjectContext';
import type { ModelHealthSnapshot } from './modelHealth';
import { ModelHealthBeacon } from './ModelHealthBeacon';

afterEach(cleanup);

const health: ModelHealthSnapshot = {
  status: 'blocked',
  critical: 2,
  warnings: 1,
  suggestions: 0,
  total: 3,
  analysisLevel: null,
  messageKey: 'canvas.healthBlocked',
};

describe('ModelHealthBeacon', () => {
  it('makes the model health legible and opens the existing doctor command', async () => {
    const user = userEvent.setup();
    const listener = vi.fn();
    window.addEventListener('structureco:open-model-doctor', listener);

    render(<ProjectProvider><ModelHealthBeacon health={health} /></ProjectProvider>);

    expect(screen.getByTestId('model-health-beacon').getAttribute('data-status')).toBe('blocked');
    expect(screen.getByTestId('model-health-beacon').getAttribute('data-health-status')).toBe('blocked');
    expect(screen.getByText('2 críticos')).toBeTruthy();
    expect(screen.getByText('1 aviso')).toBeTruthy();
    expect(screen.getByTestId('model-health-beacon').getAttribute('aria-label')).toContain('2 críticos, 1 aviso');

    await user.click(screen.getByRole('button', { name: /salud del modelo/i }));

    expect(listener).toHaveBeenCalledOnce();
    window.removeEventListener('structureco:open-model-doctor', listener);
  });
});
