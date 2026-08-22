// @vitest-environment jsdom
import { cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { ThreeStructuralImage } from './ThreeStructuralImage';

afterEach(cleanup);

describe('ThreeStructuralImage', () => {
  it('selects the generated transparent render for the active theme', () => {
    const { container, rerender } = render(<ThreeStructuralImage assetId="portal:two-story" theme="light" alt="Pórtico de dos niveles" eager />);
    expect(container.querySelector('img')?.getAttribute('src')).toBe('/assets/structural/day/portal/two-story.png');
    expect(container.querySelector('img')?.getAttribute('data-structural-render')).toBe('three-prerender');
    rerender(<ThreeStructuralImage assetId="portal:two-story" theme="dark" alt="Pórtico de dos niveles" />);
    expect(container.querySelector('img')?.getAttribute('src')).toBe('/assets/structural/night/portal/two-story.png');
  });

  it('routes non-portal families to their generated Three.js render folders', () => {
    const { container, rerender } = render(<ThreeStructuralImage assetId="truss:warren" theme="light" alt="Armadura Warren" />);
    expect(container.querySelector('img')?.getAttribute('src')).toBe('/assets/structural/day/truss/warren.png');
    rerender(<ThreeStructuralImage assetId="slab:waffle" theme="dark" alt="Losa reticular" />);
    expect(container.querySelector('img')?.getAttribute('src')).toBe('/assets/structural/night/slab/waffle.png');
  });

  it('falls back to the editable SVG when the generated image cannot load', () => {
    const { container } = render(<ThreeStructuralImage assetId="portal:single-bay" theme="light" alt="Pórtico sencillo" />);
    fireEvent.error(container.querySelector('img')!);
    expect(container.querySelector('svg[data-structural-asset-id="portal:single-bay"]')).not.toBeNull();
  });
});
