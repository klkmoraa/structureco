import type { SectionShapeType } from '../../data/standardSections';
import type { TranslationKey } from '../../i18n/catalogs';

export const SHAPE_ORDER: readonly SectionShapeType[] = ['I', 'HSS_RECT', 'HSS_ROUND', 'C', 'L', 'RECT'];

export const SHAPE_LABEL_KEYS: Record<SectionShapeType, TranslationKey> = {
  I: 'inspector.sectionShapeI',
  HSS_RECT: 'inspector.sectionShapeHssRect',
  HSS_ROUND: 'inspector.sectionShapeHssRound',
  C: 'inspector.sectionShapeC',
  L: 'inspector.sectionShapeL',
  RECT: 'inspector.sectionShapeRect',
};
