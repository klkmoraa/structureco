/// <reference types="node" />

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const styles = readFileSync(new URL('./phase2.css', import.meta.url), 'utf8');

describe('canvas evidence rail styles', () => {
  it('preserves the shared touch target on any coarse pointer', () => {
    const coarsePointerRules = styles.slice(styles.indexOf('/* El riel compacto no debe encoger'));
    const blockEnd = coarsePointerRules.indexOf('/* --- Presets de capas');

    expect(coarsePointerRules.slice(0, blockEnd)).toMatch(
      /@media \(any-pointer:coarse\)[\s\S]*?\.canvas-evidence-layer\s*\{[\s\S]*?min-height:var\(--sc-control-height-touch\)/,
    );
    expect(styles).toMatch(
      /\.canvas-evidence-rail\s*\{[\s\S]*?bottom:12px;[\s\S]*?left:50%;[\s\S]*?transform:translateX\(-50%\)/,
    );
    expect(styles).toMatch(
      /\.canvas-evidence-layer\[aria-pressed='true'\]\s*\{[\s\S]*?background:color-mix/,
    );
    expect(styles).toMatch(
      /@media \(max-width:700px\) and \(any-pointer:coarse\)[\s\S]*?\.canvas-host:has\(\.canvas-evidence-rail\) \.canvas-result-legend\s*\{[\s\S]*?top:68px/,
    );
  });
});
