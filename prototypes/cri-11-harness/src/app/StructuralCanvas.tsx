/**
 * Lienzo estructural · Fase B.
 *
 * Añade lo que Fase A dejó declarado y sin construir: cámara (pan/zoom real,
 * rueda + pellizco de dos dedos), selección múltiple (marco + Shift), arrastre
 * de nudo con alternativa de campo, y el contrato de selección precisa de
 * cinco fases (CRI-9 §9, D-06) — detección de candidatos → previsualización →
 * elección/ciclado → compromiso → cancelación — con el MISMO `hitTest` para
 * mouse y para táctil.
 *
 * Tres propiedades del producto actual que CRI-9 §5.3 marca como fortalezas a
 * NO perder, y que se conservan:
 *   · El área de acierto está separada del trazo dibujado — nunca se engorda
 *     la geometría técnica, sólo el área que la reconoce (Brandbook §02).
 *   · El lienzo es tabulable con anillo de foco propio.
 *   · El dibujo se mantiene PLANO: ninguna sombra clay sobre vigas, cotas,
 *     diagramas ni valores.
 *
 * La evidencia (N/V/M/deformada) sigue siendo una CAPA del lienzo (D-03), y
 * sólo se pinta si hay un resultado vivo (fail-closed).
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Evidence } from '../core/analysis';
import type { Fixture } from '../core/fixtures';
import { hitTest, withinBox, type Candidate } from '../core/hitTest';
import { nextId } from '../core/model';
import { useActions, usePrototype, type SelectionRef, type ToolId } from '../state/PrototypeStore';
import { CandidatePicker } from './CandidatePicker';
import { PrecisionCrosshair } from './PrecisionCrosshair';

export interface CanvasInsets {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

interface CanvasProps {
  width: number;
  height: number;
  insets: CanvasInsets;
}

const MARGIN = 40;
const LABEL_LIMIT = 200;
const DRAG_THRESHOLD = 6;
const LONG_PRESS_MS = 480;
const MIN_ZOOM = 0.4;
const MAX_ZOOM = 4;

const projector = (fixture: Fixture, width: number, height: number, insets: CanvasInsets) => {
  const spanX = Math.max(0.001, fixture.extent.maxX - fixture.extent.minX);
  const spanY = Math.max(0.001, fixture.extent.maxY - fixture.extent.minY);
  const left = insets.left + MARGIN;
  const right = insets.right + MARGIN;
  const top = insets.top + MARGIN;
  const bottom = insets.bottom + MARGIN;
  const usableWidth = Math.max(80, width - left - right);
  const usableHeight = Math.max(80, height - top - bottom);
  const scale = Math.min(usableWidth / spanX, usableHeight / spanY);
  const originX = left + (usableWidth - spanX * scale) / 2;
  const originY = top + (usableHeight + spanY * scale) / 2;
  return {
    scale,
    x: (value: number) => originX + (value - fixture.extent.minX) * scale,
    y: (value: number) => originY - (value - fixture.extent.minY) * scale,
    invertX: (px: number) => fixture.extent.minX + (px - originX) / scale,
    invertY: (py: number) => fixture.extent.minY + (originY - py) / scale,
  };
};

const EVIDENCE_COLOR: Record<Exclude<Evidence, 'none'>, string> = {
  N: 'var(--sc-color-technical-axial)',
  V: 'var(--sc-color-technical-shear)',
  M: 'var(--sc-color-technical-moment)',
  deformed: 'var(--sc-color-technical-deformed)',
};

type DragMode =
  | { mode: 'none' }
  | { mode: 'pending-click'; startX: number; startY: number; hits: Candidate[] }
  | { mode: 'pending-node'; startX: number; startY: number; nodeId: string; hits: Candidate[] }
  | { mode: 'node-drag'; nodeId: string }
  | { mode: 'pending-empty'; startX: number; startY: number; startPanX: number; startPanY: number }
  | { mode: 'pan'; startX: number; startY: number; startPanX: number; startPanY: number }
  | { mode: 'marquee' }
  | { mode: 'pinch'; startDistance: number; startMidX: number; startMidY: number; startZoom: number; startPanX: number; startPanY: number };

const DEFAULT_SECTION = 'sec-ipe-240';
const DEFAULT_MATERIAL = 'mat-s275';
const SUPPORT_CYCLE: Record<string, 'none' | 'pin' | 'roller' | 'fixed'> = { none: 'pin', pin: 'roller', roller: 'fixed', fixed: 'none' };

/**
 * Atajos de herramienta · CRI-9 G-01, auditoría en `core/commands.ts`.
 *
 * Deliberadamente NO en `window` (Workspace.tsx): letras sueltas a nivel de
 * página rompen la navegación rápida de lectores de pantalla (H/B/F…). Este
 * `onKeyDown` vive en el propio `<svg>`, que ya declara `role="application"`
 * — sólo se dispara con el foco dentro del lienzo, así que fuera de él el
 * comportamiento de accesibilidad del resto de la página no cambia.
 */
const TOOL_SHORTCUT: Record<string, ToolId> = { v: 'select', n: 'node', m: 'member', s: 'support', l: 'load' };

export const StructuralCanvas = ({ width, height, insets }: CanvasProps) => {
  const { state, derived, dispatch } = usePrototype();
  const { selectOne, toggleSelect, selectMany, invoke, setTool } = useActions();
  const { model, fixture, paintsEvidence, pointerCoarse, t } = derived;
  const { camera } = state;
  const svgRef = useRef<SVGSVGElement | null>(null);
  const project = useMemo(() => projector(fixture, width, height, insets), [fixture, width, height, insets.top, insets.right, insets.bottom, insets.left]);
  const hitWidth = pointerCoarse ? 44 : 24;
  const showLabels = state.layers.labels && model.members.length <= LABEL_LIMIT;
  const result = state.analysis.result;
  const cx = width / 2;
  const cy = height / 2;

  const dragRef = useRef<DragMode>({ mode: 'none' });
  const longPressTimer = useRef<number | null>(null);
  const pointersRef = useRef<Map<number, { x: number; y: number }>>(new Map());
  const [dragPreview, setDragPreview] = useState<{ nodeId: string; x: number; y: number } | null>(null);
  const [marqueeBox, setMarqueeBox] = useState<{ x1: number; y1: number; x2: number; y2: number } | null>(null);
  const [precision, setPrecision] = useState<{ x: number; y: number; candidate: Candidate | null } | null>(null);
  const [picker, setPicker] = useState<{ anchor: { x: number; y: number }; candidates: Candidate[]; merge: boolean } | null>(null);
  const [ghost, setGhost] = useState<{ x: number; y: number } | null>(null);

  const nodeAt = useCallback((id: string) => model.nodes.find((node) => node.id === id), [model.nodes]);

  const toContainer = useCallback((clientX: number, clientY: number) => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0 || rect.height === 0) return { x: 0, y: 0 };
    return { x: (clientX - rect.left) * (width / rect.width), y: (clientY - rect.top) * (height / rect.height) };
  }, [width, height]);

  const toLocal = useCallback(
    (screenX: number, screenY: number) => ({
      x: cx + (screenX - camera.panX - cx) / camera.zoom,
      y: cy + (screenY - camera.panY - cy) / camera.zoom,
    }),
    [camera.panX, camera.panY, camera.zoom, cx, cy],
  );

  const toScreen = useCallback(
    (localX: number, localY: number) => ({
      x: camera.panX + cx + (localX - cx) * camera.zoom,
      y: camera.panY + cy + (localY - cy) * camera.zoom,
    }),
    [camera.panX, camera.panY, camera.zoom, cx, cy],
  );

  const runHitTest = useCallback(
    (localX: number, localY: number) =>
      hitTest(localX, localY, model, project, {
        pointerCoarse,
        filter: state.selectionFilter === 'all' ? 'all' : state.selectionFilter,
      }),
    [model, fixture, project, pointerCoarse, state.selectionFilter],
  );

  const clearLongPress = () => {
    if (longPressTimer.current !== null) {
      window.clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const toRef = (candidate: Candidate): SelectionRef => ({ kind: candidate.kind, id: candidate.id });

  const resolveClick = useCallback(
    (hits: Candidate[], shiftKey: boolean, screenX: number, screenY: number) => {
      if (hits.length === 0) {
        if (!shiftKey) selectOne(null);
        return;
      }
      if (hits.length === 1) {
        if (shiftKey) toggleSelect(toRef(hits[0]));
        else selectOne(toRef(hits[0]));
        return;
      }
      // Ambigüedad real: nunca se elige en silencio (CRI-9 D-06, contrato de picker).
      setPicker({ anchor: { x: screenX, y: screenY }, candidates: hits, merge: shiftKey });
      invoke('selection.ambiguous', `candidates:${hits.length}`);
    },
    [selectOne, toggleSelect, invoke],
  );

  // --- Herramientas de creación ---------------------------------------

  const placeNode = useCallback(
    (localX: number, localY: number) => {
      const id = nextId('N');
      dispatch({ type: 'model/addNode', node: { id, x: project.invertX(localX), y: project.invertY(localY), support: 'none' } });
      invoke('tool.node', 'visible');
    },
    [dispatch, project, invoke],
  );

  const placeMemberStep = useCallback(
    (hits: Candidate[]) => {
      const nodeHit = hits.find((hit) => hit.kind === 'node');
      if (!nodeHit) return;
      if (!state.pendingMemberStart) {
        dispatch({ type: 'model/pendingMemberStart', nodeId: nodeHit.id });
        return;
      }
      if (nodeHit.id === state.pendingMemberStart) return;
      const id = nextId('M');
      dispatch({
        type: 'model/addMember',
        member: { id, i: state.pendingMemberStart, j: nodeHit.id, type: 'frame', sectionId: DEFAULT_SECTION, materialId: DEFAULT_MATERIAL },
      });
      invoke('tool.member', 'visible');
    },
    [dispatch, state.pendingMemberStart, invoke],
  );

  const cycleSupport = useCallback(
    (hits: Candidate[]) => {
      const nodeHit = hits.find((hit) => hit.kind === 'node');
      if (!nodeHit) return;
      const node = nodeAt(nodeHit.id);
      if (!node) return;
      const value = SUPPORT_CYCLE[node.support];
      dispatch({ type: 'draft/open', draft: { kind: 'support', targetIds: [nodeHit.id], value, original: { [nodeHit.id]: node.support } } });
      dispatch({ type: 'draft/commit' });
      invoke('tool.support', 'visible');
    },
    [dispatch, nodeAt, invoke],
  );

  const placeLoad = useCallback(
    (hits: Candidate[]) => {
      const memberHit = hits.find((hit) => hit.kind === 'member');
      if (!memberHit) return;
      const id = nextId('Q');
      dispatch({ type: 'model/addLoad', load: { id, kind: 'point', target: memberHit.id, magnitude: 10, caseId: fixture.cases[0]?.id ?? 'case-cv' } });
      invoke('tool.load', 'visible');
    },
    [dispatch, fixture.cases, invoke],
  );

  /**
   * `emptyArea` distingue dos gestos que comparten el mismo dedo:
   *   · sobre un candidato: arma el crosshair de precisión (ya existía).
   *   · sobre vacío: arma selección por marco (marquee) — antes de esta
   *     Fase C, un long-press sobre vacío abría un crosshair sin candidato,
   *     un callejón sin salida (no seleccionaba nada al soltar). Un arrastre
   *     corto SIEMPRE sigue siendo pan; sólo un dedo quieto ~480ms cambia de
   *     gesto, así que pan no se rompe (Fase B, problema #2 pendiente).
   */
  const armLongPress = (screenX: number, screenY: number, emptyArea: boolean) => {
    clearLongPress();
    longPressTimer.current = window.setTimeout(() => {
      if (emptyArea) {
        dragRef.current = { mode: 'marquee' };
        setMarqueeBox({ x1: screenX, y1: screenY, x2: screenX, y2: screenY });
        if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(8);
        return;
      }
      const local = toLocal(screenX, screenY);
      const hits = runHitTest(local.x, local.y);
      setPrecision({ x: screenX, y: screenY, candidate: hits[0] ?? null });
      dragRef.current = { mode: 'none' };
    }, LONG_PRESS_MS);
  };

  // --- Punteros ---------------------------------------------------------

  const onPointerDown = (event: React.PointerEvent<SVGSVGElement>) => {
    if (picker) return; // el picker captura la interacción hasta que se resuelve
    (event.target as Element).setPointerCapture?.(event.pointerId);
    pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });

    if (pointersRef.current.size === 2) {
      const [a, b] = [...pointersRef.current.values()];
      dragRef.current = {
        mode: 'pinch',
        startDistance: Math.hypot(a.x - b.x, a.y - b.y) || 1,
        startMidX: (a.x + b.x) / 2,
        startMidY: (a.y + b.y) / 2,
        startZoom: camera.zoom,
        startPanX: camera.panX,
        startPanY: camera.panY,
      };
      clearLongPress();
      setPrecision(null);
      return;
    }
    if (pointersRef.current.size > 2) return;

    const container = toContainer(event.clientX, event.clientY);
    const local = toLocal(container.x, container.y);
    const isTouch = event.pointerType === 'touch';

    if (state.activeTool !== 'select') {
      dragRef.current = { mode: 'pending-click', startX: container.x, startY: container.y, hits: runHitTest(local.x, local.y) };
      return;
    }

    if (event.button === 1) {
      dragRef.current = { mode: 'pan', startX: container.x, startY: container.y, startPanX: camera.panX, startPanY: camera.panY };
      return;
    }

    const hits = runHitTest(local.x, local.y);
    if (hits.length > 0 && hits[0].kind === 'node' && hits[0].distance < 30) {
      dragRef.current = { mode: 'pending-node', startX: container.x, startY: container.y, nodeId: hits[0].id, hits };
      if (isTouch) armLongPress(container.x, container.y, false);
      return;
    }
    if (hits.length > 0) {
      dragRef.current = { mode: 'pending-click', startX: container.x, startY: container.y, hits };
      if (isTouch) armLongPress(container.x, container.y, false);
      return;
    }
    if (isTouch) {
      dragRef.current = { mode: 'pending-empty', startX: container.x, startY: container.y, startPanX: camera.panX, startPanY: camera.panY };
      armLongPress(container.x, container.y, true);
    } else {
      dragRef.current = { mode: 'pending-click', startX: container.x, startY: container.y, hits: [] };
      setMarqueeBox({ x1: container.x, y1: container.y, x2: container.x, y2: container.y });
    }
  };

  const onPointerMove = (event: React.PointerEvent<SVGSVGElement>) => {
    if (pointersRef.current.has(event.pointerId)) pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    const drag = dragRef.current;
    const container = toContainer(event.clientX, event.clientY);

    if (drag.mode === 'pinch' && pointersRef.current.size === 2) {
      const [a, b] = [...pointersRef.current.values()];
      const distance = Math.hypot(a.x - b.x, a.y - b.y) || 1;
      const midX = (a.x + b.x) / 2;
      const midY = (a.y + b.y) / 2;
      const zoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, drag.startZoom * (distance / drag.startDistance)));
      dispatch({ type: 'camera/set', patch: { zoom, panX: drag.startPanX + (midX - drag.startMidX), panY: drag.startPanY + (midY - drag.startMidY) } });
      return;
    }

    if (state.activeTool !== 'select') {
      if (drag.mode === 'pending-click') {
        const local = toLocal(container.x, container.y);
        setGhost(state.activeTool === 'node' || (state.activeTool === 'member' && state.pendingMemberStart) ? local : null);
      }
      return;
    }

    if (drag.mode === 'pending-node' || drag.mode === 'node-drag') {
      if (drag.mode === 'pending-node') {
        const dx = container.x - drag.startX;
        const dy = container.y - drag.startY;
        if (Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
        clearLongPress();
        setPrecision(null);
        dragRef.current = { mode: 'node-drag', nodeId: drag.nodeId };
      }
      const nodeId = drag.nodeId;
      const local = toLocal(container.x, container.y);
      setDragPreview({ nodeId, x: project.invertX(local.x), y: project.invertY(local.y) });
      return;
    }

    if (drag.mode === 'pending-click' && precision === null) {
      const dx = container.x - drag.startX;
      const dy = container.y - drag.startY;
      if (Math.hypot(dx, dy) > DRAG_THRESHOLD) clearLongPress();
      return;
    }

    if (drag.mode === 'pending-empty') {
      const dx = container.x - drag.startX;
      const dy = container.y - drag.startY;
      if (Math.hypot(dx, dy) > DRAG_THRESHOLD) {
        clearLongPress();
        setPrecision(null);
        dragRef.current = { mode: 'pan', startX: drag.startX, startY: drag.startY, startPanX: drag.startPanX, startPanY: drag.startPanY };
        dispatch({ type: 'camera/set', patch: { panX: drag.startPanX + dx, panY: drag.startPanY + dy } });
      }
      return;
    }

    if (drag.mode === 'pan') {
      dispatch({ type: 'camera/set', patch: { panX: drag.startPanX + (container.x - drag.startX), panY: drag.startPanY + (container.y - drag.startY) } });
      return;
    }

    if (marqueeBox) {
      setMarqueeBox({ ...marqueeBox, x2: container.x, y2: container.y });
      return;
    }

    if (precision) {
      const local = toLocal(container.x - 0, container.y - 40);
      const hits = runHitTest(local.x, local.y);
      setPrecision({ x: container.x, y: container.y, candidate: hits[0] ?? null });
    }
  };

  const endGesture = (event: React.PointerEvent<SVGSVGElement>) => {
    pointersRef.current.delete(event.pointerId);
    const drag = dragRef.current;
    const container = toContainer(event.clientX, event.clientY);
    clearLongPress();

    if (drag.mode === 'pinch') {
      dragRef.current = { mode: 'none' };
      return;
    }

    if (state.activeTool !== 'select') {
      if (drag.mode === 'pending-click') {
        const local = toLocal(container.x, container.y);
        const hits = runHitTest(local.x, local.y);
        if (state.activeTool === 'node') placeNode(local.x, local.y);
        else if (state.activeTool === 'member') placeMemberStep(hits);
        else if (state.activeTool === 'support') cycleSupport(hits);
        else if (state.activeTool === 'load') placeLoad(hits);
      }
      setGhost(null);
      dragRef.current = { mode: 'none' };
      return;
    }

    if (drag.mode === 'node-drag' && dragPreview) {
      dispatch({ type: 'model/moveNode', id: dragPreview.nodeId, x: dragPreview.x, y: dragPreview.y });
      setDragPreview(null);
      dragRef.current = { mode: 'none' };
      return;
    }

    if (precision) {
      if (precision.candidate) {
        if (event.shiftKey) toggleSelect(toRef(precision.candidate));
        else selectOne(toRef(precision.candidate));
      }
      setPrecision(null);
      dragRef.current = { mode: 'none' };
      return;
    }

    if (marqueeBox) {
      const dragged = Math.hypot(marqueeBox.x2 - marqueeBox.x1, marqueeBox.y2 - marqueeBox.y1) > DRAG_THRESHOLD;
      if (dragged) {
        const screenProject = {
          x: (worldX: number) => toScreen(project.x(worldX), 0).x,
          y: (worldY: number) => toScreen(0, project.y(worldY)).y,
        };
        const box = withinBox(model, screenProject, marqueeBox);
        selectMany(box.map(toRef), event.shiftKey);
      } else if (drag.mode === 'pending-node' || drag.mode === 'pending-click') {
        resolveClick(drag.hits, event.shiftKey, container.x, container.y);
      }
      setMarqueeBox(null);
      dragRef.current = { mode: 'none' };
      return;
    }

    if (drag.mode === 'pending-node' || drag.mode === 'pending-click') {
      resolveClick(drag.hits, event.shiftKey, container.x, container.y);
    } else if (drag.mode === 'pending-empty') {
      resolveClick([], event.shiftKey, container.x, container.y);
    }
    dragRef.current = { mode: 'none' };
  };

  const onWheel = (event: React.WheelEvent<SVGSVGElement>) => {
    event.preventDefault();
    const factor = event.deltaY < 0 ? 1.12 : 1 / 1.12;
    dispatch({ type: 'camera/zoomBy', factor });
  };

  const onCanvasKeyDown = (event: React.KeyboardEvent<SVGSVGElement>) => {
    if (event.ctrlKey || event.metaKey || event.altKey || event.nativeEvent.isComposing) return;
    const target = event.target as HTMLElement;
    if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return;
    const tool = TOOL_SHORTCUT[event.key.toLowerCase()];
    if (!tool || state.draft) return;
    event.preventDefault();
    setTool(tool, 'shortcut');
  };

  // Escape en captura: cancela un gesto local ANTES que el manejador global de Workspace.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      if (precision || picker || marqueeBox || dragPreview) {
        event.stopPropagation();
        clearLongPress();
        setPrecision(null);
        setPicker(null);
        setMarqueeBox(null);
        setDragPreview(null);
        dragRef.current = { mode: 'none' };
      }
    };
    window.addEventListener('keydown', onKeyDown, { capture: true });
    return () => window.removeEventListener('keydown', onKeyDown, { capture: true });
  }, [precision, picker, marqueeBox, dragPreview]);

  const cameraTransform = `translate(${camera.panX} ${camera.panY}) translate(${cx} ${cy}) scale(${camera.zoom}) translate(${-cx} ${-cy})`;

  const isSelected = (kind: 'node' | 'member', id: string) => state.selection.some((ref) => ref.kind === kind && ref.id === id);

  return (
    <>
      <svg
        ref={svgRef}
        className="pt-canvas"
        width={width}
        height={height}
        viewBox={`0 0 ${Math.max(1, width)} ${Math.max(1, height)}`}
        role="application"
        aria-label={t('canvas.selectHint')}
        data-tool={state.activeTool}
        tabIndex={0}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endGesture}
        onPointerCancel={endGesture}
        onWheel={onWheel}
        onKeyDown={onCanvasKeyDown}
      >
        <g transform={cameraTransform}>
          {state.layers.grid ? (
            <g className="pt-canvas__grid" aria-hidden="true">
              {Array.from({ length: Math.ceil(width / 40) }, (_, index) => (
                <line key={`v${index}`} x1={index * 40} y1={0} x2={index * 40} y2={height} />
              ))}
              {Array.from({ length: Math.ceil(height / 40) }, (_, index) => (
                <line key={`h${index}`} x1={0} y1={index * 40} x2={width} y2={index * 40} />
              ))}
            </g>
          ) : null}

          <g className="pt-canvas__members">
            {model.members.map((member) => {
              const i = nodeAt(member.i);
              const j = nodeAt(member.j);
              if (!i || !j) return null;
              const selected = isSelected('member', member.id);
              const drafted = state.draft?.kind === 'section' && state.draft.targetIds.includes(member.id);
              const x1 = project.x(i.x);
              const y1 = project.y(i.y);
              const x2 = project.x(j.x);
              const y2 = project.y(j.y);
              return (
                <g
                  key={member.id}
                  className="pt-object"
                  data-selected={selected || undefined}
                  data-drafted={drafted || undefined}
                  tabIndex={0}
                  role="button"
                  aria-label={`${member.id}${member.label ? ` · ${member.label}` : ''}`}
                  aria-pressed={selected}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      if (event.shiftKey) toggleSelect({ kind: 'member', id: member.id });
                      else selectOne({ kind: 'member', id: member.id });
                    }
                  }}
                >
                  <line className="pt-member" x1={x1} y1={y1} x2={x2} y2={y2} />
                  <line className="pt-member-hit" x1={x1} y1={y1} x2={x2} y2={y2} strokeWidth={hitWidth} />
                  {showLabels ? (
                    <text className="pt-label" x={(x1 + x2) / 2} y={(y1 + y2) / 2 - 10}>
                      {member.id}
                    </text>
                  ) : null}
                </g>
              );
            })}
          </g>

          {paintsEvidence && result ? (
            <g className="pt-canvas__evidence" aria-hidden="true">
              {model.members.map((member) => {
                const i = nodeAt(member.i);
                const j = nodeAt(member.j);
                const memberResult = result.members[member.id];
                if (!i || !j || !memberResult || state.evidence === 'none') return null;
                const samples = memberResult.samples[state.evidence];
                const x1 = project.x(i.x);
                const y1 = project.y(i.y);
                const x2 = project.x(j.x);
                const y2 = project.y(j.y);
                const length = Math.hypot(x2 - x1, y2 - y1) || 1;
                const nx = -(y2 - y1) / length;
                const ny = (x2 - x1) / length;
                const amplitude = Math.min(64, length * 0.28);
                const points = samples
                  .map((sample, index) => {
                    const ratio = index / (samples.length - 1);
                    const px = x1 + (x2 - x1) * ratio + nx * sample * amplitude;
                    const py = y1 + (y2 - y1) * ratio + ny * sample * amplitude;
                    return `${px.toFixed(1)},${py.toFixed(1)}`;
                  })
                  .join(' ');
                return (
                  <g key={member.id}>
                    <polyline className="pt-diagram" points={points} style={{ stroke: EVIDENCE_COLOR[state.evidence] }} />
                    <polygon className="pt-diagram-fill" points={`${x1},${y1} ${points} ${x2},${y2}`} style={{ fill: EVIDENCE_COLOR[state.evidence] }} />
                  </g>
                );
              })}
            </g>
          ) : null}

          {state.layers.supports ? (
            <g className="pt-canvas__supports">
              {model.nodes
                .filter((node) => node.support !== 'none')
                .map((node) => {
                  const cxp = project.x(node.x);
                  const cyp = project.y(node.y);
                  return (
                    <g key={`s${node.id}`} className="pt-support" aria-hidden="true">
                      {node.support === 'fixed' ? (
                        <rect x={cxp - 16} y={cyp} width={32} height={9} rx={2} />
                      ) : (
                        <polygon points={`${cxp},${cyp} ${cxp - 12},${cyp + 18} ${cxp + 12},${cyp + 18}`} />
                      )}
                      <line x1={cxp - 20} y1={cyp + (node.support === 'fixed' ? 9 : 18)} x2={cxp + 20} y2={cyp + (node.support === 'fixed' ? 9 : 18)} />
                    </g>
                  );
                })}
            </g>
          ) : null}

          {state.layers.loads ? (
            <g className="pt-canvas__loads" aria-hidden="true">
              {model.loads.slice(0, 60).map((load) => {
                const member = model.members.find((item) => item.id === load.target);
                const node = model.nodes.find((item) => item.id === load.target);
                if (member) {
                  const i = nodeAt(member.i);
                  const j = nodeAt(member.j);
                  if (!i || !j) return null;
                  if (load.kind === 'point') {
                    const px = project.x((i.x + j.x) / 2);
                    const py = Math.min(project.y(i.y), project.y(j.y));
                    return <line key={load.id} className="pt-load" x1={px} y1={py - 34} x2={px} y2={py - 6} markerEnd="url(#pt-arrow)" />;
                  }
                  const y = Math.min(project.y(i.y), project.y(j.y));
                  const from = Math.min(project.x(i.x), project.x(j.x));
                  const to = Math.max(project.x(i.x), project.x(j.x));
                  const arrows = Math.max(2, Math.min(9, Math.round((to - from) / 46)));
                  return (
                    <g key={load.id} className="pt-load">
                      <line x1={from} y1={y - 34} x2={to} y2={y - 34} />
                      {Array.from({ length: arrows + 1 }, (_, index) => {
                        const x = from + ((to - from) / arrows) * index;
                        return <line key={index} x1={x} y1={y - 34} x2={x} y2={y - 6} markerEnd="url(#pt-arrow)" />;
                      })}
                    </g>
                  );
                }
                if (node) {
                  const x = project.x(node.x);
                  const y = project.y(node.y);
                  return <line key={load.id} className="pt-load" x1={x - 52} y1={y} x2={x - 10} y2={y} markerEnd="url(#pt-arrow)" />;
                }
                return null;
              })}
            </g>
          ) : null}

          <g className="pt-canvas__nodes">
            {model.nodes.map((node) => {
              const selected = isSelected('node', node.id);
              const pending = state.pendingMemberStart === node.id;
              const preview = dragPreview?.nodeId === node.id ? dragPreview : null;
              const cxp = project.x(preview?.x ?? node.x);
              const cyp = project.y(preview?.y ?? node.y);
              return (
                <g
                  key={node.id}
                  className="pt-object"
                  data-selected={selected || undefined}
                  data-pending={pending || undefined}
                  tabIndex={0}
                  role="button"
                  aria-label={node.id}
                  aria-pressed={selected}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      if (event.shiftKey) toggleSelect({ kind: 'node', id: node.id });
                      else selectOne({ kind: 'node', id: node.id });
                    }
                  }}
                >
                  <circle className="pt-node" cx={cxp} cy={cyp} r={5} />
                  <circle className="pt-node-hit" cx={cxp} cy={cyp} r={pointerCoarse ? 22 : 13} />
                </g>
              );
            })}
          </g>

          {state.activeTool === 'member' && state.pendingMemberStart && ghost ? (
            (() => {
              const start = nodeAt(state.pendingMemberStart);
              if (!start) return null;
              return <line className="pt-ghost-member" x1={project.x(start.x)} y1={project.y(start.y)} x2={ghost.x} y2={ghost.y} />;
            })()
          ) : null}
          {state.activeTool === 'node' && ghost ? <circle className="pt-ghost-node" cx={ghost.x} cy={ghost.y} r={9} /> : null}
        </g>

        {marqueeBox ? (
          <rect
            className="pt-marquee"
            x={Math.min(marqueeBox.x1, marqueeBox.x2)}
            y={Math.min(marqueeBox.y1, marqueeBox.y2)}
            width={Math.abs(marqueeBox.x2 - marqueeBox.x1)}
            height={Math.abs(marqueeBox.y2 - marqueeBox.y1)}
          />
        ) : null}

        <defs>
          <marker id="pt-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" />
          </marker>
        </defs>
      </svg>

      {precision ? <PrecisionCrosshair x={precision.x} y={precision.y} candidate={precision.candidate} /> : null}
      {picker ? (
        <CandidatePicker
          anchor={picker.anchor}
          candidates={picker.candidates}
          containerWidth={width}
          containerHeight={height}
          onChoose={(candidate) => {
            if (picker.merge) toggleSelect(toRef(candidate));
            else selectOne(toRef(candidate));
            setPicker(null);
          }}
          onCancel={() => setPicker(null)}
        />
      ) : null}
    </>
  );
};
