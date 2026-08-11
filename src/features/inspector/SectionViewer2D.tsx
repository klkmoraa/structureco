import { useId, useMemo, useState } from 'react';
import { Box, Ruler } from 'lucide-react';
import { standardSections, type SectionShapeType, type StandardSection } from '../../data/standardSections';
import { toDisplay, unitLabel } from '../../engine/units';
import { useI18n } from '../../i18n/useI18n';
import type { UnitSystemId } from '../../types';
import { formatFixed } from '../../utils/numberFormat';
import { formatInspectorValue } from './numericFormatting';

export interface SectionViewer2DProps {
  /** Área bruta del miembro (m²) tal como la tiene el modelo. */
  area: number;
  /** Inercia fuerte del miembro (m⁴). */
  inertia: number;
  units: UnitSystemId;
  /** Axil de referencia (kN) para el mapa de tensiones; 0 lo deja neutro. */
  axialForce?: number;
  /** Momento de referencia (kN·m) para el mapa de tensiones. */
  bendingMoment?: number;
}

const SVG_WIDTH = 200;
const SVG_HEIGHT = 140;
const PADDING = 30;

/**
 * Sección transversal a escala, con cotas y la distribución elástica de Navier.
 *
 * El miembro sólo guarda A e I: la *forma* no está en el modelo. Cuando A e I
 * coinciden exactamente con un perfil del catálogo se dibuja ese perfil; si no,
 * se dibuja la rectangular equivalente h = √(12·I/A), que es la única forma que
 * los dos datos disponibles determinan sin inventar nada. El encabezado dice
 * siempre cuál de los dos casos se está viendo.
 */
export const SectionViewer2D = ({ area, inertia, units, axialForce = 0, bendingMoment = 0 }: SectionViewer2DProps) => {
  const [view, setView] = useState<'dimensions' | 'stress'>('dimensions');
  const { t } = useI18n();
  const uid = useId();
  const gradientId = `section-stress-gradient-${uid}`;
  const maskId = `section-stress-mask-${uid}`;

  const geometry = useMemo(() => {
    const section: StandardSection | null = standardSections.find(
      (candidate) => candidate.area === area && candidate.inertiaX === inertia,
    ) ?? null;
    const safeArea = area > 0 ? area : 0.01;
    const safeInertia = inertia > 0 ? inertia : 1e-5;
    const depth = section?.depth ?? Math.sqrt((12 * safeInertia) / safeArea);
    const width = section?.width ?? safeArea / (depth > 0 ? depth : 1);
    return {
      section,
      shapeType: (section?.shapeType ?? 'RECT') as SectionShapeType,
      depth: depth > 0 ? depth : 0.3,
      width: width > 0 ? width : 0.2,
      flange: section?.flangeThickness ?? depth * 0.1,
      web: section?.webThickness ?? width * 0.1,
      modulus: section?.sectionModulusX ?? (depth > 0 ? safeInertia / (depth / 2) : 0),
    };
  }, [area, inertia]);

  const { section, shapeType, depth, width, flange, web, modulus } = geometry;

  /*
   * Tensiones normales elásticas σ = N/A ± M/W. Se calculan en unidades base
   * (kN/m²) y se muestran con la cantidad `elasticModulus`, que comparte
   * dimensión con la tensión: así la sección lee en la misma familia de
   * unidades que el resto del inspector y no en un MPa fijo.
   */
  const sigmaAxial = area > 0 ? axialForce / area : 0;
  const sigmaBending = modulus > 0 ? Math.abs(bendingMoment) / modulus : 0;
  const sigmaTop = toDisplay(sigmaAxial - (bendingMoment >= 0 ? sigmaBending : -sigmaBending), units, 'elasticModulus');
  const sigmaBottom = toDisplay(sigmaAxial + (bendingMoment >= 0 ? sigmaBending : -sigmaBending), units, 'elasticModulus');
  const stressUnit = unitLabel(units, 'elasticModulus');
  /* No hay cantidad `sectionModulus`: W es un volumen, así que se escala con
     el factor de longitud al cubo y se rotula con esa misma unidad. */
  const lengthFactor = toDisplay(1, units, 'length');
  const modulusDisplay = modulus * lengthFactor ** 3;
  const hasStress = Math.abs(sigmaTop) > 1e-9 || Math.abs(sigmaBottom) > 1e-9;

  /*
   * σ varía linealmente entre la fibra superior y la inferior (Navier), así que
   * el degradado es la distribución, no una decoración. La fibra de tensión
   * nula sólo cae *dentro* del canto si los dos extremos tienen signo opuesto;
   * con el axil dominando, toda la sección trabaja del mismo lado y no hay
   * corte que marcar. El color distingue compresión de tracción y la opacidad
   * lleva la magnitud, relativa a la fibra más cargada de esta misma sección.
   */
  const stressSpan = sigmaTop - sigmaBottom;
  const neutralFraction = Math.abs(stressSpan) > 1e-12 ? sigmaTop / stressSpan : 0;
  const neutralOffset = neutralFraction > 0 && neutralFraction < 1 ? neutralFraction : null;
  const peakStress = Math.max(Math.abs(sigmaTop), Math.abs(sigmaBottom));
  const stressColor = (sigma: number) => sigma < 0 ? 'var(--sc-color-technical-axial)' : 'var(--sc-color-technical-moment)';
  const stressOpacity = (sigma: number) => peakStress > 0 ? 0.18 + 0.72 * (Math.abs(sigma) / peakStress) : 0;

  const drawWidth = SVG_WIDTH - PADDING * 2;
  const drawHeight = SVG_HEIGHT - PADDING * 2;
  const scale = Math.min(drawWidth / Math.max(width, 0.01), drawHeight / Math.max(depth, 0.01)) * 0.9;
  const pxWidth = width * scale;
  const pxHeight = depth * scale;
  const pxFlange = Math.max(flange * scale, 3);
  const pxWeb = Math.max(web * scale, 3);
  const cx = SVG_WIDTH / 2;
  const cy = SVG_HEIGHT / 2;
  const left = cx - pxWidth / 2;
  const right = cx + pxWidth / 2;
  const top = cy - pxHeight / 2;
  const bottom = cy + pxHeight / 2;

  /*
   * La forma se dibuja una sola vez y sirve para dos cosas: el trazo visible y
   * la máscara del mapa de tensiones. Antes el modo Stress pintaba un
   * rectángulo con degradado sobre *cualquier* perfil, así que una I, una C,
   * un HSS o una L acababan representados como una caja — la tensión se leía
   * en una sección que no era la del miembro. Con `variant='mask'` el mismo
   * contorno (huecos incluidos) recorta el degradado, y la geometría real es
   * la misma en los dos modos.
   *
   * En la máscara el blanco es material y el negro es hueco: por eso los
   * `section-shape-void` se pintan de negro en lugar de con el color del
   * lienzo, y así el ánima hueca de un tubo sigue vacía bajo el degradado.
   */
  const renderShape = (variant: 'draw' | 'outline' | 'mask' = 'draw') => {
    const isMask = variant === 'mask';
    const solid = isMask
      ? { fill: 'white', stroke: 'none' as const }
      : { className: variant === 'outline' ? 'section-shape section-shape--outline' : 'section-shape' };
    const hollow = isMask
      ? { fill: 'black', stroke: 'none' as const }
      : { className: 'section-shape-void' };
    switch (shapeType) {
      case 'I':
      case 'C': {
        const webLeft = shapeType === 'C' ? left : cx - pxWeb / 2;
        const webRight = shapeType === 'C' ? left + pxWeb : cx + pxWeb / 2;
        const flangeBottom = top + pxFlange;
        const flangeTop = bottom - pxFlange;
        return <path
          {...solid}
          d={[
            `M ${left} ${top}`, `H ${right}`, `V ${flangeBottom}`, `H ${webRight}`, `V ${flangeTop}`,
            `H ${right}`, `V ${bottom}`, `H ${left}`,
            ...(shapeType === 'I' ? [`V ${flangeTop}`, `H ${webLeft}`, `V ${flangeBottom}`, `H ${left}`] : []),
            'Z',
          ].join(' ')}
          strokeLinejoin="round"
        />;
      }
      case 'HSS_RECT':
        return <g>
          <rect {...solid} x={left} y={top} width={pxWidth} height={pxHeight} rx="4" />
          <rect
            {...hollow}
            x={left + pxWeb}
            y={top + pxFlange}
            width={Math.max(pxWidth - pxWeb * 2, 2)}
            height={Math.max(pxHeight - pxFlange * 2, 2)}
            rx="2"
          />
        </g>;
      case 'HSS_ROUND': {
        const radius = Math.min(pxWidth, pxHeight) / 2;
        return <g>
          <circle {...solid} cx={cx} cy={cy} r={radius} />
          <circle {...hollow} cx={cx} cy={cy} r={Math.max(radius - pxWeb, 2)} />
        </g>;
      }
      case 'L':
        return <path
          {...solid}
          d={`M ${left} ${top} H ${left + pxWeb} V ${bottom - pxFlange} H ${right} V ${bottom} H ${left} Z`}
          strokeLinejoin="round"
        />;
      default:
        return <rect {...solid} x={left} y={top} width={pxWidth} height={pxHeight} rx="3" />;
    }
  };

  /*
   * En Dimensiones, E.N. es la referencia geométrica central. En Stress debe
   * ser la fibra de tensión nula real: si el axil domina y toda la sección
   * trabaja del mismo lado, esa fibra cae fuera del perfil y no hay línea que
   * mostrar — dibujarla en el centro geométrico sería una E.N. inventada.
   */
  const showStressView = view === 'stress' && hasStress;
  const neutralAxisY = showStressView
    ? (neutralOffset === null ? null : top + neutralOffset * pxHeight)
    : cy;

  const lengthUnit = unitLabel(units, 'length');
  const dimensionWidth = formatFixed(toDisplay(width, units, 'length'), 3, 'inspector');
  const dimensionDepth = formatFixed(toDisplay(depth, units, 'length'), 3, 'inspector');

  return <section className="section-viewer" aria-label={t('inspector.sectionViewer')} data-testid="section-viewer-2d">
    <header className="section-viewer-header">
      <div className="section-viewer-title">
        <strong>{section?.name ?? t('inspector.sectionEquivalent')}</strong>
        <span>{section ? `${shapeType} · ${section.standard}` : t('inspector.sectionEquivalentHint')}</span>
      </div>
      <div className="section-viewer-modes" role="group" aria-label={t('inspector.sectionViewMode')}>
        <button
          type="button"
          className={view === 'dimensions' ? 'active' : ''}
          aria-pressed={view === 'dimensions'}
          onClick={() => setView('dimensions')}
        ><Ruler size={13} aria-hidden="true" /> {t('inspector.sectionViewDimensions')}</button>
        <button
          type="button"
          className={view === 'stress' ? 'active' : ''}
          aria-pressed={view === 'stress'}
          disabled={!hasStress}
          title={hasStress ? undefined : t('inspector.sectionStressUnavailable')}
          onClick={() => setView('stress')}
        ><Box size={13} aria-hidden="true" /> {t('inspector.sectionViewStress')}</button>
      </div>
    </header>

    <div className="section-viewer-canvas">
      <svg viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`} role="img" aria-label={t('inspector.sectionViewerAria', {
        name: section?.name ?? t('inspector.sectionEquivalent'),
        depth: dimensionDepth,
        width: dimensionWidth,
      })}>
        <defs>
          <linearGradient id={gradientId} x1={cx} y1={top} x2={cx} y2={bottom} gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor={stressColor(sigmaTop)} stopOpacity={stressOpacity(sigmaTop)} />
            {/* `offset` admite la fracción directamente: no hay número que
                *mostrar* aquí, así que no pasa por el formateador. */}
            {neutralOffset === null ? null
              : <stop offset={neutralOffset} stopColor={stressColor(sigmaBottom)} stopOpacity="0" />}
            <stop offset="100%" stopColor={stressColor(sigmaBottom)} stopOpacity={stressOpacity(sigmaBottom)} />
          </linearGradient>
          <mask id={maskId} data-testid="section-stress-mask">{renderShape('mask')}</mask>
        </defs>

        {neutralAxisY !== null ? <>
          <line className="section-neutral-axis" x1={left - 18} y1={neutralAxisY} x2={right + 18} y2={neutralAxisY} />
          <text className="section-axis-label" x={left - 20} y={neutralAxisY + 3} textAnchor="end">E.N.</text>
        </> : null}

        {view === 'stress' && hasStress ? <>
          {/* El degradado se recorta con la sección real; el contorno se dibuja
              encima para que el perfil siga leyéndose bajo el mapa. */}
          <rect
            className="section-stress-fill"
            data-testid="section-stress-fill"
            x={left}
            y={top}
            width={pxWidth}
            height={pxHeight}
            fill={`url(#${gradientId})`}
            mask={`url(#${maskId})`}
          />
          {renderShape('outline')}
          <text className="section-stress-label" x={right + 6} y={top + 8}>σ {formatInspectorValue(sigmaTop, stressUnit)}</text>
          <text className="section-stress-label" x={right + 6} y={bottom - 2}>σ {formatInspectorValue(sigmaBottom, stressUnit)}</text>
        </> : <>
          {renderShape()}
          <g className="section-dimension">
            <line x1={left} y1={top - 9} x2={right} y2={top - 9} />
            <line x1={left} y1={top - 13} x2={left} y2={top - 5} />
            <line x1={right} y1={top - 13} x2={right} y2={top - 5} />
            <text x={cx} y={top - 16} textAnchor="middle">b = {dimensionWidth} {lengthUnit}</text>
          </g>
          <g className="section-dimension">
            <line x1={right + 11} y1={top} x2={right + 11} y2={bottom} />
            <line x1={right + 7} y1={top} x2={right + 15} y2={top} />
            <line x1={right + 7} y1={bottom} x2={right + 15} y2={bottom} />
            <text x={right + 17} y={cy} textAnchor="middle" transform={`rotate(90 ${right + 17} ${cy})`}>h = {dimensionDepth} {lengthUnit}</text>
          </g>
        </>}
      </svg>
    </div>

    <dl className="section-viewer-chips">
      <div><dt>A</dt><dd>{formatInspectorValue(toDisplay(area, units, 'area'), unitLabel(units, 'area'))}</dd></div>
      <div><dt>I</dt><dd>{formatInspectorValue(toDisplay(inertia, units, 'inertia'), unitLabel(units, 'inertia'))}</dd></div>
      <div><dt>W</dt><dd>{formatInspectorValue(modulusDisplay, `${lengthUnit}³`)}</dd></div>
    </dl>
  </section>;
};
