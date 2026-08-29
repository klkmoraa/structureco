import { memo, useMemo, type PointerEvent as ReactPointerEvent } from 'react';
import type { MemberResult, ProjectModel } from '../../types';
import type { TranslationKey } from '../../i18n/catalogs';
import { toDisplay, unitLabel } from '../../engine/units';
import { formatFixed } from '../../utils/numberFormat';
import { buildDiagramStack, laneScreenX, laneScreenY, snapStation, stackMetricsFor, stationFromScreenX, stationReadings, type StackQuantity } from './diagramStack';

export const CanvasDiagramStack = memo(({
  memberId, result, quantities, modelScreenBounds, viewportHeight, cursorX, onCursorChange, units, lengthLabel, t,
}: {
  memberId: string;
  result: MemberResult;
  quantities: readonly StackQuantity[];
  modelScreenBounds: { minX: number; maxX: number; maxY: number };
  viewportHeight: number;
  cursorX: number | null;
  onCursorChange: (x: number | null) => void;
  units: ProjectModel['settings']['units'];
  lengthLabel: string;
  t: (key: TranslationKey, variables?: Record<string, string | number>) => string;
}) => {
  const rect = useMemo(() => {
    const { offset, laneGap, laneHeight } = stackMetricsFor(viewportHeight, quantities.length);
    const width = Math.max(180, modelScreenBounds.maxX - modelScreenBounds.minX);
    return { x: (modelScreenBounds.minX + modelScreenBounds.maxX - width) / 2, y: modelScreenBounds.maxY + offset, width, laneGap, laneHeight };
  }, [modelScreenBounds, quantities.length, viewportHeight]);
  const lanes = useMemo(() => buildDiagramStack(result, quantities, rect), [quantities, rect, result]);
  const readings = useMemo(() => cursorX === null ? [] : stationReadings(result, cursorX), [cursorX, result]);
  if (!lanes.length) return null;
  const first = lanes[0];
  const last = lanes[lanes.length - 1];
  const cursorScreenX = cursorX === null ? null : laneScreenX(first, cursorX);
  const flipReading = cursorScreenX !== null && cursorScreenX > first.right - 96;
  const readStation = (event: ReactPointerEvent<SVGRectElement>) => {
    const bounds = event.currentTarget.ownerSVGElement?.getBoundingClientRect();
    if (!bounds) return;
    onCursorChange(snapStation(result, stationFromScreenX(first, result.length, event.clientX - bounds.left)));
  };
  return <g className="diagram-stack-layer" data-canvas-layer="diagram-stack" data-stack-member={memberId} aria-label={t('canvas.evidenceStackMember', { member: memberId })}>
    <text className="diagram-stack-title" x={rect.x} y={rect.y - 16}>
      {t('canvas.evidenceStackMember', { member: memberId })}
      <tspan className="diagram-stack-title__span" dx="8">{t('canvas.evidenceStackSpan', { length: `${formatFixed(toDisplay(result.length, units, 'length'), 2)} ${lengthLabel}` })}</tspan>
    </text>
    {lanes.map((lane) => {
      const reading = readings.find((item) => item.quantity === lane.quantity);
      const value = reading?.value;
      const kind = lane.quantity === 'moment' ? 'moment' as const : 'force' as const;
      return <g key={lane.quantity} className={`diagram-stack-lane ${lane.quantity}`} data-stack-lane={lane.quantity}>
        <line className="diagram-stack-baseline" x1={lane.left} x2={lane.right} y1={lane.baselineY} y2={lane.baselineY} />
        <path className="diagram-stack-fill" d={lane.fillPath} /><path className="diagram-stack-line" d={lane.linePath} />
        <text className="diagram-stack-caption" x={lane.left - 10} y={lane.baselineY + 4} textAnchor="end">{lane.symbol}</text>
        <g className={`diagram-stack-extremes${value !== undefined ? ' is-dimmed' : ''}`}>
          {lane.extremes.map((extreme) => <g key={extreme.kind} data-stack-extreme={`${lane.quantity}:${extreme.kind}`}>
            <circle className={`diagram-stack-extreme is-${extreme.kind}`} cx={extreme.screen.x} cy={extreme.screen.y} r="3.2" />
            <text className="diagram-stack-extreme-label" x={extreme.screen.x + (extreme.screen.x > lane.right - 96 ? -7 : 7)} y={extreme.screen.y + (extreme.value >= 0 ? -7 : 15)} textAnchor={extreme.screen.x > lane.right - 96 ? 'end' : 'start'}>{formatFixed(toDisplay(extreme.value, units, kind), 2)} {unitLabel(units, kind)}</text>
          </g>)}
        </g>
        {value !== undefined && cursorX !== null ? <g className="diagram-stack-reading" data-stack-reading={lane.quantity}><circle cx={laneScreenX(lane, cursorX)} cy={laneScreenY(lane, value)} r="3.5" /><text x={laneScreenX(lane, cursorX) + (flipReading ? -8 : 8)} y={laneScreenY(lane, value) - 7} textAnchor={flipReading ? 'end' : 'start'}>{reading?.jump
          ? t('results.discontinuityReading', { left: formatFixed(toDisplay(reading.jump.left, units, kind), 2), right: formatFixed(toDisplay(reading.jump.right, units, kind), 2), unit: unitLabel(units, kind) })
          : `${formatFixed(toDisplay(value, units, kind), 2)} ${unitLabel(units, kind)}`}</text></g> : null}
      </g>;
    })}
    {cursorX !== null ? <g className="diagram-stack-cursor"><line x1={laneScreenX(first, cursorX)} x2={laneScreenX(first, cursorX)} y1={first.top} y2={last.top + last.height} /><text className="diagram-stack-cursor__station" x={laneScreenX(first, cursorX) + (flipReading ? -8 : 8)} y={first.top - 6} textAnchor={flipReading ? 'end' : 'start'}>{`x ${formatFixed(toDisplay(cursorX, units, 'length'), 3)} ${lengthLabel}`}</text></g> : null}
    <rect className="diagram-stack-surface" data-stack-surface x={rect.x} y={first.top} width={rect.width} height={last.top + last.height - first.top} onPointerMove={readStation} onPointerLeave={() => onCursorChange(null)} />
  </g>;
});
