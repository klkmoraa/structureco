import type { layoutSmartLabels } from './labelLayout';

type PlacedSmartLabel = ReturnType<typeof layoutSmartLabels>[number];

export const SmartLabelLayer = ({ labels, detail }: { labels: readonly PlacedSmartLabel[]; detail: string }) => <g className="smart-label-layer" data-label-detail={detail} aria-hidden="true">
  {labels.map((label) => {
    const centerX = label.rect.x + label.rect.width / 2;
    const centerY = label.rect.y + label.rect.height / 2;
    return <g key={label.id} className={`smart-label priority-${label.priority} tone-${label.tone ?? 'neutral'}`} data-smart-label={label.id} data-label-priority={label.priority}>
      {label.leader ? <line className="smart-label-leader" x1={label.anchor.x} y1={label.anchor.y} x2={centerX} y2={centerY} /> : null}
      <rect x={label.rect.x} y={label.rect.y} width={label.rect.width} height={label.rect.height} rx="6" />
      <text x={label.rect.x + 8} y={label.rect.y + 15}>{label.text}</text>
    </g>;
  })}
</g>;

export const GlobalAxes = ({ canvasHeight }: { canvasHeight: number }) => <g className="global-axes" transform={`translate(42 ${canvasHeight - 45})`}>
  <line x1="0" y1="0" x2="58" y2="0" markerEnd="url(#axis-x)" />
  <line x1="0" y1="0" x2="0" y2="-58" markerEnd="url(#axis-y)" />
  <defs>
    <marker id="axis-x" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0L10 5L0 10Z" fill="var(--moment)" /></marker>
    <marker id="axis-y" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0L10 5L0 10Z" fill="var(--shear)" /></marker>
  </defs>
  <text x="65" y="5" className="axis-x-label">X</text><text x="-5" y="-66" className="axis-y-label">Y</text>
</g>;
