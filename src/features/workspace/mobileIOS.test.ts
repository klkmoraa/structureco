import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const mobileContract = readFileSync(new URL('../mobile/mobileIOS.css', import.meta.url), 'utf8');
const mobileHomeContract = readFileSync(new URL('../mobile/mobileHomeIOS.css', import.meta.url), 'utf8');
const topbarContract = readFileSync(new URL('../topbar/topbar.css', import.meta.url), 'utf8');

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

  it('keeps the phone canvas calm by removing persistent camera and evidence rails', () => {
    expect(mobileContract).toContain('Calm phone canvas');
    expect(mobileContract).toMatch(/\.canvas-controls,[\s\S]*\.canvas-evidence-rail,[\s\S]*display: none !important;/);
    expect(mobileContract).toContain('grid-template-columns: repeat(4, minmax(0, 1fr));');
  });

  it('keeps one named fit action above the dock without covering the model', () => {
    expect(mobileContract).toContain('.mobile-canvas-guide');
    expect(mobileContract).toContain('inset-block-end: calc(var(--sc-mobile-dock-height) + 8px);');
    expect(mobileContract).toContain('--canvas-safe-bottom: calc(var(--sc-mobile-dock-height) + 68px);');
    expect(mobileContract).toContain('.mobile-canvas-guide__fit');
  });

  it('keeps the phone topbar inside one viewport and names the overflow action', () => {
    expect(mobileContract).toContain("grid-template-areas: 'project actions';");
    expect(mobileContract).toContain('.topbar-health-zone');
    expect(mobileContract).toContain('.mobile-more-copy');
    expect(mobileContract).toContain('inline-size: 54px !important;');
  });

  it('keeps the home command row readable without adding a second palette', () => {
    expect(mobileHomeContract).toContain('grid-template-columns: var(--sc-size-target-touch) var(--sc-size-target-touch) minmax(0, 1fr)');
    expect(mobileHomeContract).toContain('var(--sc-safe-left');
    expect(mobileHomeContract).not.toMatch(/#[0-9a-f]{3,8}\b/i);
  });

  it('gives every workspace panel the same mobile sheet anatomy', () => {
    expect(mobileContract).toContain('Unified mobile surface anatomy');
    expect(mobileContract).toContain('.topbar-project-panel');
    expect(mobileContract).toContain('.topbar-analysis-panel');
    expect(mobileContract).toContain('.topbar-utilities-panel');
    expect(mobileContract).toContain('.inspector-scroll');
    expect(mobileContract).toContain('.results-body');
    expect(mobileContract).toContain('.datasheet-context__body');
    expect(mobileContract).toContain('.sc-modal-surface__body');
    expect(mobileContract).toContain('overscroll-behavior: contain');
  });

  it('keeps result, inspector and datasheet cards readable at phone widths', () => {
    expect(mobileContract).toContain('.result-summary-actions');
    expect(mobileContract).toContain('.result-extreme-grid.is-mobile-rail');
    expect(mobileContract).toContain('.numeric-quality-metrics');
    expect(mobileContract).toContain('.inspector-property-group');
    expect(mobileContract).toContain('.datasheet-field-grid');
    expect(mobileContract).toContain('overflow-wrap: anywhere');
  });

  it('applies the shared card rhythm to home, settings and creation dialogs', () => {
    expect(mobileHomeContract).toContain('.welcome-launcher-card');
    expect(mobileHomeContract).toContain('.welcome-import-card');
    expect(mobileHomeContract).toContain('.sc-home-template-grid > button');
    expect(mobileHomeContract).toContain('.new-exercise-dialog');
    expect(mobileHomeContract).toContain('.sc-home-settings-panel');
    expect(mobileHomeContract).not.toMatch(/#[0-9a-f]{3,8}\b/i);
  });

  it('keeps compact workspace controls inside their available track', () => {
    const integrityStart = mobileContract.indexOf('Mobile control integrity');
    const integrityCss = mobileContract.slice(integrityStart);

    expect(integrityStart).toBeGreaterThanOrEqual(0);
    expect(integrityCss).toMatch(/@media \(max-width: 700px\)/);
    expect(integrityCss).toMatch(/box-sizing:\s*border-box/);
    expect(integrityCss).toMatch(/max-inline-size:\s*100%/);
    expect(integrityCss).toMatch(/\.mobile-dock-tab[\s\S]*?flex:\s*1 1 0/);
    expect(integrityCss).toMatch(/\.mobile-dock-tab__label[\s\S]*?text-overflow:\s*ellipsis/);
  });

  it('stacks Home primary actions without intrinsic-width drift', () => {
    const integrityStart = mobileHomeContract.indexOf('Home mobile control integrity');
    const integrityCss = mobileHomeContract.slice(integrityStart);

    expect(integrityStart).toBeGreaterThanOrEqual(0);
    expect(integrityCss).toMatch(/\.sc-home-primary-buttons\s*{[\s\S]*?display:\s*grid;/);
    expect(integrityCss).toMatch(/grid-template-columns:\s*minmax\(0, 1fr\)/);
    expect(integrityCss).toMatch(/\.sc-home-primary-buttons\s*>\s*button[\s\S]*?inline-size:\s*100%/);
    expect(integrityCss).toMatch(/\.sc-home-primary-buttons\s*>\s*button[\s\S]*?min-inline-size:\s*0/);
  });

  it('keeps the named mobile analysis action inside the topbar track', () => {
    const integrityStart = topbarContract.indexOf('Mobile topbar control integrity');
    const integrityCss = topbarContract.slice(integrityStart);

    expect(integrityStart).toBeGreaterThanOrEqual(0);
    expect(integrityCss).toMatch(/@media \(min-width:\s*360px\) and \(max-width:\s*700px\)/);
    expect(integrityCss).toMatch(/\.analyze-button[\s\S]*?width:\s*auto\s*!important/);
    expect(integrityCss).toMatch(/\.analyze-button[\s\S]*?min-width:\s*94px\s*!important/);
    expect(integrityCss).toMatch(/\.analyze-button\s*>\s*\.sc-button__label[\s\S]*?position:\s*static\s*!important/);
  });

  it('hides the analysis label when the compact topbar has no label lane', () => {
    const integrityStart = topbarContract.indexOf('Mobile topbar control integrity');
    const integrityCss = topbarContract.slice(integrityStart);

    expect(integrityCss).toMatch(/@media \(max-width:\s*359px\)/);
    expect(integrityCss).toMatch(/\.analyze-button\s*>\s*\.sc-button__label[\s\S]*?position:\s*absolute\s*!important/);
    expect(integrityCss).toMatch(/\.analyze-button\s*>\s*\.sc-button__label[\s\S]*?clip-path:\s*inset\(50%\)\s*!important/);
  });
});
