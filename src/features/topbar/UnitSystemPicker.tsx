import { useMemo, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { useI18n } from '../../i18n/useI18n';
import {
  DENSITY_UNITS,
  FORCE_UNITS,
  LENGTH_UNITS,
  PRESET_UNIT_SYSTEM_IDS,
  STRESS_UNITS,
  compositionMenuLabel,
  describeComposition,
  type AtomicUnit,
} from '../../engine/unitSystems';
import { unitSystemLabel, unitSystemSummary } from '../../engine/units';
import type { CustomUnitSystem, CustomUnitSystemId, UnitSystemId } from '../../types';
import { Button, IconButton } from '../../design-system/components/controls';
import { createId } from '../../utils/id';

export interface UnitSystemPickerProps {
  units: UnitSystemId;
  customSystems: readonly CustomUnitSystem[];
  onSelect: (units: UnitSystemId) => void;
  onCreate: (system: CustomUnitSystem) => void;
  onRemove: (id: CustomUnitSystemId) => void;
}

type Draft = Omit<CustomUnitSystem, 'id' | 'name'> & { name: string };

const INITIAL_DRAFT: Draft = {
  name: '',
  force: 'tonf',
  length: 'm',
  sectionLength: 'cm',
  sectionDimension: 'cm',
  modulus: 'kgf/cm2',
  density: 'kg/m3',
};

/**
 * Identificador único y nunca reciclado: un favorito guardado con un sistema
 * que después se borró debe quedar huérfano y caer al preset base, no heredar
 * en silencio las unidades del siguiente sistema que ocupe ese hueco.
 */
const nextCustomId = (): CustomUnitSystemId => `custom:${createId()}` as CustomUnitSystemId;

const UnitSelect = <Id extends string>({
  label, value, units, onChange,
}: {
  label: string;
  value: Id;
  units: ReadonlyArray<AtomicUnit<Id>>;
  onChange: (value: Id) => void;
}) => (
  <label className="topbar-panel-field">
    <span>{label}</span>
    <select aria-label={label} value={value} onChange={(event) => onChange(event.target.value as Id)}>
      {units.map((unit) => <option key={unit.id} value={unit.id}>{unit.label}</option>)}
    </select>
  </label>
);

/**
 * Selector de unidades: los sistemas de fábrica, los que el proyecto define y
 * un editor para componer uno nuevo.
 *
 * Sólo cambia la presentación. El modelo se guarda siempre en unidades base, de
 * modo que cambiar de sistema —o borrar uno propio— no altera ningún resultado.
 */
export const UnitSystemPicker = ({ units, customSystems, onSelect, onCreate, onRemove }: UnitSystemPickerProps) => {
  const { t } = useI18n();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Draft>(INITIAL_DRAFT);
  const preview = useMemo(() => describeComposition(draft), [draft]);
  const suggestedName = compositionMenuLabel(draft);

  const submit = () => {
    onCreate({
      ...draft,
      id: nextCustomId(),
      name: draft.name.trim() || suggestedName,
    });
    setDraft(INITIAL_DRAFT);
    setEditing(false);
  };

  return (
    <div className="topbar-units">
      <label className="topbar-panel-field">
        <span>{t('units.label')}</span>
        <select
          aria-label={t('units.label')}
          value={units}
          onChange={(event) => onSelect(event.target.value as UnitSystemId)}
        >
          <optgroup label={t('units.presets')}>
            {PRESET_UNIT_SYSTEM_IDS.map((id) => <option key={id} value={id}>{unitSystemLabel(id)}</option>)}
          </optgroup>
          {customSystems.length ? (
            <optgroup label={t('units.customGroup')}>
              {customSystems.map((system) => <option key={system.id} value={system.id}>{system.name}</option>)}
            </optgroup>
          ) : null}
        </select>
      </label>
      <p className="topbar-units-summary">{unitSystemSummary(units)}</p>
      {customSystems.length ? (
        <ul className="topbar-units-list">
          {customSystems.map((system) => (
            <li key={system.id}>
              <span title={describeComposition(system)}>{system.name}</span>
              <IconButton
                variant="ghost"
                className="icon-button"
                label={t('units.customRemove', { name: system.name })}
                title={t('units.customRemove', { name: system.name })}
                onClick={() => onRemove(system.id)}
              ><Trash2 size={14} /></IconButton>
            </li>
          ))}
        </ul>
      ) : null}
      {editing ? (
        <div className="topbar-units-editor">
          <label className="topbar-panel-field">
            <span>{t('units.customName')}</span>
            <input
              aria-label={t('units.customName')}
              value={draft.name}
              placeholder={suggestedName}
              maxLength={60}
              onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))}
            />
          </label>
          <UnitSelect label={t('units.customForce')} value={draft.force} units={FORCE_UNITS} onChange={(force) => setDraft((current) => ({ ...current, force }))} />
          <UnitSelect label={t('units.customLength')} value={draft.length} units={LENGTH_UNITS} onChange={(length) => setDraft((current) => ({ ...current, length }))} />
          <UnitSelect label={t('units.customSectionLength')} value={draft.sectionLength} units={LENGTH_UNITS} onChange={(sectionLength) => setDraft((current) => ({ ...current, sectionLength }))} />
          <UnitSelect label={t('units.customSectionDimension')} value={draft.sectionDimension} units={LENGTH_UNITS} onChange={(sectionDimension) => setDraft((current) => ({ ...current, sectionDimension }))} />
          <UnitSelect label={t('units.customModulus')} value={draft.modulus} units={STRESS_UNITS} onChange={(modulus) => setDraft((current) => ({ ...current, modulus }))} />
          <UnitSelect label={t('units.customDensity')} value={draft.density} units={DENSITY_UNITS} onChange={(density) => setDraft((current) => ({ ...current, density }))} />
          <p className="topbar-units-summary">{t('units.preview', { summary: preview })}</p>
          <div className="topbar-units-actions">
            <Button variant="primary" size="sm" onClick={submit}>{t('units.customAdd')}</Button>
            <Button variant="ghost" size="sm" onClick={() => setEditing(false)}>{t('units.customCancel')}</Button>
          </div>
        </div>
      ) : (
        <Button variant="secondary" size="sm" leadingIcon={<Plus size={14} />} onClick={() => setEditing(true)}>
          {t('units.customToggle')}
        </Button>
      )}
    </div>
  );
};
