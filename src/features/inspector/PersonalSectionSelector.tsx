import { useCallback, useState } from 'react';
import { readPersonalSections, type PersonalParametricSection } from '../../data/personalSections';
import { toDisplay, unitLabel } from '../../engine/units';
import { useI18n } from '../../i18n/useI18n';
import type { UnitSystemId } from '../../types';
import { Dialog } from '../../design-system/components/overlays';
import { Button } from '../../design-system/components/controls';
import { SectionBuilder } from '../library/SectionBuilder';
import { formatInspectorValue } from './numericFormatting';

/** Saving personal geometry and applying it to a member stay separate actions. */
export const PersonalSectionSelector = ({ units, onSelect }: {
  units: UnitSystemId;
  onSelect: (section: PersonalParametricSection) => void;
}) => {
  const { language, t } = useI18n();
  const [sections, setSections] = useState<PersonalParametricSection[]>(() => readPersonalSections(localStorage));
  const [builderOpen, setBuilderOpen] = useState(false);
  const [prepared, setPrepared] = useState<PersonalParametricSection | null>(null);
  const reload = useCallback(() => setSections(readPersonalSections(localStorage)), []);
  const closeBuilder = () => { setBuilderOpen(false); setPrepared(null); };

  return <>
    <label className="select-field">
      <span>{t('inspector.personalSection')}<small>{t('inspector.personalSectionHint')}</small></span>
      <select aria-label={t('inspector.personalSection')} value="" onFocus={reload} onChange={(event) => {
        const section = sections.find((item) => item.id === event.target.value);
        if (section) onSelect(section);
      }}>
        <option value="">{sections.length ? t('inspector.personalSectionPlaceholder') : t('inspector.personalSectionEmpty')}</option>
        {sections.map((section) => <option key={section.id} value={section.id}>
          {section.name} · A {formatInspectorValue(toDisplay(section.properties.area, units, 'area'), unitLabel(units, 'area'))}
        </option>)}
      </select>
    </label>
    <button type="button" className="personal-section-selector__manage" onClick={() => { reload(); setBuilderOpen(true); }}>
      {t('inspector.personalSectionManage')}
    </button>
    <Dialog
      open={builderOpen}
      onOpenChange={(open) => { if (!open) closeBuilder(); }}
      title={t('inspector.personalSectionDialogTitle')}
      description={t('inspector.personalSectionDialogDescription')}
      closeLabel={t('inspector.personalSectionDialogClose')}
      className="personal-section-selector__dialog"
      footer={prepared ? <Button variant="primary" onClick={() => { onSelect(prepared); closeBuilder(); }}>{t('inspector.personalSectionApplyCreated', { name: prepared.name })}</Button> : undefined}
    >
      <SectionBuilder language={language} units={units} storage={localStorage} onSaved={(section) => { reload(); setPrepared(section); }} />
    </Dialog>
  </>;
};
