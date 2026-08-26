import { useEffect, useMemo, useState } from 'react';
import { Check, X } from 'lucide-react';
import type { AnalysisResult, DiagramQuantity, ProjectModel } from '../../types';
import { evaluateDeformationAt, evaluateDiagramAt } from '../../engine/diagram';
import { summarizeAnalysisResults } from '../../engine/resultSummary';
import { toDisplay, unitLabel } from '../../engine/units';
import { formatFixed } from '../../utils/numberFormat';

type SheetQuantity = DiagramQuantity | 'deformed';

const quantities: ReadonlyArray<{ id: SheetQuantity; label: string; className: string }> = [
  { id: 'axial', label: 'Axial', className: 'axial' },
  { id: 'shear', label: 'Cortante', className: 'shear' },
  { id: 'moment', label: 'Momento', className: 'moment' },
  { id: 'deformed', label: 'Deformada', className: 'deformed' },
];

const storageKey = (projectId: string) => `structureco:diagram-sheet:${projectId}:v1`;

const readSelection = (projectId: string): SheetQuantity[] => {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(storageKey(projectId)) ?? 'null');
    if (Array.isArray(parsed) && parsed.length && parsed.every((item) => quantities.some((quantity) => quantity.id === item))) return parsed;
  } catch { /* preferences never block result reading */ }
  return ['shear', 'moment'];
};

const modelBounds = (project: ProjectModel) => {
  if (!project.nodes.length) return { minX: 0, minY: 0, width: 1, height: 1 };
  const xs = project.nodes.map((node) => node.x); const ys = project.nodes.map((node) => node.y);
  const minX = Math.min(...xs); const minY = Math.min(...ys);
  return { minX, minY, width: Math.max(1e-6, Math.max(...xs) - minX), height: Math.max(1e-6, Math.max(...ys) - minY) };
};

const ModelSketch = ({ project }: { project: ProjectModel }) => {
  const bounds = modelBounds(project); const width = 360; const height = 300; const pad = 34;
  const scale = Math.min((width - pad * 2) / bounds.width, (height - pad * 2) / bounds.height);
  const point = (x: number, y: number) => ({ x: pad + (x - bounds.minX) * scale, y: height - pad - (y - bounds.minY) * scale });
  const nodes = new Map(project.nodes.map((node) => [node.id, node]));
  return <section className="diagram-sheet-model" aria-label="Modelo global">
    <header><span>MODELO</span><strong>{project.members.length} barras · {project.nodes.length} nodos</strong></header>
    <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Modelo estructural global">
      <g className="diagram-sheet-model-grid">{Array.from({ length: 8 }, (_, index) => <line key={`v-${index}`} x1={index * 52} y1="0" x2={index * 52} y2={height} />)}{Array.from({ length: 7 }, (_, index) => <line key={`h-${index}`} x1="0" y1={index * 48} x2={width} y2={index * 48} />)}</g>
      <g className="diagram-sheet-model-members">{project.members.map((member) => { const a = nodes.get(member.i); const b = nodes.get(member.j); if (!a || !b) return null; const pa = point(a.x, a.y); const pb = point(b.x, b.y); return <line key={member.id} x1={pa.x} y1={pa.y} x2={pb.x} y2={pb.y} />; })}</g>
      <g className="diagram-sheet-model-nodes">{project.nodes.map((node) => { const p = point(node.x, node.y); return <g key={node.id}><circle cx={p.x} cy={p.y} r="4" />{node.support.type !== 'none' ? <path d={`M ${p.x - 9} ${p.y + 14} L ${p.x + 9} ${p.y + 14} L ${p.x} ${p.y + 5} Z`} /> : null}</g>; })}</g>
    </svg>
  </section>;
};

const DiagramRow = ({ project, analysis, quantity }: { project: ProjectModel; analysis: AnalysisResult; quantity: SheetQuantity }) => {
  const bounds = modelBounds(project); const width = 680; const height = 220; const pad = 32;
  const nodeMap = useMemo(() => new Map(project.nodes.map((node) => [node.id, node])), [project.nodes]);
  const resultMap = useMemo(() => new Map(analysis.memberResults.map((result) => [result.memberId, result])), [analysis.memberResults]);
  const maximum = useMemo(() => {
    if (quantity === 'deformed') return Math.max(1e-12, ...analysis.memberResults.flatMap((result) => result.deformation.map((point) => Math.abs(point.v))));
    return Math.max(1e-12, ...analysis.memberResults.flatMap((result) => result.criticalPoints.filter((point) => point.quantity === quantity).map((point) => Math.abs(point.value))));
  }, [analysis.memberResults, quantity]);
  const scale = Math.min((width - pad * 2) / bounds.width, 112 / Math.max(bounds.height, 1));
  const base = (x: number, y: number) => ({ x: pad + (x - bounds.minX) * scale, y: 132 - (y - bounds.minY) * scale });
  const diagramScale = 62 / maximum;
  const label = quantities.find((item) => item.id === quantity)?.label ?? quantity;
  const unit = quantity === 'moment' ? unitLabel(project.settings.units, 'moment') : quantity === 'deformed' ? unitLabel(project.settings.units, 'length') : unitLabel(project.settings.units, 'force');
  const maximumPoint = quantity === 'deformed'
    ? analysis.memberResults.flatMap((result) => result.deformationCriticalPoints.filter((point) => point.quantity === 'v').map((point) => ({ memberId: result.memberId, value: point.value }))).reduce<{ memberId: string; value: number } | null>((best, point) => !best || Math.abs(point.value) > Math.abs(best.value) ? point : best, null)
    : summarizeAnalysisResults(analysis).diagrams[quantity]?.absolute ?? null;
  return <section className={`diagram-sheet-row ${quantity}`} aria-label={`${label} global`}>
    <header><span>{label}</span>{maximumPoint ? <strong>{formatFixed(toDisplay(maximumPoint.value, project.settings.units, quantity === 'moment' ? 'moment' : quantity === 'deformed' ? 'length' : 'force'), 2)} {unit}</strong> : null}</header>
    <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`Diagrama global de ${label}`}>
      <line className="diagram-sheet-baseline" x1={pad} y1="132" x2={width - pad} y2="132" />
      {project.members.map((member) => {
        const a = nodeMap.get(member.i); const b = nodeMap.get(member.j); const result = resultMap.get(member.id);
        if (!a || !b || !result) return null;
        const start = base(a.x, a.y); const end = base(b.x, b.y); const dx = end.x - start.x; const dy = end.y - start.y; const length = Math.max(result.length, 1e-9);
        const normal = { x: -dy / Math.hypot(dx, dy), y: dx / Math.hypot(dx, dy) };
        const points = Array.from({ length: 25 }, (_, index) => {
          const x = length * index / 24;
          const value = quantity === 'deformed' ? (evaluateDeformationAt(result.deformationSegments, x)?.v ?? 0) : (evaluateDiagramAt(result.diagramSegments, result.diagramJumps, x, 'right')?.[quantity] ?? 0);
          const px = start.x + dx * (x / length); const py = start.y + dy * (x / length);
          const offset = value * diagramScale;
          return `${px + normal.x * offset},${py + normal.y * offset}`;
        }).join(' ');
        return <g key={member.id}><line className="diagram-sheet-member" x1={start.x} y1={start.y} x2={end.x} y2={end.y} /><polyline className="diagram-sheet-curve" points={points} /></g>;
      })}
    </svg>
  </section>;
};

export const DiagramSheet = ({ project, analysis, onClose }: { project: ProjectModel; analysis: AnalysisResult; onClose: () => void }) => {
  const [selected, setSelected] = useState<SheetQuantity[]>(() => readSelection(project.id));
  useEffect(() => { try { window.localStorage.setItem(storageKey(project.id), JSON.stringify(selected)); } catch { /* optional preference */ } }, [project.id, selected]);
  const toggle = (quantity: SheetQuantity) => setSelected((current) => current.includes(quantity)
    ? current.length === 1 ? current : current.filter((item) => item !== quantity)
    : [...current, quantity]);
  return <section className="diagram-sheet" aria-label="Lámina de diagramas" data-testid="diagram-sheet">
    <header className="diagram-sheet-header"><div><span>RESULTADOS</span><strong>Lámina de diagramas</strong><small>Vista global · desplázate o acerca el plano para leerlo</small></div><button type="button" onClick={onClose} aria-label="Cerrar lámina de diagramas"><X size={18} /></button></header>
    <div className="diagram-sheet-choices" role="group" aria-label="Diagramas visibles">{quantities.map((quantity) => <button key={quantity.id} type="button" className={selected.includes(quantity.id) ? 'active' : ''} aria-pressed={selected.includes(quantity.id)} onClick={() => toggle(quantity.id)}>{selected.includes(quantity.id) ? <Check size={15} /> : null}{quantity.label}</button>)}</div>
    <div className="diagram-sheet-scroll"><div className="diagram-sheet-canvas"><ModelSketch project={project} /><div className="diagram-sheet-diagrams">{selected.map((quantity) => <DiagramRow key={quantity} project={project} analysis={analysis} quantity={quantity} />)}</div></div></div>
  </section>;
};
