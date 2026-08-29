// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createDefaultProject } from '../../data/defaultProject';
import { PROJECT_STORAGE_KEY } from '../../data/projectStorage';
import { ProjectProvider } from '../../store/ProjectContext';
import { LocalCommandAssistant } from './LocalCommandAssistant';

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem(PROJECT_STORAGE_KEY, JSON.stringify(createDefaultProject()));
  if (!globalThis.crypto.randomUUID) Object.defineProperty(globalThis.crypto, 'randomUUID', { value: () => '00000000-0000-4000-8000-000000000000' });
});
afterEach(cleanup);

describe('LocalCommandAssistant', () => {
  it('previews an allowed local change without applying it', async () => {
    const user = userEvent.setup();
    render(<ProjectProvider><LocalCommandAssistant open onClose={() => undefined} /></ProjectProvider>);

    await user.type(screen.getByRole('textbox', { name: 'Describe el cambio' }), 'M1 E = 210 GPa');
    await user.click(screen.getByRole('button', { name: 'Proponer cambio' }));

    expect(await screen.findByText('Revisa el cambio antes de aplicarlo')).toBeTruthy();
    expect(screen.getByText('Modificaciones: 1')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Aplicar cambio' })).toBeTruthy();
  });
});
