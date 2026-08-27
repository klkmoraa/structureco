/// <reference types="node" />

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const styles = readFileSync(new URL('../../styles.css', import.meta.url), 'utf8');

describe('canvas evidence rail styles', () => {
  it('preserves the shared touch target on coarse pointers', () => {
    const coarsePointerRules = styles.slice(styles.indexOf('/* El riel compacto no debe encoger'));
    const blockEnd = coarsePointerRules.indexOf('/* --- Presets de capas');

    expect(coarsePointerRules.slice(0, blockEnd)).toMatch(
      /@media \(pointer:coarse\)[\s\S]*?\.canvas-evidence-layer\s*\{[\s\S]*?min-height:var\(--sc-control-height-touch\)/,
    );
  });
});
