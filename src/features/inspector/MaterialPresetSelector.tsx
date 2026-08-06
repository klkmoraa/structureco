import { standardMaterials, type MaterialCategory, type StandardMaterial } from '../../data/standardMaterials';
import { toDisplay, unitLabel } from '../../engine/units';
import type { TranslationKey } from '../../i18n/catalogs';
import { useI18n } from '../../i18n/useI18n';
import type { UnitSystemId } from '../../types';
import { formatInspectorValue } from './numericFormatting';

const CATEGORY_ORDER: readonly MaterialCategory[] = ['STEEL', 'CONCRETE', 'TIMBER', 'ALUMINUM'];

const CATEGORY_LABEL_KEYS: Record<MaterialCategory, TranslationKey> = {
  STEEL: 'inspector.materialCategorySteel',
  CONCRETE: 'inspector.materialCategoryConcrete',
  TIMBER: 'inspector.materialCategoryTimber',
  ALUMINUM: 'inspector.materialCategoryAluminum',
};

/**
 * Selecciona un material del catálogo estándar y aplica E, G y densidad al miembro
 * activo. Es un control de acción, no de estado: no persiste el preset elegido, así
 * el usuario puede seguir editando E/A/I/G libremente sin que el selector los pisotee.
 */
export const MaterialPresetSelector = ({
  units,
  disabled,
  onSelect,
}: {
  units: UnitSystemId;
  disabled?: boolean;
  onSelect: (material: StandardMaterial) => void;
}) => {
  const { t } = useI18n();
  return (
    <label className={`select-field${disabled ? ' is-disabled' : ''}`}>
      <span>{t('inspector.materialPreset')}<small>{t('inspector.materialPresetHint')}</small></span>
      <select
        value=""
        disabled={disabled}
        onChange={(event) => {
          const material = standardMaterials.find((item) => item.id === event.target.value);
          if (material) onSelect(material);
        }}
      >
        <option value="" disabled>{t('inspector.materialPresetPlaceholder')}</option>
        {CATEGORY_ORDER.map((category) => {
          const items = standardMaterials.filter((material) => material.category === category);
          if (items.length === 0) return null;
          return (
            <optgroup key={category} label={t(CATEGORY_LABEL_KEYS[category])}>
              {items.map((material) => (
                <option key={material.id} value={material.id}>
                  {material.name} · E {formatInspectorValue(toDisplay(material.elasticModulus, units, 'elasticModulus'), unitLabel(units, 'elasticModulus'))}
                </option>
              ))}
            </optgroup>
          );
        })}
      </select>
    </label>
  );
};
