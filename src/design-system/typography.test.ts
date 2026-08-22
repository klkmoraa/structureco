/// <reference types="node" />

import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const fontsCss = readFileSync(new URL('./fonts.css', import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const tokensCss = readFileSync(new URL('./tokens.css', import.meta.url), 'utf8').replace(/\r\n/g, '\n');

describe('Total-redesign typography', () => {
  it('self-hosts the interface and technical variable families', () => {
    expect(fontsCss).toContain("font-family: 'Instrument Sans'");
    expect(fontsCss).toContain("url('/fonts/instrument-sans-variable.woff2')");
    expect(fontsCss).toContain("font-family: 'Geist Mono'");
    expect(fontsCss).toContain("url('/fonts/geist-mono-variable.woff2')");
    expect(fontsCss.match(/font-display:\s*swap/g)).toHaveLength(2);
    expect(fontsCss).not.toMatch(/https?:\/\//);
  });

  it('assigns one family to each semantic reading role', () => {
    expect(tokensCss).toMatch(/--sc-font-display:\s*"Instrument Sans", ui-sans-serif, system-ui, sans-serif;/);
    expect(tokensCss).toMatch(/--sc-font-ui:\s*"Instrument Sans", ui-sans-serif, system-ui, sans-serif;/);
    expect(tokensCss).toMatch(/--sc-font-mono:\s*"Geist Mono", ui-monospace, "Cascadia Mono", monospace;/);
    for (const superseded of ['IBM Plex', 'DM Serif Display', 'Manrope', 'JetBrains Mono']) {
      expect(fontsCss).not.toContain(superseded);
      expect(tokensCss).not.toContain(`"${superseded}`);
    }
  });

  it('does not ship the superseded IBM Plex webfont bundle', () => {
    const legacy = [
      'ibm-plex-sans-400.woff2', 'ibm-plex-sans-500.woff2', 'ibm-plex-sans-600.woff2',
      'ibm-plex-sans-700.woff2', 'ibm-plex-mono-400.woff2', 'ibm-plex-mono-500.woff2',
    ];
    const present = legacy.filter((file) => existsSync(new URL(`../../public/fonts/${file}`, import.meta.url)));
    expect(present).toEqual([]);
  });
});
