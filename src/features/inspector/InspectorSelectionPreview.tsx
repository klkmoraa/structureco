import { useMemo } from 'react';
import type { MemberModel, NodeModel, ProjectModel, Selection } from '../../types';

export interface InspectorSelectionPreviewProps {
  project: ProjectModel;
  selection: Selection;
  label: string;
  caption: string;
}

const VIEW_WIDTH = 220;
const VIEW_HEIGHT = 96;
const PADDING = 16;

interface Framed {
  toScreen: (x: number, y: number) => { x: number; y: number };
}

/** Encuadre que mete `points` en el lienzo del preview conservando la proporción. */
const frameFor = (points: ReadonlyArray<{ x: number; y: number }>): Framed => {
  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const spanX = Math.max(maxX - minX, 1e-6);
  const spanY = Math.max(maxY - minY, 1e-6);
  const scale = Math.min((VIEW_WIDTH - PADDING * 2) / spanX, (VIEW_HEIGHT - PADDING * 2) / spanY);
  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;
  return {
    toScreen: (x, y) => ({
      x: VIEW_WIDTH / 2 + (x - centerX) * scale,
      // Y del modelo hacia arriba, Y del SVG hacia abajo.
      y: VIEW_HEIGHT / 2 - (y - centerY) * scale,
    }),
  };
};

const supportGlyph = (node: NodeModel, point: { x: number; y: number }) => {
  if (node.support.type === 'none') return null;
  if (node.support.type === 'fixed') {
    return <g className="preview-support">
      <line x1={point.x - 11} y1={point.y + 6} x2={point.x + 11} y2={point.y + 6} />
      {[-8, -3, 2, 7].map((offset) => <line key={offset} x1={point.x + offset} y1={point.y + 6} x2={point.x + offset - 4} y2={point.y + 11} />)}
    </g>;
  }
  return <g className="preview-support">
    <polygon points={`${point.x},${point.y} ${point.x - 8},${point.y + 11} ${point.x + 8},${point.y + 11}`} />
    <line x1={point.x - 10} y1={point.y + 11} x2={point.x + 10} y2={point.y + 11} />
    {node.support.type === 'roller' ? <>
      <circle cx={point.x - 4} cy={point.y + 14} r="2.4" />
      <circle cx={point.x + 4} cy={point.y + 14} r="2.4" />
    </> : [-6, -1, 4].map((offset) => <line key={offset} x1={point.x + offset} y1={point.y + 11} x2={point.x + offset - 4} y2={point.y + 16} />)}
  </g>;
};

/**
 * Miniatura del objeto seleccionado.
 *
 * El inspector describe el objeto con números; esto responde la otra mitad de la
 * pregunta — *cuál* es y cómo está puesto — sin obligar a volver al lienzo, que
 * es justo lo que cuesta en móvil, donde el panel tapa el dibujo. Se dibuja el
 * objeto y su vecindad inmediata: la barra con sus dos nudos y apoyos, el nudo
 * con las barras que llegan, la carga sobre su portador.
 */
export const InspectorSelectionPreview = ({ project, selection, label, caption }: InspectorSelectionPreviewProps) => {
  const scene = useMemo(() => {
    if (!selection || selection.kind === 'multi') return null;
    const nodes = new Map(project.nodes.map((node) => [node.id, node]));

    const memberScene = (member: MemberModel, highlighted: boolean) => {
      const start = nodes.get(member.i);
      const end = nodes.get(member.j);
      return start && end ? { member, start, end, highlighted } : null;
    };

    if (selection.kind === 'member' || selection.kind === 'memberLoad') {
      const memberId = selection.kind === 'member'
        ? selection.id
        : project.memberLoads.find((load) => load.id === selection.id)?.memberId;
      const member = project.members.find((candidate) => candidate.id === memberId);
      const entry = member ? memberScene(member, true) : null;
      return entry ? { members: [entry], nodes: [entry.start, entry.end], focusNodeId: null } : null;
    }

    const nodeId = selection.kind === 'node'
      ? selection.id
      : project.nodalLoads.find((load) => load.id === selection.id)?.nodeId;
    const node = nodeId ? nodes.get(nodeId) : undefined;
    if (!node) return null;
    const attached = project.members
      .filter((member) => member.i === node.id || member.j === node.id)
      .map((member) => memberScene(member, false))
      .filter((entry): entry is NonNullable<typeof entry> => entry !== null);
    const involved = new Map<string, NodeModel>([[node.id, node]]);
    for (const entry of attached) {
      involved.set(entry.start.id, entry.start);
      involved.set(entry.end.id, entry.end);
    }
    return { members: attached, nodes: [...involved.values()], focusNodeId: node.id };
  }, [project, selection]);

  if (!scene || scene.nodes.length === 0) return null;
  const frame = frameFor(scene.nodes);

  return <figure className="inspector-selection-preview" aria-label={label}>
    <svg viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`} role="img" aria-label={label}>
      <g className="preview-members">
        {scene.members.map(({ member, start, end, highlighted }) => {
          const a = frame.toScreen(start.x, start.y);
          const b = frame.toScreen(end.x, end.y);
          return <line key={member.id} className={highlighted ? 'is-focus' : ''} x1={a.x} y1={a.y} x2={b.x} y2={b.y} />;
        })}
      </g>
      <g className="preview-nodes">
        {scene.nodes.map((node) => {
          const point = frame.toScreen(node.x, node.y);
          return <g key={node.id}>
            {supportGlyph(node, point)}
            <circle className={scene.focusNodeId === node.id ? 'is-focus' : ''} cx={point.x} cy={point.y} r={scene.focusNodeId === node.id ? 5 : 3.4} />
          </g>;
        })}
      </g>
    </svg>
    <figcaption>{caption}</figcaption>
  </figure>;
};
