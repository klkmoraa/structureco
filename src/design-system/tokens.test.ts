/// <reference types="node" />

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/** The block matchers below are line-oriented; CRLF checkouts must not disable them. */
const readCss = (url: URL) => readFileSync(url, 'utf8').replace(/\r\n/g, '\n');

const tokensCss = readCss(new URL('./tokens.css', import.meta.url));
const stylesCss = readCss(new URL('../styles.css', import.meta.url));

const blockFor = (pattern: RegExp) => {
  const match = tokensCss.match(pattern);
  if (!match?.[1]) throw new Error(`Missing token block: ${pattern}`);
  return match[1];
};

const parseDeclarations = (block: string) => {
  const declarations = new Map<string, string>();
  const names: string[] = [];
  for (const match of block.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) {
    names.push(match[1]);
    declarations.set(match[1], match[2].trim());
  }
  return { declarations, names };
};

const rootBlock = blockFor(/:root\s*\{([\s\S]*?)\n\}/);
const darkBlock = blockFor(/:root\[data-theme='dark'\]\s*\{([\s\S]*?)\n\}/);
const reducedMotionBlock = blockFor(/@media \(prefers-reduced-motion: reduce\)\s*\{[\s\S]*?:root\s*\{([\s\S]*?)\n\s*\}\n\}/);

const rootTokens = parseDeclarations(rootBlock);
const darkTokens = parseDeclarations(darkBlock);
const reducedMotionTokens = parseDeclarations(reducedMotionBlock);

const lightTheme = new Map(rootTokens.declarations);
const darkTheme = new Map(rootTokens.declarations);
for (const [name, value] of darkTokens.declarations) darkTheme.set(name, value);

const resolveHex = (name: string, theme: Map<string, string>, seen = new Set<string>()): string => {
  if (seen.has(name)) throw new Error(`Circular token reference: ${name}`);
  seen.add(name);
  const value = theme.get(name);
  if (!value) throw new Error(`Unknown token: ${name}`);
  const reference = value.match(/^var\((--[\w-]+)\)$/);
  if (reference) return resolveHex(reference[1], theme, seen);
  if (!/^#[0-9a-f]{6}$/i.test(value)) throw new Error(`${name} does not resolve to a six-digit hex color: ${value}`);
  return value;
};

const luminance = (hex: string) => {
  const channels = [1, 3, 5].map((offset) => Number.parseInt(hex.slice(offset, offset + 2), 16) / 255);
  const linear = channels.map((channel) => channel <= 0.04045
    ? channel / 12.92
    : ((channel + 0.055) / 1.055) ** 2.4);
  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
};

const contrast = (foreground: string, background: string, theme: Map<string, string>) => {
  const a = luminance(resolveHex(foreground, theme));
  const b = luminance(resolveHex(background, theme));
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
};

describe('Phase 4 design-token contract', () => {
  it('declares every required foundation token once per theme block', () => {
    const required = [
      '--sc-color-bg-app',
      '--sc-color-bg-canvas',
      '--sc-color-surface-1',
      '--sc-color-text-primary',
      '--sc-color-action-primary',
      '--sc-color-focus',
      '--sc-color-selection-stroke',
      '--sc-color-canvas-grid',
      '--sc-color-technical-load',
      '--sc-color-technical-axial',
      '--sc-color-technical-shear',
      '--sc-color-technical-moment',
      '--sc-color-technical-deformed',
      '--sc-color-technical-reaction',
      '--sc-font-ui',
      '--sc-font-mono',
      '--sc-numeric-variant',
      '--sc-size-target-touch',
      '--sc-focus-ring-width',
      '--sc-motion-control',
      '--sc-motion-loading',
      '--sc-transition-control',
      '--sc-z-modal',
    ];

    expect(new Set(rootTokens.names).size).toBe(rootTokens.names.length);
    expect(new Set(darkTokens.names).size).toBe(darkTokens.names.length);
    for (const token of required) expect(rootTokens.declarations.has(token), token).toBe(true);
  });

  it('defines Dark as an explicit visual theme rather than an inversion', () => {
    const explicitDarkRoles = [
      '--sc-color-bg-app',
      '--sc-color-bg-canvas',
      '--sc-color-surface-1',
      '--sc-color-surface-2',
      '--sc-color-text-primary',
      '--sc-color-text-secondary',
      '--sc-color-border',
      '--sc-color-focus',
      '--sc-color-selection-stroke',
      '--sc-color-canvas-grid',
      '--sc-color-canvas-member',
      '--sc-color-overlay-strong',
      '--sc-color-technical-load',
      '--sc-color-technical-moment',
      '--sc-shadow-modal',
    ];

    for (const token of explicitDarkRoles) expect(darkTokens.declarations.has(token), token).toBe(true);
    expect(darkBlock).not.toMatch(/invert\(|filter\s*:/);
  });

  it('keeps compatibility aliases attached to semantic roles', () => {
    const aliases = new Map([
      ['--app-bg', '--sc-color-bg-app'],
      ['--surface', '--sc-color-surface-1'],
      ['--canvas-bg', '--sc-color-bg-canvas'],
      ['--text', '--sc-color-text-primary'],
      ['--focus', '--sc-color-focus'],
      ['--selection', '--sc-color-selection-stroke'],
      ['--grid', '--sc-color-canvas-grid'],
      ['--member', '--sc-color-canvas-member'],
      ['--node-fill', '--sc-color-canvas-node-fill'],
      ['--force', '--sc-color-technical-load'],
      ['--moment', '--sc-color-technical-moment'],
    ]);

    for (const [alias, semantic] of aliases) {
      expect(rootTokens.declarations.get(alias)).toBe(`var(${semantic})`);
    }
  });

  it('keeps tool identity colors aligned with their canvas roles', () => {
    const toolRoles = new Map([
      ['--sc-color-tool-structure', '--sc-color-text-primary'],
      ['--sc-color-tool-point-load', '--sc-color-technical-load'],
      ['--sc-color-tool-distributed-load', '--sc-color-technical-shear'],
      ['--sc-color-tool-moment', '--sc-color-technical-moment'],
      ['--sc-color-tool-dimension', '--sc-color-technical-dimension'],
      ['--sc-color-tool-cut', '--sc-color-technical-axis'],
      ['--sc-color-tool-destructive', '--sc-color-state-error'],
    ]);

    for (const [tool, role] of toolRoles) {
      expect(rootTokens.declarations.get(tool)).toBe(`var(${role})`);
    }
  });

  it.each([
    ['Light', lightTheme],
    ['Dark', darkTheme],
  ] as const)('%s meets interface and technical contrast floors', (_label, theme) => {
    const textPairs = [
      ['--sc-color-text-primary', '--sc-color-surface-1', 4.5],
      ['--sc-color-text-secondary', '--sc-color-surface-1', 4.5],
      ['--sc-color-action-foreground', '--sc-color-action-primary', 4.5],
      ['--sc-color-focus', '--sc-color-surface-1', 3],
      ['--sc-color-state-warning-foreground', '--sc-color-surface-1', 4.5],
      ['--sc-color-state-error-foreground', '--sc-color-surface-1', 4.5],
    ] as const;
    const technicalRoles = [
      '--sc-color-technical-load',
      '--sc-color-technical-axial',
      '--sc-color-technical-shear',
      '--sc-color-technical-moment',
      '--sc-color-technical-deformed',
      '--sc-color-technical-reaction',
      '--sc-color-technical-dimension',
      '--sc-color-technical-axis',
    ];

    for (const [foreground, background, minimum] of textPairs) {
      expect(contrast(foreground, background, theme), `${foreground} on ${background}`).toBeGreaterThanOrEqual(minimum);
    }
    for (const role of technicalRoles) {
      expect(contrast(role, '--sc-color-bg-canvas', theme), role).toBeGreaterThanOrEqual(3);
    }
  });

  it('neutralizes all shared duration tokens when reduced motion is requested', () => {
    const durations = [
      '--sc-motion-press',
      '--sc-motion-fast',
      '--sc-motion-control',
      '--sc-motion-standard',
      '--sc-motion-slow',
      '--sc-motion-loading',
    ];
    for (const token of durations) expect(reducedMotionTokens.declarations.get(token)).toBe('0.001ms');
  });

  it('does not consume primitive color tokens from component CSS', () => {
    expect(stylesCss).not.toMatch(/var\(--sc-(?:white|black|green-\d+|blue-\d+|violet-\d+|orange-\d+|red-\d+|amber-\d+)\)/);
  });
});
