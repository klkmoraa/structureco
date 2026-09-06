import { memo, useCallback } from 'react';
import {
  Component,
  ArrowDown,
  GitCommitHorizontal,
  Trash2,
  Box,
  Scissors,
  X,
} from 'lucide-react';
import type { MemberModel, NodeModel, Selection } from '../../types';
import { haptics } from '../../platform/haptics';

export interface CanvasTouchRadialRingProps {
  selection: Selection;
  toScreen: (x: number, y: number) => { x: number; y: number };
  nodeMap: Map<string, NodeModel>;
  memberMap: Map<string, MemberModel>;
  onCycleSupport: (nodeId: string) => void;
  onStartMember: (nodeId: string) => void;
  onAddLoad: (kind: 'node' | 'member', id: string) => void;
  onCutMember: (memberId: string) => void;
  onOpenSection: (memberId: string) => void;
  onDelete: () => void;
  onDismiss: () => void;
}

export const CanvasTouchRadialRing = memo(({
  selection,
  toScreen,
  nodeMap,
  memberMap,
  onCycleSupport,
  onStartMember,
  onAddLoad,
  onCutMember,
  onOpenSection,
  onDelete,
  onDismiss,
}: CanvasTouchRadialRingProps) => {
  const handleAction = useCallback(
    (action: () => void) => {
      haptics.impact('medium');
      action();
    },
    [],
  );

  if (!selection || (selection.kind !== 'node' && selection.kind !== 'member')) {
    return null;
  }

  let centerScreen: { x: number; y: number } | null = null;
  let isNode = false;
  let targetNode: NodeModel | undefined;
  let targetMember: MemberModel | undefined;

  if (selection.kind === 'node') {
    isNode = true;
    targetNode = nodeMap.get(selection.id);
    if (targetNode) {
      centerScreen = toScreen(targetNode.x, targetNode.y);
    }
  } else if (selection.kind === 'member') {
    targetMember = memberMap.get(selection.id);
    if (targetMember) {
      const nodeI = nodeMap.get(targetMember.i);
      const nodeJ = nodeMap.get(targetMember.j);
      if (nodeI && nodeJ) {
        centerScreen = toScreen((nodeI.x + nodeJ.x) / 2, (nodeI.y + nodeJ.y) / 2);
      }
    }
  }

  if (!centerScreen || !Number.isFinite(centerScreen.x) || !Number.isFinite(centerScreen.y)) {
    return null;
  }

  const radius = 56; // Distance of ring buttons from center in pixels

  return (
    <div
      className="canvas-touch-radial-ring"
      style={{
        left: `${centerScreen.x}px`,
        top: `${centerScreen.y}px`,
      }}
      data-testid="touch-radial-ring"
      aria-label="Menú contextual radial de elemento"
    >
      {/* Centro / botón cerrar anillo */}
      <button
        type="button"
        className="radial-ring-center-btn"
        onClick={onDismiss}
        title="Cerrar menú radial"
        aria-label="Cerrar menú radial"
        data-testid="radial-ring-dismiss"
      >
        <X size={14} />
      </button>

      {isNode && targetNode ? (
        <>
          {/* Top: 0° / -90° visually -> Apoyo */}
          <button
            type="button"
            className="radial-ring-btn radial-ring-btn--top"
            style={{ transform: `translate(-50%, calc(-50% - ${radius}px))` }}
            onClick={() => handleAction(() => onCycleSupport(targetNode!.id))}
            title={`Alternar apoyo (${targetNode.support.type === 'none' ? 'Libre' : targetNode.support.type})`}
            data-testid="radial-action-support"
          >
            <Component size={18} />
            <span className="radial-ring-btn-label">Apoyo</span>
          </button>

          {/* Right: 90° -> Carga nodal */}
          <button
            type="button"
            className="radial-ring-btn radial-ring-btn--right"
            style={{ transform: `translate(calc(-50% + ${radius}px), -50%)` }}
            onClick={() => handleAction(() => onAddLoad('node', targetNode!.id))}
            title="Añadir carga puntual en este nudo"
            data-testid="radial-action-node-load"
          >
            <ArrowDown size={18} />
            <span className="radial-ring-btn-label">Carga</span>
          </button>

          {/* Bottom: 180° -> Trazar barra */}
          <button
            type="button"
            className="radial-ring-btn radial-ring-btn--bottom"
            style={{ transform: `translate(-50%, calc(-50% + ${radius}px))` }}
            onClick={() => handleAction(() => onStartMember(targetNode!.id))}
            title="Comenzar a trazar una nueva barra desde este nudo"
            data-testid="radial-action-new-member"
          >
            <GitCommitHorizontal size={18} />
            <span className="radial-ring-btn-label">Barra</span>
          </button>

          {/* Left: 270° -> Borrar */}
          <button
            type="button"
            className="radial-ring-btn radial-ring-btn--left radial-ring-btn--danger"
            style={{ transform: `translate(calc(-50% - ${radius}px), -50%)` }}
            onClick={() => handleAction(onDelete)}
            title="Eliminar este nudo"
            data-testid="radial-action-delete"
          >
            <Trash2 size={18} />
            <span className="radial-ring-btn-label">Borrar</span>
          </button>
        </>
      ) : targetMember ? (
        <>
          {/* Top: Perfil / Sección */}
          <button
            type="button"
            className="radial-ring-btn radial-ring-btn--top"
            style={{ transform: `translate(-50%, calc(-50% - ${radius}px))` }}
            onClick={() => handleAction(() => onOpenSection(targetMember!.id))}
            title={`Perfil y sección (${targetMember.type})`}
            data-testid="radial-action-section"
          >
            <Box size={18} />
            <span className="radial-ring-btn-label">Perfil</span>
          </button>

          {/* Right: Carga sobre barra */}
          <button
            type="button"
            className="radial-ring-btn radial-ring-btn--right"
            style={{ transform: `translate(calc(-50% + ${radius}px), -50%)` }}
            onClick={() => handleAction(() => onAddLoad('member', targetMember!.id))}
            title="Añadir carga repartida o puntual sobre esta barra"
            data-testid="radial-action-member-load"
          >
            <ArrowDown size={18} />
            <span className="radial-ring-btn-label">Carga</span>
          </button>

          {/* Bottom: Cortar / Dividir */}
          <button
            type="button"
            className="radial-ring-btn radial-ring-btn--bottom"
            style={{ transform: `translate(-50%, calc(-50% + ${radius}px))` }}
            onClick={() => handleAction(() => onCutMember(targetMember!.id))}
            title="Dividir barra en este punto"
            data-testid="radial-action-cut"
          >
            <Scissors size={18} />
            <span className="radial-ring-btn-label">Cortar</span>
          </button>

          {/* Left: Borrar */}
          <button
            type="button"
            className="radial-ring-btn radial-ring-btn--left radial-ring-btn--danger"
            style={{ transform: `translate(calc(-50% - ${radius}px), -50%)` }}
            onClick={() => handleAction(onDelete)}
            title="Eliminar esta barra"
            data-testid="radial-action-delete"
          >
            <Trash2 size={18} />
            <span className="radial-ring-btn-label">Borrar</span>
          </button>
        </>
      ) : null}
    </div>
  );
});

CanvasTouchRadialRing.displayName = 'CanvasTouchRadialRing';
