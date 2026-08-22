// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { StructuralAssetStudio } from './StructuralAssetStudio';

afterEach(cleanup);

describe('StructuralAssetStudio', () => {
  it('shows the complete editable atlas grouped into ten families', () => {
    const { container } = render(<StructuralAssetStudio />);
    expect(screen.getByRole('heading', { name: 'Atlas estructural' })).toBeTruthy();
    expect(container.querySelectorAll('[data-asset-card]')).toHaveLength(40);
    expect(container.querySelectorAll('.asset-studio__family')).toHaveLength(10);
    expect(container.querySelectorAll('svg[data-structural-asset-id]')).toHaveLength(40);
  });

  it('reviews the identical assets against Day and Night surfaces', () => {
    render(<StructuralAssetStudio />);
    const studio = screen.getByTestId('structural-asset-studio');
    expect(studio.getAttribute('data-theme')).toBe('light');
    fireEvent.click(screen.getByRole('button', { name: 'Ver modo Noche' }));
    expect(studio.getAttribute('data-theme')).toBe('dark');
    expect(screen.getByRole('button', { name: 'Ver modo Día' })).toBeTruthy();
  });
});
