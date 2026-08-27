/// <reference types="node" />

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const workspaceCss = readFileSync(new URL('../workspace/phase1.css', import.meta.url), 'utf8');
const resultsCss = readFileSync(new URL('./results.css', import.meta.url), 'utf8');

describe('Clay Results Phase 3 presentation contract', () => {
  const phase = workspaceCss.slice(workspaceCss.indexOf('CLAY RESULTS · FASE 3'));

  it('maps Results depth through the existing X2, M1 and K0 presentations', () => {
    expect(phase).toMatch(/data-shell-class='X2'[\s\S]*results-panel\[data-surface-presentation='dock'\][\s\S]*var\(--sc-shadow-clay-md\)/);
    expect(phase).toMatch(/data-shell-class='M1'[\s\S]*results-panel\[data-surface-presentation='inset'\][\s\S]*var\(--sc-shadow-clay-lg\)/);
    expect(phase).toMatch(/data-shell-class='K0'[\s\S]*results-panel\[data-surface-presentation='sheet'\][\s\S]*var\(--sc-shadow-sheet\)/);
  });

  it('makes Result controls tactile while keeping numerical surfaces technically flat', () => {
    expect(phase).toMatch(/\.result-tabs button\[aria-selected='true'\][\s\S]*var\(--sc-shadow-clay-pressed\)/);
    expect(phase).toMatch(/\.result-tabs button:active:not\(:disabled\)[\s\S]*var\(--sc-clay-press-transform\)/);
    expect(phase).toMatch(/\.diagram-chart,[\s\S]*\.results-table,[\s\S]*\.diagram-cursor-readout[\s\S]*box-shadow:none/);
  });

  it('removes decorative deformation glow and respects reduced motion', () => {
    expect(phase).toMatch(/\.deformed-layer path[\s\S]*filter:none/);
    expect(phase).toMatch(/prefers-reduced-motion:reduce[\s\S]*\.results-panel[\s\S]*transform:none/);
    expect(phase).not.toContain('backdrop-filter');
    expect(phase).not.toContain('drop-shadow');
  });

  it('keeps K0 result actions within the touch target contract', () => {
    expect(phase).toMatch(/data-shell-class='K0'[\s\S]*\.results-mobile-toggle,[\s\S]*\.results-mobile-focus[\s\S]*min-height:44px/);
    expect(resultsCss).toContain('.results-panel');
  });
});
