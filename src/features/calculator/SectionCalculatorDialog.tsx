import { useMemo, useState } from 'react';
import { Button, Field, SegmentedControl } from '../../design-system/components/controls';
import { Dialog } from '../../design-system/components/overlays';
import { fromDisplay, toDisplay, unitLabel } from '../../engine/units';
import type { UnitSystemId } from '../../types';
import { formatValue, serializeNumber } from '../../utils/numberFormat';
import { calculateSectionProperties, type SectionDimensions, type SectionProperties, type SectionShape } from './sectionCalculator';
import './sectionCalculator.css';

type Language = 'es' | 'en';
type DimensionKey = keyof SectionDimensions;

const copy = {
  es: {
    title: 'Calculadora de sección', description: 'Propiedades geométricas elásticas para predimensionar sin tocar tu modelo.', close: 'Cerrar calculadora', shape: 'Tipo de sección', rectangle: 'Rectángulo', circle: 'Círculo', tube: 'Tubo', i: 'Perfil I', dimensions: 'Dimensiones', results: 'Propiedades calculadas', resultsHint: 'Ejes centroidales X / Y · unidades del proyecto', formula: 'Relación usada', invalid: 'Completa las dimensiones para ver los resultados.', width: 'Ancho', height: 'Alto', diameter: 'Diámetro', thickness: 'Espesor', flangeThickness: 'Espesor de ala', webThickness: 'Espesor de alma', area: 'Área', inertiaX: 'Inercia Ix', inertiaY: 'Inercia Iy', modulusX: 'Módulo Wx', modulusY: 'Módulo Wy', radiusX: 'Radio rx', radiusY: 'Radio ry', cancel: 'Cerrar', rectangleFormula: 'A = b·h · Ix = b·h³/12 · Iy = h·b³/12', circleFormula: 'A = π·d²/4 · I = π·d⁴/64', tubeFormula: 'Propiedades exteriores − hueco interior', iFormula: 'Rectángulo exterior − vaciado central', empty: 'Introduce valores positivos en todas las dimensiones.', units: 'Unidad de perfil',
  },
  en: {
    title: 'Section calculator', description: 'Elastic geometric properties for early sizing without changing your model.', close: 'Close calculator', shape: 'Section type', rectangle: 'Rectangle', circle: 'Circle', tube: 'Tube', i: 'I section', dimensions: 'Dimensions', results: 'Calculated properties', resultsHint: 'Centroidal X / Y axes · project units', formula: 'Formula used', invalid: 'Complete the dimensions to see results.', width: 'Width', height: 'Height', diameter: 'Diameter', thickness: 'Thickness', flangeThickness: 'Flange thickness', webThickness: 'Web thickness', area: 'Area', inertiaX: 'Inertia Ix', inertiaY: 'Inertia Iy', modulusX: 'Section modulus Wx', modulusY: 'Section modulus Wy', radiusX: 'Radius rx', radiusY: 'Radius ry', cancel: 'Close', rectangleFormula: 'A = b·h · Ix = b·h³/12 · Iy = h·b³/12', circleFormula: 'A = π·d²/4 · I = π·d⁴/64', tubeFormula: 'Outer properties − inner void', iFormula: 'Outer rectangle − central void', empty: 'Enter positive values for every dimension.', units: 'Profile unit',
  },
} as const;

const initialDraft = (units: UnitSystemId): Record<DimensionKey, string> => {
  const dimension = (value: number) => serializeNumber(toDisplay(value, units, 'sectionDimension'));
  return { width: dimension(0.3), height: dimension(0.5), diameter: dimension(0.2), thickness: dimension(0.01), flangeThickness: dimension(0.012), webThickness: dimension(0.008) };
};

type SectionCopy = { [Key in keyof typeof copy.es]: string };

const formulaFor = (shape: SectionShape, text: SectionCopy): string => shape === 'rectangle' ? text.rectangleFormula : shape === 'circle' ? text.circleFormula : shape === 'tube' ? text.tubeFormula : text.iFormula;

const propertyRows = (properties: SectionProperties, text: SectionCopy) => [
  ['area', text.area, properties.area, 'area'],
  ['inertiaX', text.inertiaX, properties.inertiaX, 'inertia'],
  ['inertiaY', text.inertiaY, properties.inertiaY, 'inertia'],
  ['modulusX', text.modulusX, properties.sectionModulusX, 'sectionModulus'],
  ['modulusY', text.modulusY, properties.sectionModulusY, 'sectionModulus'],
  ['radiusX', text.radiusX, properties.radiusGyrationX, 'sectionDimension'],
  ['radiusY', text.radiusY, properties.radiusGyrationY, 'sectionDimension'],
] as const;

const displayValue = (value: number, units: UnitSystemId, quantity: 'area' | 'inertia' | 'sectionModulus' | 'sectionDimension'): string => {
  const converted = toDisplay(value, units, quantity);
  return formatValue(converted, unitLabel(units, quantity), 'table', { maximumFractionDigits: 3 });
};

interface SectionCalculatorDialogProps {
  open: boolean;
  units: UnitSystemId;
  language: Language;
  onClose: () => void;
}

export const SectionCalculatorDialog = ({ open, units, language, onClose }: SectionCalculatorDialogProps) => {
  const text = copy[language];
  const [shape, setShape] = useState<SectionShape>('rectangle');
  const [draft, setDraft] = useState<Record<DimensionKey, string>>(() => initialDraft(units));

  const calculation = useMemo(() => {
    const value = (key: DimensionKey) => {
      const parsed = Number.parseFloat(draft[key].replace(',', '.'));
      return Number.isFinite(parsed) && parsed > 0 ? fromDisplay(parsed, units, 'sectionDimension') : undefined;
    };
    const dimensions: SectionDimensions = shape === 'circle'
      ? { diameter: value('diameter') }
      : shape === 'tube'
        ? { width: value('width'), height: value('height'), thickness: value('thickness') }
        : shape === 'i'
          ? { width: value('width'), height: value('height'), flangeThickness: value('flangeThickness'), webThickness: value('webThickness') }
          : { width: value('width'), height: value('height') };
    try {
      return { properties: calculateSectionProperties(shape, dimensions), error: null };
    } catch (error) {
      return { properties: null, error: error instanceof Error ? error.message : text.empty };
    }
  }, [draft, shape, text.empty, units]);

  const setDimension = (key: DimensionKey, value: string) => setDraft((current) => ({ ...current, [key]: value }));
  const field = (key: DimensionKey, label: string) => <Field
    key={key}
    label={label}
    type="number"
    inputMode="decimal"
    min="0"
    step="any"
    value={draft[key]}
    onChange={(event) => setDimension(key, event.currentTarget.value)}
    suffix={unitLabel(units, 'sectionDimension')}
    className="sc-section-calculator__field"
  />;

  return <Dialog
    open={open}
    onOpenChange={(nextOpen) => { if (!nextOpen) onClose(); }}
    title={text.title}
    description={text.description}
    closeLabel={text.close}
    className="sc-section-calculator-dialog"
    footer={<Button variant="secondary" onClick={onClose}>{text.cancel}</Button>}
  >
    <div className="sc-section-calculator" data-testid="section-calculator">
      <section className="sc-section-calculator__inputs" aria-labelledby="section-calculator-inputs">
        <div className="sc-section-calculator__section-heading"><div><span className="sc-section-calculator__eyebrow">01 / INPUT</span><h3 id="section-calculator-inputs">{text.dimensions}</h3></div><span className="sc-section-calculator__unit-badge">{text.units}: {unitLabel(units, 'sectionDimension')}</span></div>
        <SegmentedControl
          label={text.shape}
          value={shape}
          onValueChange={(value) => setShape(value as SectionShape)}
          options={[{ value: 'rectangle', label: text.rectangle }, { value: 'circle', label: text.circle }, { value: 'tube', label: text.tube }, { value: 'i', label: text.i }]}
          size="sm"
          className="sc-section-calculator__shapes"
        />
        <div className="sc-section-calculator__fields">
          {shape === 'circle' ? field('diameter', text.diameter) : null}
          {shape !== 'circle' ? field('width', shape === 'i' ? text.width : shape === 'tube' ? text.width : text.width) : null}
          {shape !== 'circle' ? field('height', text.height) : null}
          {shape === 'tube' ? field('thickness', text.thickness) : null}
          {shape === 'i' ? field('flangeThickness', text.flangeThickness) : null}
          {shape === 'i' ? field('webThickness', text.webThickness) : null}
        </div>
        <p className="sc-section-calculator__hint">{text.invalid}</p>
      </section>
      <section className="sc-section-calculator__results" aria-labelledby="section-calculator-results">
        <div className="sc-section-calculator__section-heading"><div><span className="sc-section-calculator__eyebrow">02 / OUTPUT</span><h3 id="section-calculator-results">{text.results}</h3><p>{text.resultsHint}</p></div></div>
        {calculation.properties ? <>
          <dl className="sc-section-calculator__property-list">
            {propertyRows(calculation.properties, text).map(([id, label, value, quantity]) => <div key={id} className="sc-section-calculator__property"><dt>{label}</dt><dd>{displayValue(value, units, quantity)}</dd></div>)}
          </dl>
          <div className="sc-section-calculator__formula"><span>{text.formula}</span><code>{formulaFor(shape, text)}</code></div>
        </> : <p className="sc-section-calculator__empty" role="status">{calculation.error ?? text.empty}</p>}
      </section>
    </div>
  </Dialog>;
};
