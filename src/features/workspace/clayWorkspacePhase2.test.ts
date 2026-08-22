/// <reference types="node" />

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const css = readFileSync(new URL('./phase1.css', import.meta.url), 'utf8');
const globalCss = readFileSync(new URL('../../styles.css', import.meta.url), 'utf8');

describe('Clay Workspace Phase 2 presentation contract', () => {
  it('binds the three real experiences to the existing shell classes', () => {
    expect(css).toContain(".app-shell[data-shell-class='X2'] .tool-rail");
    expect(css).toContain(".app-shell[data-shell-class='M1'] .tool-rail");
    expect(css).toContain(".app-shell[data-shell-class='K0'] .mobile-tool-dock");
    expect(css).toContain(".app-shell[data-shell-class='K0'] .center-stage");
  });

  it('gives rail tools physical raised, hover and pressed states', () => {
    expect(css).toMatch(/\.app-shell \.tool-rail \.tool-button \{[^}]*var\(--sc-shadow-clay-xs\)/s);
    expect(css).toMatch(/\.app-shell \.tool-rail \.tool-button:hover:not\(:disabled\) \{[^}]*translateY\(-2px\)/s);
    expect(css).toMatch(/\.app-shell \.tool-rail \.tool-button(?::is\([^}]+\)|\.active)[^{]*\{[^}]*var\(--sc-shadow-clay-pressed\)/s);
  });

  it('maps Inspector dock, inset and sheet to distinct physical depth', () => {
    expect(css).toMatch(/inspector-panel\[data-surface-presentation='dock'\][^{]*\{[^}]*var\(--sc-shadow-clay-md\)/s);
    expect(css).toMatch(/inspector-panel\[data-surface-presentation='inset'\][^{]*\{[^}]*var\(--sc-shadow-clay-lg\)/s);
    expect(css).toMatch(/inspector-panel\[data-surface-presentation='sheet'\][^{]*\{[^}]*var\(--sc-shadow-sheet\)/s);
  });

  it('keeps the new workspace material matte and removes physical travel for reduced motion', () => {
    const phase = css.slice(css.indexOf('CLAY WORKSPACE · FASE 2'));
    expect(phase).not.toContain('backdrop-filter');
    expect(phase).not.toContain('linear-gradient');
    expect(phase).toMatch(/prefers-reduced-motion:\s*reduce[\s\S]*\.app-shell \.tool-rail \.tool-button[\s\S]*transform:none/);
  });

  it('keeps ephemeral canvas feedback from blocking consecutive structural edits', () => {
    expect(globalCss).toMatch(/\.canvas-feedback\s*\{[^}]*pointer-events:\s*none/s);
  });
});
