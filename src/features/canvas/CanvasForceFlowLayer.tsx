import { memo } from 'react';
import type { MemberModel, NodeModel, ProjectModel } from '../../types';
import type { MemberForceFlow } from './canvasDynamics';

export interface CanvasForceFlowLayerProps {
  project: ProjectModel;
  nodeMap: Map<string, NodeModel>;
  memberMap: Map<string, MemberModel>;
  flows: Map<string, MemberForceFlow>;
  toScreen: (x: number, y: number) => { x: number; y: number };
  visible: boolean;
}

const CanvasForceFlowLayerImpl = ({
  project,
  nodeMap,
  flows,
  toScreen,
  visible,
}: CanvasForceFlowLayerProps) => {
  if (!visible || flows.size === 0) return null;

  return (
    <g className="canvas-force-flow-layer" aria-label="Flujo dinámico de esfuerzos" pointerEvents="none">
      {project.members.map((member) => {
        const flow = flows.get(member.id);
        if (!flow || flow.kind === 'neutral') return null;

        const ni = nodeMap.get(member.i);
        const nj = nodeMap.get(member.j);
        if (!ni || !nj) return null;

        const p1 = toScreen(ni.x, ni.y);
        const p2 = toScreen(nj.x, nj.y);

        // Invert endpoints if flow direction is reversed (e.g. compression towards joints)
        const start = flow.flowDirection === 1 ? p1 : p2;
        const end = flow.flowDirection === 1 ? p2 : p1;

        const strokeWidth = 2 + flow.intensity * 3.5;
        const speedSeconds = 2.4 - flow.intensity * 1.4; // higher force = faster flow

        return (
          <g
            key={`flow-${member.id}`}
            className={`force-flow-group is-${flow.kind}`}
            data-force-flow-member={member.id}
            data-flow-kind={flow.kind}
          >
            <line
              className="force-flow-glow"
              x1={start.x}
              y1={start.y}
              x2={end.x}
              y2={end.y}
              strokeWidth={strokeWidth + 4}
            />
            <line
              className="force-flow-stream"
              x1={start.x}
              y1={start.y}
              x2={end.x}
              y2={end.y}
              strokeWidth={strokeWidth}
              style={{ animationDuration: `${speedSeconds}s` }}
            />
          </g>
        );
      })}
    </g>
  );
};

export const CanvasForceFlowLayer = memo(CanvasForceFlowLayerImpl);
