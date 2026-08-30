import { useEffect, useId, useRef, useState } from 'react';
import type { SupportType } from '../../types';

export type SupportPlacementType = Extract<SupportType, 'none' | 'pin' | 'roller' | 'fixed' | 'custom'>;

export interface SupportPlacementPopoverProps {
  nodeId: string;
  anchor: { x: number; y: number };
  viewport: { width: number; height: number };
  title: string;
  description: string;
  labels: Readonly<Record<SupportPlacementType, string>>;
  rollerAngleLabel: string;
  degreesLabel: string;
  cancelLabel: string;
  initialType?: SupportPlacementType;
  initialAngleDeg?: number;
  onSelect: (type: SupportPlacementType, angleDeg: number) => void;
  onCancel: () => void;
}

const OPTIONS: readonly SupportPlacementType[] = ['none', 'pin', 'roller', 'fixed', 'custom'];
const POPOVER_WIDTH = 250;
const POPOVER_HEIGHT = 244;

/**
 * Explicit support choice shown at the placement point. Keeping the choice in
 * a small, local surface prevents a canvas tap from silently cycling through
 * support types and leaves the model untouched until the user confirms one.
 */
export const SupportPlacementPopover = ({
  nodeId,
  anchor,
  viewport,
  title,
  description,
  labels,
  rollerAngleLabel,
  degreesLabel,
  cancelLabel,
  initialType = 'pin',
  initialAngleDeg = 90,
  onSelect,
  onCancel,
}: SupportPlacementPopoverProps) => {
  const titleId = useId();
  const descriptionId = useId();
  const firstOptionRef = useRef<HTMLButtonElement>(null);
  const [angleText, setAngleText] = useState(String(initialAngleDeg));
  const left = Math.max(8, Math.min(anchor.x + 14, Math.max(8, viewport.width - POPOVER_WIDTH - 8)));
  const top = Math.max(8, Math.min(anchor.y + 14, Math.max(8, viewport.height - POPOVER_HEIGHT - 8)));

  useEffect(() => {
    firstOptionRef.current?.focus({ preventScroll: true });
  }, []);

  const select = (type: SupportPlacementType) => {
    const parsedAngle = Number(angleText);
    onSelect(type, Number.isFinite(parsedAngle) ? parsedAngle : initialAngleDeg);
  };

  return (
    <div
      className="support-placement-popover"
      data-support-placement
      data-node-id={nodeId}
      role="dialog"
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      style={{ left, top }}
      onKeyDown={(event) => {
        if (event.key !== 'Escape') return;
        event.preventDefault();
        event.stopPropagation();
        onCancel();
      }}
    >
      <header>
        <strong id={titleId}>{title}</strong>
        <button type="button" className="support-placement-close" aria-label={cancelLabel} onClick={onCancel}>×</button>
      </header>
      <p id={descriptionId}>{description}</p>
      <div className="support-placement-options" role="group" aria-label={title}>
        {OPTIONS.map((type, index) => (
          <button
            key={type}
            ref={index === 0 ? firstOptionRef : undefined}
            type="button"
            className={type === initialType ? 'active' : ''}
            data-support-placement-option={type}
            onClick={() => select(type)}
          >
            {labels[type]}
          </button>
        ))}
      </div>
      <label className="support-placement-angle">
        <span>{rollerAngleLabel}</span>
        <span className="support-placement-angle-control">
          <input
            type="text"
            inputMode="decimal"
            autoComplete="off"
            value={angleText}
            aria-label={rollerAngleLabel}
            onChange={(event) => setAngleText(event.target.value)}
          />
          <small>{degreesLabel}</small>
        </span>
      </label>
    </div>
  );
};
