/**
 * Lienzo estructural.
 *
 * Tres propiedades del producto actual que CRI-9 §5.3 marca como fortalezas a
 * NO perder, y que aquí se conservan a propósito:
 *
 *   · El área de acierto está separada del trazo dibujado. Engordar la línea
 *     para poder tocarla alteraría la representación técnica; lo que se engorda
 *     es un trazo transparente encima (44 px en táctil, 24 en puntero fino).
 *   · El lienzo es tabulable: cada objeto es una parada de teclado con su
 *     propio anillo de foco. Sin ratón se puede seleccionar.
 *   · El dibujo se mantiene PLANO (Brandbook §02): ninguna sombra clay sobre
 *     vigas, cotas, diagramas ni valores. El clay vive en los controles.
 *
 * La evidencia (N/V/M/deformada) es una CAPA del lienzo, no una pestaña de un
 * panel de resultados (D-03). Y sólo se pinta si hay un resultado vivo: cuando
 * el modelo cambia, el resultado se destruye y aquí no queda nada que pintar.
 */

import { useMemo } from 'react';
import type { Evidence } from '../core/analysis';
import type { Fixture } from '../core/fixtures';
import { usePrototype, type SelectionRef } from '../state/PrototypeStore';

export interface CanvasInsets {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

interface CanvasProps {
  width: number;
  height: number;
  /**
   * Rectángulo seguro: el chrome flotante que el encuadre debe respetar (CB-5).
   * Se deriva de chrome medido, nunca de constantes repartidas por el CSS.
   *
   * Sólo entra aquí el chrome de REPOSO. Las superficies contextuales —el
   * `inset` del detalle, la hoja, las acciones de selección— no re-encuadran el
   * modelo al abrirse: la cámara no se mueve (D-01). Se superponen, y lo que se
   * pierde es visibilidad temporal, no la posición del modelo.
   */
  insets: CanvasInsets;
  onSelect: (selection: SelectionRef | null) => void;
}

const MARGIN = 40;
const LABEL_LIMIT = 200;

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
    // El modelo mide y hacia arriba; el SVG hacia abajo.
    y: (value: number) => originY - (value - fixture.extent.minY) * scale,
  };
};

const EVIDENCE_COLOR: Record<Exclude<Evidence, 'none'>, string> = {
  N: 'var(--sc-color-technical-axial)',
  V: 'var(--sc-color-technical-shear)',
  M: 'var(--sc-color-technical-moment)',
  deformed: 'var(--sc-color-technical-deformed)',
};

export const StructuralCanvas = ({ width, height, insets, onSelect }: CanvasProps) => {
  const { state, derived } = usePrototype();
  const { fixture, paintsEvidence, pointerCoarse, t } = derived;
  const project = useMemo(
    () => projector(fixture, width, height, insets),
    [fixture, width, height, insets.top, insets.right, insets.bottom, insets.left],
  );
  const hitWidth = pointerCoarse ? 44 : 24;
  const showLabels = state.layers.labels && fixture.members.length <= LABEL_LIMIT;
  const result = state.analysis.result;

  const nodeAt = (id: string) => fixture.nodes.find((node) => node.id === id);

  return (
    <svg
      className="pt-canvas"
      width={width}
      height={height}
      viewBox={`0 0 ${Math.max(1, width)} ${Math.max(1, height)}`}
      role="application"
      aria-label={t('canvas.selectHint')}
      onClick={(event) => {
        if (event.target === event.currentTarget) onSelect(null);
      }}
    >
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
        {fixture.members.map((member) => {
          const i = nodeAt(member.i);
          const j = nodeAt(member.j);
          if (!i || !j) return null;
          const selected = state.selection?.kind === 'member' && state.selection.id === member.id;
          const drafted = state.draft?.memberId === member.id;
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
              onClick={() => onSelect({ kind: 'member', id: member.id })}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  onSelect({ kind: 'member', id: member.id });
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
          {fixture.members.map((member) => {
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
                <polygon
                  className="pt-diagram-fill"
                  points={`${x1},${y1} ${points} ${x2},${y2}`}
                  style={{ fill: EVIDENCE_COLOR[state.evidence] }}
                />
              </g>
            );
          })}
        </g>
      ) : null}

      {state.layers.supports ? (
        <g className="pt-canvas__supports">
          {fixture.nodes
            .filter((node) => node.support !== 'none')
            .map((node) => {
              const cx = project.x(node.x);
              const cy = project.y(node.y);
              return (
                <g key={`s${node.id}`} className="pt-support" aria-hidden="true">
                  {node.support === 'fixed' ? (
                    <rect x={cx - 16} y={cy} width={32} height={9} rx={2} />
                  ) : (
                    <polygon points={`${cx},${cy} ${cx - 12},${cy + 18} ${cx + 12},${cy + 18}`} />
                  )}
                  <line x1={cx - 20} y1={cy + (node.support === 'fixed' ? 9 : 18)} x2={cx + 20} y2={cy + (node.support === 'fixed' ? 9 : 18)} />
                </g>
              );
            })}
        </g>
      ) : null}

      {state.layers.loads ? (
        <g className="pt-canvas__loads" aria-hidden="true">
          {fixture.loads.slice(0, 60).map((load) => {
            const member = fixture.members.find((item) => item.id === load.target);
            const node = fixture.nodes.find((item) => item.id === load.target);
            if (member) {
              const i = nodeAt(member.i);
              const j = nodeAt(member.j);
              if (!i || !j) return null;
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
        {fixture.nodes.map((node) => {
          const selected = state.selection?.kind === 'node' && state.selection.id === node.id;
          const cx = project.x(node.x);
          const cy = project.y(node.y);
          return (
            <g
              key={node.id}
              className="pt-object"
              data-selected={selected || undefined}
              tabIndex={0}
              role="button"
              aria-label={node.id}
              aria-pressed={selected}
              onClick={() => onSelect({ kind: 'node', id: node.id })}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  onSelect({ kind: 'node', id: node.id });
                }
              }}
            >
              <circle className="pt-node" cx={cx} cy={cy} r={5} />
              <circle className="pt-node-hit" cx={cx} cy={cy} r={pointerCoarse ? 22 : 13} />
            </g>
          );
        })}
      </g>

      <defs>
        <marker id="pt-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 z" />
        </marker>
      </defs>
    </svg>
  );
};
