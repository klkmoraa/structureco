import { esWorkspace } from './catalogs/es-workspace';
import { esAnalysis } from './catalogs/es-analysis';
import { esModeling } from './catalogs/es-modeling';
import { esResults } from './catalogs/es-results';
import { esInterchange } from './catalogs/es-interchange';
import { enWorkspace } from './catalogs/en-workspace';
import { enAnalysis } from './catalogs/en-analysis';
import { enModeling } from './catalogs/en-modeling';
import { enResults } from './catalogs/en-results';
import { enInterchange } from './catalogs/en-interchange';

export const es = {
  ...esWorkspace,
  ...esAnalysis,
  ...esModeling,
  ...esResults,
  ...esInterchange,
} as const;

export type TranslationKey = keyof typeof es;
export type Language = 'es' | 'en';
export type Catalog = Record<TranslationKey, string>;

export const en: Catalog = {
  ...enWorkspace,
  ...enAnalysis,
  ...enModeling,
  ...enResults,
  ...enInterchange,
};

export const catalogs: Record<Language, Catalog> = { es, en };

export const translate = (
  language: Language,
  key: TranslationKey,
  variables?: Record<string, string | number>,
): string => {
  const template = catalogs[language][key] ?? es[key];
  if (!variables) return template;
  return template.replace(/\{([A-Za-z0-9_]+)\}/g, (match, name: string) =>
    Object.hasOwn(variables, name) ? String(variables[name]) : match);
};
