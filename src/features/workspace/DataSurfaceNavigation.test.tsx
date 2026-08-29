// @vitest-environment jsdom
import { useState } from 'react';
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ProjectProvider } from '../../store/ProjectContext';
import { DataSurfaceNavigation } from './DataSurfaceNavigation';

afterEach(cleanup);

describe('DataSurfaceNavigation', () => {
  it('identifies the current workbench and sends the requested destination', async () => {
    const user = userEvent.setup();
    const onNavigate = vi.fn();
    render(<ProjectProvider><DataSurfaceNavigation current="datasheet" onNavigate={onNavigate} /></ProjectProvider>);
    expect(screen.getByRole('button', { name: 'Hoja de datos estructural' }).getAttribute('aria-current')).toBe('page');
    await user.click(screen.getByRole('button', { name: 'BOM estructural' }));
    expect(onNavigate).toHaveBeenCalledWith('bom');
  });

  it('uses roving arrow and edge keys to carry the data workflow forward', async () => {
    const user = userEvent.setup();
    const onNavigate = vi.fn();
    render(<ProjectProvider><DataSurfaceNavigation current="datasheet" onNavigate={onNavigate} /></ProjectProvider>);
    const current = screen.getByRole('button', { name: 'Hoja de datos estructural' });

    await user.click(current);
    await user.keyboard('{ArrowRight}');
    await user.keyboard('{Home}');
    await user.keyboard('{End}');

    expect(onNavigate.mock.calls.map(([target]) => target)).toEqual(['doctor', 'results', 'bom']);
  });

  it('restores focus to the current control after the destination surface mounts', async () => {
    const user = userEvent.setup();
    const frames: FrameRequestCallback[] = [];
    const requestFrame = vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
      frames.push(callback);
      return frames.length;
    });
    const ControlledNavigation = () => {
      const [current, setCurrent] = useState<'results' | 'datasheet' | 'doctor' | 'bom'>('datasheet');
      return <DataSurfaceNavigation current={current} onNavigate={setCurrent} />;
    };
    render(<ProjectProvider><ControlledNavigation /></ProjectProvider>);
    screen.getByRole('button', { name: 'Hoja de datos estructural' }).focus();

    await user.keyboard('{ArrowRight}');
    await waitFor(() => expect(screen.getByRole('button', { name: 'Abrir Model Doctor' }).getAttribute('aria-current')).toBe('page'));
    // A previous navigation may still have one harmless focus frame pending.
    // Drain the bounded two-frame hand-off rather than depending on test order.
    for (let index = 0; frames.length && index < 8; index += 1) act(() => frames.shift()?.(0));

    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Abrir Model Doctor' }));
    requestFrame.mockRestore();
  });
});
