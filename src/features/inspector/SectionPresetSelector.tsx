import { standardSections, type SectionShapeType, type StandardSection } from '../../data/standardSections';
import { toDisplay, unitLabel } from '../../engine/units';
import type { TranslationKey } from '../../i18n/catalogs';
import { useI18n } from '../../i18n/useI18n';
import type { UnitSystemId } from '../../types';
import { formatInspectorValue } from './numericFormatting';

const SHAPE_ORDER: readonly SectionShapeType[] = ['I', 'HSS_RECT', 'HSS_ROUND', 'C', 'L', 'RECT'];

const SHAPE_LABEL_KEYS: Record<SectionShapeType, TranslationKey> = {
  I: 'inspector.sectionShapeI',
  HSS_RECT: 'inspector.sectionShapeHssRect',
  HSS_ROUND: 'inspector.sectionShapeHssRound',
  C: 'inspector.sectionShapeC',
  L: 'inspector.sectionShapeL',
  RECT: 'inspector.sectionShapeRect',
};

/**
 * Selecciona un perfil comercial del catálogo estándar y aplica A e I al miembro
 * activo. Es un control de acción, no de estado: no persiste el preset elegido, así
 * el usuario puede seguir editando A/I libremente sin que el selector los pisotee.
 */
export const SectionPresetSelector = ({
  units,
  disabled,
  onSelect,
}: {
  units: UnitSystemId;
  disabled?: boolean;
  onSelect: (section: StandardSection) => void;
}) => {
  const { t } = useI18n();
  return (
    <label className={`select-field${disabled ? ' is-disabled' : ''}`}>
      <span>{t('inspector.sectionPreset')}<small>{t('inspector.sectionPresetHint')}</small></span>
      <select
        value=""
        disabled={disabled}
        onChange={(event) => {
          const section = standardSections.find((item) => item.id === event.target.value);
          if (section) onSelect(section);
        }}
      >
        <option value="" disabled>{t('inspector.sectionPresetPlaceholder')}</option>
        {SHAPE_ORDER.map((shapeType) => {
          const items = standardSections.filter((section) => section.shapeType === shapeType);
          if (items.length === 0) return null;
          return (
            <optgroup key={shapeType} label={t(SHAPE_LABEL_KEYS[shapeType])}>
              {items.map((section) => (
                <option key={section.id} value={section.id}>
                  {section.name} · A {formatInspectorValue(toDisplay(section.area, units, 'area'), unitLabel(units, 'area'))}
                </option>
              ))}
            </optgroup>
          );
        })}
      </select>
    </label>
  );
};
