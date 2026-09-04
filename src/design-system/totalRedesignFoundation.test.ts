/// <reference types="node" />

import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const readText = (url: URL) => readFileSync(url, 'utf8').replace(/\r\n/g, '\n');
const tokensCss = readText(new URL('./tokens.css', import.meta.url));
const fontsCss = readText(new URL('./fonts.css', import.meta.url));

const blockFor = (pattern: RegExp) => {
  const match = tokensCss.match(pattern);
  if (!match?.[1]) throw new Error(`Missing token block: ${pattern}`);
  return match[1];
};

const parseDeclarations = (block: string) => new Map(
  [...block.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)]
    .map((match) => [match[1], match[2].trim()] as const),
);

const root = parseDeclarations(blockFor(/:root\s*\{([\s\S]*?)\n\}/));
const dark = parseDeclarations(blockFor(/:root\[data-theme='dark'\]\s*\{([\s\S]*?)\n\}/));
const reduced = parseDeclarations(blockFor(/@media \(prefers-reduced-motion: reduce\)\s*\{[\s\S]*?:root\s*\{([\s\S]*?)\n\s*\}\n\}/));

const expectWoff2 = (relativePath: string) => {
  const url = new URL(`../../public/fonts/${relativePath}`, import.meta.url);
  expect(existsSync(url), relativePath).toBe(true);
  if (existsSync(url)) expect(readFileSync(url).subarray(0, 4).toString('ascii')).toBe('wOF2');
};

describe('StructureCo total-redesign foundation', () => {
  it('uses the exact warm Day and deep-petroleum Night neutrals', () => {
    expect(root.get('--sc-color-bg-app')).toBe('#f3eee4');
    expect(root.get('--sc-color-bg-canvas')).toBe('#fbf8f2');
    expect(root.get('--sc-color-surface-1')).toBe('#f7f1e8');
    expect(root.get('--sc-color-text-primary')).toBe('#102b2d');

    expect(dark.get('--sc-color-bg-app')).toBe('#07161b');
    expect(dark.get('--sc-color-bg-canvas')).toBe('#0b1d23');
    expect(dark.get('--sc-color-surface-1')).toBe('#112830');
    expect(dark.get('--sc-color-text-primary')).toBe('#f3f0e8');
  });

  it('keeps the exact technical palette in one theme-independent declaration', () => {
    const palette = new Map([
      ['--sc-color-load-point', '#2f73c8'],
      ['--sc-color-technical-axial', '#2f73c8'],
      ['--sc-color-technical-shear', '#168a6c'],
      ['--sc-color-load-distributed', '#65a323'],
      ['--sc-color-technical-moment', '#d85c4a'],
      ['--sc-color-load-moment-applied', '#c65f86'],
      ['--sc-color-technical-deformed', '#7657d5'],
      ['--sc-color-selection-stroke', '#7657d5'],
      ['--sc-color-influence-line', '#b26b91'],
    ]);

    for (const [token, value] of palette) {
      expect(root.get(token), token).toBe(value);
      expect(dark.has(token), `${token} must not drift in Night`).toBe(false);
    }
  });

  it('uses the exact green primary with a white label', () => {
    expect(root.get('--sc-color-action-primary')).toBe('#007d61');
    expect(root.get('--sc-color-action-foreground')).toBe('var(--sc-white)');
    expect(dark.has('--sc-color-action-primary')).toBe(false);
    expect(dark.has('--sc-color-action-foreground')).toBe(false);
  });

  it('defines base, inset, raised and floating as bordered matte contact depths', () => {
    const levels = ['base', 'inset', 'raised', 'floating'];
    for (const level of levels) {
      expect(root.has(`--sc-depth-${level}-border`), `${level} border`).toBe(true);
      expect(root.has(`--sc-depth-${level}-shadow`), `${level} shadow`).toBe(true);
    }
    expect(root.get('--sc-depth-base-shadow')).toBe('none');
    expect(root.get('--sc-depth-inset-shadow')).toContain('inset');
    expect(root.get('--sc-depth-raised-shadow')).not.toContain('inset-only');
    expect(root.get('--sc-depth-floating-shadow')).not.toBe(root.get('--sc-depth-raised-shadow'));

    for (const level of ['raised', 'floating']) {
      const value = root.get(`--sc-depth-${level}-shadow`) ?? '';
      const blurs = [...value.matchAll(/-?\d+(?:\.\d+)?px\s+-?\d+(?:\.\d+)?px\s+(\d+(?:\.\d+)?)px/g)]
        .map((match) => Number.parseFloat(match[1]));
      expect(Math.max(...blurs), `${level} contact blur`).toBeLessThanOrEqual(10);
    }

    expect(root.get('--sc-glow-accent')).toBe('0 0 transparent');
    expect(root.get('--sc-glow-aula')).toBe('0 0 transparent');
    expect(root.get('--sc-gradient-clay-action')).not.toMatch(/gradient\(/);
  });

  it('exposes translation, morph and dock motion controls and neutralizes them for reduced motion', () => {
    expect(root.get('--sc-motion-distance-factor')).toBe('1');
    expect(root.get('--sc-motion-morph-duration')).toBe('var(--sc-motion-standard)');
    expect(root.get('--sc-motion-dock-scale')).toBe('1.16');
    expect(reduced.get('--sc-motion-distance-factor')).toBe('0');
    expect(reduced.get('--sc-motion-morph-duration')).toBe('0.001ms');
    expect(reduced.get('--sc-motion-dock-scale')).toBe('1');
  });

  it('self-hosts Instrument Sans Variable and Geist Mono with bundled licenses', () => {
    expect(fontsCss).toContain("font-family: 'Instrument Sans'");
    expect(fontsCss).toContain("url('/fonts/instrument-sans-variable.woff2')");
    expect(fontsCss).toContain("font-family: 'Geist Mono'");
    expect(fontsCss).toContain("url('/fonts/geist-mono-variable.woff2')");
    expect(fontsCss).not.toMatch(/https?:\/\//);
    // Cuatro caras: recta e itálica de Instrument Sans (partida en dos
    // subconjuntos) más Geist Mono.
    expect(fontsCss.match(/font-display:\s*swap/g)).toHaveLength(4);
    expect(root.get('--sc-font-display')).toBe('"Instrument Sans", "Instrument Sans Fallback", ui-sans-serif, system-ui, sans-serif');
    expect(root.get('--sc-font-ui')).toBe('"Instrument Sans", "Instrument Sans Fallback", ui-sans-serif, system-ui, sans-serif');
    expect(root.get('--sc-font-mono')).toBe('"Geist Mono", "Geist Mono Fallback", ui-monospace, "Cascadia Mono", monospace');

    expectWoff2('instrument-sans-variable.woff2');
    expectWoff2('geist-mono-variable.woff2');
    for (const license of ['OFL-Instrument-Sans.txt', 'OFL-Geist.txt']) {
      const url = new URL(`../../public/fonts/${license}`, import.meta.url);
      expect(existsSync(url), license).toBe(true);
      if (existsSync(url)) expect(readText(url)).toContain('SIL OPEN FONT LICENSE Version 1.1');
    }
  });
});
