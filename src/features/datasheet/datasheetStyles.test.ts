/// <reference types="node" />

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/**
 * Contrato visual del datasheet.
 *
 * Un `var(--sc-…)` mal escrito no rompe la compilación: deja la propiedad
 * inválida y el componente sin estilo. Estas comprobaciones fijan que la hoja
 * usa el sistema existente en vez de introducir un segundo lenguaje visual, y
 * que las dos decisiones de diseño que importan siguen ahí:
 *
 * - la tabla es **plana**, sin sombra clay por fila;
 * - el foco y la selección se dibujan con señales **distintas**.
 */

const css = readFileSync(new URL('./datasheet.css', import.meta.url), 'utf8');
const tokensCss = readFileSync(new URL('../../design-system/tokens.css', import.meta.url), 'utf8');

const declaredTokens = new Set([...tokensCss.matchAll(/(--[\w-]+)\s*:/g)].map((match) => match[1]));
const localTokens = new Set([...css.matchAll(/(--[\w-]+)\s*:/g)].map((match) => match[1]));
const referencedTokens = [...css.matchAll(/var\(\s*(--sc-[\w-]+)/g)]
  .map((match) => match[1])
  .filter((name) => !localTokens.has(name));

const withoutComments = css.replace(/\/\*[\s\S]*?\*\//g, '');

/** Bloque completo de un selector, para poder afirmar sobre sus declaraciones. */
const ruleFor = (selector: string): string => {
  const index = withoutComments.indexOf(selector);
  if (index < 0) return '';
  const open = withoutComments.indexOf('{', index);
  const close = withoutComments.indexOf('}', open);
  return withoutComments.slice(open + 1, close);
};

describe('datasheet styles', () => {
  it('resolves every design token it references', () => {
    const missing = [...new Set(referencedTokens)].filter((name) => !declaredTokens.has(name));
    expect(missing).toEqual([]);
  });

  it('stays on semantic tokens instead of the primitive palette', () => {
    expect(css).not.toMatch(/var\(--sc-(?:white|black|green-\d+|blue-\d+|violet-\d+|cyan-\d+|red-\d+|amber-\d+)\)/);
  });

  it('never hard-codes a colour outside the token system', () => {
    expect(withoutComments).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(withoutComments).not.toMatch(/\b(?:rgba?|hsla?)\(/);
  });

  it('keeps the grid flat: no clay elevation on rows or cells', () => {
    for (const selector of ['.datasheet-grid tbody th', '.datasheet-grid-scroll', '.datasheet-grid thead th']) {
      expect(ruleFor(selector), selector).not.toMatch(/--sc-shadow-clay-(?:xs|sm|md|lg|floating)/);
    }
  });

  it('draws focus and selection with different signals', () => {
    // La selección es fondo; el foco es anillo. Si compartieran señal, recorrer
    // la tabla parecería ir cambiando el objeto seleccionado en el lienzo.
    const selected = ruleFor(".datasheet-grid tbody tr[data-selected='true'] th");
    expect(selected).toMatch(/background:\s*var\(--sc-color-selection\)/);
    expect(selected).not.toMatch(/outline/);

    const focused = ruleFor('.datasheet-grid tbody th:focus-visible');
    expect(focused).toMatch(/outline:/);
    expect(focused).not.toMatch(/background/);
  });

  it('distinguishes pending, focus and selection with three different signals', () => {
    // Las tres pueden coincidir en la misma celda. Si compartieran señal no
    // habría forma de saber si una celda está seleccionada o sin aplicar.
    const pending = ruleFor(".datasheet-grid tbody td[data-pending='true']");
    expect(pending).toMatch(/box-shadow:\s*inset/);
    expect(pending).not.toMatch(/outline:/);
    expect(pending).not.toMatch(/background/);
  });

  it('keeps the cell editor flat, like the grid it sits in', () => {
    expect(ruleFor('.datasheet-cell-editor')).not.toMatch(/--sc-shadow-clay-(?:xs|sm|md|lg|floating)/);
  });

  it('styles every editing surface it renders', () => {
    for (const selector of [
      '.datasheet-cell-editor',
      '.datasheet-draft-bar',
      '.datasheet-review',
      '.datasheet-review__actions',
      '.datasheet-node-preview__ghost',
      '.datasheet-load-preview',
      '.datasheet-mode',
      '.datasheet-checks',
    ]) {
      expect(ruleFor(selector), selector).not.toBe('');
    }
  });

  it('declares touch targets with the 44 px token on small viewports', () => {
    expect(css).toMatch(/min-height:\s*var\(--sc-control-height-touch\)/);
  });

  it('honours the reduced-motion preference', () => {
    expect(css).toMatch(/@media\s*\(prefers-reduced-motion:\s*reduce\)/);
  });
});
