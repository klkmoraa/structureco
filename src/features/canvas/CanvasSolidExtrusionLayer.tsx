import { memo, useMemo, type PointerEvent, type KeyboardEvent } from 'react';
import type { ProjectModel, MemberModel } from '../../types';
import type { CanvasCamera as Camera, ScreenPoint } from './canvasInteraction';
import type { CandidateTarget } from './candidatePicker';
import type { StructuralTarget } from './CanvasGeometryLayer';
import {
  computeExtrudedStructure,
  type ExtrusionOptions,
} from './isometricExtrusion';

export interface CanvasSolidExtrusionLayerProps {
  readonly project: ProjectModel;
  readonly toScreen: (x: number, y: number) => ScreenPoint;
  readonly camera: Camera;
  readonly selectedMemberIds: readonly string[];
  readonly selectedNodeIds: readonly string[];
  readonly candidatePreview?: CandidateTarget | null;
  readonly heatmapRatios: ReadonlyMap<string, number>;
  readonly options?: ExtrusionOptions;
  readonly onObjectPointerDown: (event: PointerEvent<SVGElement>, target: StructuralTarget) => void;
  readonly onObjectKeyDown?: (event: KeyboardEvent<SVGGElement>, target: Exclude<StructuralTarget, { kind: 'background' }>) => void;
  readonly onShowCut?: (event: PointerEvent<SVGElement>, member: MemberModel) => void;
  readonly onCutLeave?: () => void;
}

const CanvasSolidExtrusionLayerImpl = ({
  project,
  toScreen,
  camera,
  selectedMemberIds,
  selectedNodeIds,
  candidatePreview,
  heatmapRatios,
  options,
  onObjectPointerDown,
  onObjectKeyDown,
  onShowCut,
  onCutLeave,
}: CanvasSolidExtrusionLayerProps) => {
  const memberMap = useMemo(() => {
    const map = new Map<string, MemberModel>();
    for (const m of project.members) {
      map.set(m.id, m);
    }
    return map;
  }, [project.members]);

  const { faces, ghostAxes } = useMemo(() => {
    return computeExtrudedStructure(
      project,
      toScreen,
      camera,
      selectedMemberIds,
      selectedNodeIds,
      candidatePreview,
      heatmapRatios,
      options,
    );
  }, [
    project,
    toScreen,
    camera,
    selectedMemberIds,
    selectedNodeIds,
    candidatePreview,
    heatmapRatios,
    options,
  ]);

  return (
    <g className="solid-extrusion-layer" data-testid="solid-extrusion-layer">
      {/* 1. Ejes analíticos de referencia (Ghost Axes) */}
      <g className="solid-ghost-axes-group" aria-hidden="true">
        {ghostAxes.map((axis) => (
          <line
            key={`ghost-${axis.memberId}`}
            x1={axis.start.x}
            y1={axis.start.y}
            x2={axis.end.x}
            y2={axis.end.y}
            className={`solid-ghost-axis${axis.isSelected ? ' is-selected' : ''}`}
          />
        ))}
      </g>

      {/* 2. Caras sólidas 2.5D ordenadas por profundidad (Algoritmo del Pintor) */}
      <g className="solid-faces-group">
        {faces.map((face) => {
          const pointsStr = face.points.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
          const targetMember = face.memberId ? memberMap.get(face.memberId) : undefined;

          const handlePointerDown = (event: PointerEvent<SVGPolygonElement>) => {
            if (face.memberId) {
              onObjectPointerDown(event, { kind: 'member', id: face.memberId });
            } else if (face.nodeId) {
              onObjectPointerDown(event, { kind: 'node', id: face.nodeId });
            }
          };

          const handleKeyDown = (event: KeyboardEvent<SVGPolygonElement>) => {
            if (!onObjectKeyDown) return;
            const gEvent = event as unknown as KeyboardEvent<SVGGElement>;
            if (face.memberId) {
              onObjectKeyDown(gEvent, { kind: 'member', id: face.memberId });
            } else if (face.nodeId) {
              onObjectKeyDown(gEvent, { kind: 'node', id: face.nodeId });
            }
          };

          const handlePointerMove = (event: PointerEvent<SVGPolygonElement>) => {
            if (targetMember && onShowCut) {
              onShowCut(event, targetMember);
            }
          };

          return (
            <polygon
              key={face.id}
              points={pointsStr}
              fill={face.fillColor}
              stroke={face.strokeColor}
              strokeWidth={face.strokeWidth}
              strokeLinejoin="round"
              strokeLinecap="round"
              className={`solid-face solid-face--${face.part}${face.isSelected ? ' is-selected' : ''}${
                face.isCandidate ? ' candidate-preview' : ''
              }`}
              data-testid={`solid-face-${face.id}`}
              data-structure-object
              data-structure-kind={face.memberId ? 'member' : 'node'}
              data-structure-id={face.memberId ?? face.nodeId}
              data-solid-part={face.part}
              role="button"
              tabIndex={0}
              aria-label={face.memberId ? `Barra ${face.memberId} cara ${face.part}` : `Nudo ${face.nodeId} cara ${face.part}`}
              aria-pressed={face.isSelected}
              onPointerDown={handlePointerDown}
              onKeyDown={handleKeyDown}
              onPointerMove={handlePointerMove}
              onPointerLeave={onCutLeave}
            />
          );
        })}
      </g>
    </g>
  );
};

export const CanvasSolidExtrusionLayer = memo(CanvasSolidExtrusionLayerImpl);
