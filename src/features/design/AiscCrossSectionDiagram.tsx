import type { StandardSection } from '../../data/standardSections';
import type { AiscCheckKind } from '../../design/aiscSteel360Types';
import { toDisplay, unitLabel } from '../../engine/units';
import type { UnitSystemId } from '../../types';
import { formatFixed } from '../../utils/numberFormat';

interface Props {
  section: StandardSection;
  governingCheck?: AiscCheckKind;
  units: UnitSystemId;
}

export const AiscCrossSectionDiagram = ({ section, governingCheck, units }: Props) => {
  const bf = section.width; // m
  const d = section.depth; // m
  const tf = section.flangeThickness; // m
  const tw = section.webThickness; // m

  const viewBoxWidth = 240;
  const viewBoxHeight = 190;
  const cx = 110;
  const cy = 100;

  const maxDrawSize = 120;
  const scale = Math.min(maxDrawSize / Math.max(1e-4, bf), maxDrawSize / Math.max(1e-4, d));

  const drawW = Math.max(20, bf * scale);
  const drawH = Math.max(20, d * scale);
  const drawTf = Math.max(4, tf * scale);
  const drawTw = Math.max(3, tw * scale);

  const topFlangeY = cy - drawH / 2;
  const bottomFlangeY = cy + drawH / 2 - drawTf;
  const flangeX = cx - drawW / 2;
  const webX = cx - drawTw / 2;
  const webY = topFlangeY + drawTf;
  const webH = Math.max(2, bottomFlangeY - webY);

  const lengthUnit = unitLabel(units, 'length');
  const dDisp = `${formatFixed(toDisplay(d, units, 'length'), 3, 'inspector')} ${lengthUnit}`;
  const bfDisp = `${formatFixed(toDisplay(bf, units, 'length'), 3, 'inspector')} ${lengthUnit}`;
  const tfDisp = `tf = ${formatFixed(toDisplay(tf, units, 'length') * 1000, 1, 'inspector')} mm`;
  const twDisp = `tw = ${formatFixed(toDisplay(tw, units, 'length') * 1000, 1, 'inspector')} mm`;

  const isFlangeActive = governingCheck === 'flexure' || governingCheck === 'interaction';
  const isWebActive = governingCheck === 'shear' || governingCheck === 'interaction';

  const baseFill = 'color-mix(in oklab, var(--surface) 80%, var(--border))';
  const flangeColor = isFlangeActive ? 'color-mix(in oklab, var(--sc-color-state-warning, #d97706) 40%, var(--surface))' : baseFill;
  const webColor = isWebActive ? 'color-mix(in oklab, var(--sc-color-technical-shear, #168a6c) 40%, var(--surface))' : baseFill;
  const strokeColor = 'var(--text)';

  return (
    <div className="aisc-section-diagram" aria-label={`Diagrama de sección transversal ${section.name}`}>
      <svg
        viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`}
        className="aisc-section-diagram__svg"
        role="img"
        aria-hidden="true"
      >
        <defs>
          <marker id="dim-arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="4" markerHeight="4" orient="auto-start-reverse">
            <path d="M 0 2 L 8 5 L 0 8 z" fill="var(--muted)" />
          </marker>
        </defs>

        {/* Eje fuerte X-X */}
        <line
          x1={cx - drawW / 2 - 16}
          y1={cy}
          x2={cx + drawW / 2 + 16}
          y2={cy}
          stroke="var(--muted)"
          strokeWidth="1"
          strokeDasharray="3 3"
          opacity="0.6"
        />
        <text x={cx + drawW / 2 + 20} y={cy + 3} fill="var(--muted)" fontSize="9" fontFamily="var(--sc-font-mono)">
          X
        </text>

        {/* Eje débil Y-Y */}
        <line
          x1={cx}
          y1={topFlangeY - 14}
          x2={cx}
          y2={bottomFlangeY + drawTf + 14}
          stroke="var(--muted)"
          strokeWidth="1"
          strokeDasharray="3 3"
          opacity="0.6"
        />
        <text x={cx - 3} y={topFlangeY - 18} fill="var(--muted)" fontSize="9" fontFamily="var(--sc-font-mono)">
          Y
        </text>

        {/* Top Flange */}
        <rect
          x={flangeX}
          y={topFlangeY}
          width={drawW}
          height={drawTf}
          fill={flangeColor}
          stroke={strokeColor}
          strokeWidth="1.2"
          rx="1"
        />

        {/* Web */}
        <rect
          x={webX}
          y={webY}
          width={drawTw}
          height={webH}
          fill={webColor}
          stroke={strokeColor}
          strokeWidth="1.2"
        />

        {/* Bottom Flange */}
        <rect
          x={flangeX}
          y={bottomFlangeY}
          width={drawW}
          height={drawTf}
          fill={flangeColor}
          stroke={strokeColor}
          strokeWidth="1.2"
          rx="1"
        />

        {/* Dimension: Depth d (Right) */}
        <line
          x1={flangeX + drawW + 10}
          y1={topFlangeY}
          x2={flangeX + drawW + 10}
          y2={bottomFlangeY + drawTf}
          stroke="var(--muted)"
          strokeWidth="1"
          markerStart="url(#dim-arrow)"
          markerEnd="url(#dim-arrow)"
        />
        <text
          x={flangeX + drawW + 15}
          y={cy + 3}
          fill="var(--muted)"
          fontSize="9"
          fontFamily="var(--sc-font-mono)"
        >
          {dDisp}
        </text>

        {/* Dimension: Width bf (Top) */}
        <line
          x1={flangeX}
          y1={topFlangeY - 8}
          x2={flangeX + drawW}
          y2={topFlangeY - 8}
          stroke="var(--muted)"
          strokeWidth="1"
          markerStart="url(#dim-arrow)"
          markerEnd="url(#dim-arrow)"
        />
        <text
          x={cx}
          y={topFlangeY - 12}
          textAnchor="middle"
          fill="var(--muted)"
          fontSize="9"
          fontFamily="var(--sc-font-mono)"
        >
          {bfDisp}
        </text>

        {/* Footnote callouts for tw and tf */}
        <text
          x={flangeX + drawW + 15}
          y={topFlangeY + 14}
          fill="var(--muted)"
          fontSize="8"
          fontFamily="var(--sc-font-mono)"
        >
          {tfDisp}
        </text>
        <text
          x={flangeX + drawW + 15}
          y={cy + 22}
          fill="var(--muted)"
          fontSize="8"
          fontFamily="var(--sc-font-mono)"
        >
          {twDisp}
        </text>
      </svg>
    </div>
  );
};
