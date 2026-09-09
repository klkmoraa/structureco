import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const mobileContract = readFileSync(new URL('../mobile/mobileIOS.css', import.meta.url), 'utf8');
const mobileHomeContract = readFileSync(new URL('../mobile/mobileHomeIOS.css', import.meta.url), 'utf8');

describe('mobile iOS composition contract', () => {
  it('keeps safe areas, touch targets and an explicit dock height in the layout layer', () => {
    expect(mobileContract).toContain('--sc-safe-top');
    expect(mobileContract).toContain('--sc-safe-bottom');
    expect(mobileContract).toContain('--sc-keyboard-inset');
    expect(mobileContract).toContain('--sc-size-target-touch');
    expect(mobileContract).toContain('--sc-mobile-dock-height');
  });

  it('uses the existing surface and clay tokens instead of introducing a mobile palette', () => {
    expect(mobileContract).toContain('var(--sc-color-surface-1)');
    expect(mobileContract).toContain('var(--sc-shadow-clay-md)');
    expect(mobileContract).toContain('var(--sc-shadow-clay-pressed)');
    expect(mobileContract).not.toMatch(/#[0-9a-f]{3,8}\b/i);
  });

  it('reserves the camera controls before sizing the evidence rail', () => {
    expect(mobileContract).toContain('var(--sc-size-target-touch) * 3');
    expect(mobileContract).toContain(".canvas-host:has(.quick-entry-bar) .canvas-evidence-rail");
  });

  it('keeps the home command row readable without adding a second palette', () => {
    expect(mobileHomeContract).toContain('grid-template-columns: var(--sc-size-target-touch) var(--sc-size-target-touch) minmax(0, 1fr)');
    expect(mobileHomeContract).toContain('var(--sc-safe-left');
    expect(mobileHomeContract).not.toMatch(/#[0-9a-f]{3,8}\b/i);
  });
});
