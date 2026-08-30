// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SupportPlacementPopover } from './SupportPlacementPopover';

afterEach(cleanup);

const labels = { none: 'Libre', pin: 'Articulado', roller: 'Rodillo', fixed: 'Empotrado', custom: 'Personalizado' } as const;

describe('SupportPlacementPopover', () => {
  it('requires an explicit support choice and preserves a typed roller angle', () => {
    const onSelect = vi.fn();
    render(<SupportPlacementPopover
      nodeId="N4"
      anchor={{ x: 740, y: 560 }}
      viewport={{ width: 800, height: 600 }}
      title="Tipo de apoyo"
      description="Elige el apoyo para este nodo."
      labels={labels}
      rollerAngleLabel="Normal del rodillo"
      degreesLabel="°"
      cancelLabel="Cancelar"
      initialType="none"
      initialAngleDeg={90}
      onSelect={onSelect}
      onCancel={vi.fn()}
    />);

    expect(screen.getByRole('dialog')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Articulado' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Articulado' }).classList.contains('active')).toBe(false);
    fireEvent.change(screen.getByRole('textbox', { name: 'Normal del rodillo' }), { target: { value: '37.125' } });
    fireEvent.click(screen.getByRole('button', { name: 'Rodillo' }));
    expect(onSelect).toHaveBeenCalledWith('roller', 37.125);
  });

  it('clamps the popover anchor inside the viewport and cancels with Escape', () => {
    const onCancel = vi.fn();
    render(<SupportPlacementPopover
      nodeId="N1"
      anchor={{ x: 799, y: 599 }}
      viewport={{ width: 800, height: 600 }}
      title="Tipo de apoyo"
      description="Elige el apoyo para este nodo."
      labels={labels}
      rollerAngleLabel="Normal del rodillo"
      degreesLabel="°"
      cancelLabel="Cancelar"
      onSelect={vi.fn()}
      onCancel={onCancel}
    />);

    const dialog = screen.getByRole('dialog');
    expect(dialog.getAttribute('style')).toContain('left: 542px');
    expect(dialog.getAttribute('style')).toContain('top: 348px');
    fireEvent.keyDown(dialog, { key: 'Escape' });
    expect(onCancel).toHaveBeenCalledOnce();
  });
});
