import { useMemo, type ReactNode } from 'react';
import { Anchor, Box, Layers, MapPin, Weight } from 'lucide-react';
import { findStandardMaterial } from '../../data/standardMaterials';
import { Surface } from '../../design-system/components/surface';
import { unitLabel } from '../../engine/units';
import type { TranslationKey } from '../../i18n/catalogs';
import type { MemberModel, NodeModel, ProjectModel, UnitSystemId } from '../../types';
import { resolveSectionGeometry, sectionShapeLayout } from '../inspector/sectionGeometry';
import { SectionShape } from '../inspector/SectionShape';
import type { DatasheetRowKind } from './datasheetModel';
import { formatDatasheetNumber } from './datasheetPresentation';

/**
 * Panel contextual del datasheet: «ver lo que estás creando».
 *
 * Cinco tarjetas de sólo lectura —Nodo, Apoyo, Material, Sección y Carga— que
 * describen la fila enfocada con la misma geometría y el mismo lenguaje visual
 * que ya usan el Inspector y la edición múltiple: `resolveSectionGeometry` para
 * la forma real, la rectangular equivalente cuando no hay identidad de catálogo,
 * y los mismos glifos de apoyo del preview de selección.
 *
 * En esta fase **nada de aquí escribe**. La escritura llega en CRI-82 por las
 * rutas que ya existen (`executeProjectCommand` y `updateProject`), no por una
 * ruta propia del datasheet.
 */

type Translate = (key: TranslationKey, variables?: Record<string, string | number>) => string;

const NODE_VIEW = { width: 200, height: 120, padding: 26 };
const SECTION_VIEW = { width: 180, height: 130, padding: 22 };

const Card = ({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof MapPin;
  title: string;
  children: ReactNode;
}) => <Surface as="section" level="raised" className="datasheet-card" aria-label={title}>
  <h3 className="datasheet-card__title"><Icon size={15} aria-hidden="true" />{title}</h3>
  {children}
</Surface>;

const Facts = ({ items }: { items: ReadonlyArray<{ label: string; value: string }> }) =>
  <dl className="datasheet-facts">
    {items.map((item) => <div key={item.label}>
      <dt>{item.label}</dt>
      <dd>{item.value}</dd>
    </div>)}
  </dl>;

/** Glifo de apoyo con la misma convención de dibujo que el preview del Inspector. */
const SupportGlyph = ({ support }: { support: NodeModel['support'] }) => {
  if (support.type === 'none') return null;
  const x = 40;
  const y = 26;
  if (support.type === 'fixed') {
    return <g className="datasheet-support-glyph">
      <line x1={x - 16} y1={y + 9} x2={x + 16} y2={y + 9} />
      {[-12, -5, 2, 9].map((offset) => <line key={offset} x1={x + offset} y1={y + 9} x2={x + offset - 6} y2={y + 16} />)}
    </g>;
  }
  return <g className="datasheet-support-glyph">
    <polygon points={`${x},${y} ${x - 12},${y + 16} ${x + 12},${y + 16}`} />
    <line x1={x - 15} y1={y + 16} x2={x + 15} y2={y + 16} />
    {support.type === 'roller'
      ? <>
        <circle cx={x - 6} cy={y + 20} r="3.2" />
        <circle cx={x + 6} cy={y + 20} r="3.2" />
      </>
      : [-9, -2, 5].map((offset) => <line key={offset} x1={x + offset} y1={y + 16} x2={x + offset - 6} y2={y + 23} />)}
  </g>;
};

/**
 * Vecindad del nudo: el propio nudo y las barras que llegan a él.
 *
 * El encuadre se calcula sobre esa vecindad, no sobre el modelo entero, para que
 * un nudo de una estructura de cien metros siga siendo legible.
 */
const NodeNeighborhood = ({ project, node }: { project: ProjectModel; node: NodeModel }) => {
  const geometry = useMemo(() => {
    const nodeById = new Map(project.nodes.map((item) => [item.id, item]));
    const edges = project.members
      .filter((member) => member.i === node.id || member.j === node.id)
      .map((member) => nodeById.get(member.i === node.id ? member.j : member.i))
      .filter((item): item is NodeModel => item !== undefined);
    const points = [node, ...edges];
    const xs = points.map((point) => point.x);
    const ys = points.map((point) => point.y);
    const spanX = Math.max(Math.max(...xs) - Math.min(...xs), 1e-6);
    const spanY = Math.max(Math.max(...ys) - Math.min(...ys), 1e-6);
    const scale = Math.min(
      (NODE_VIEW.width - NODE_VIEW.padding * 2) / spanX,
      (NODE_VIEW.height - NODE_VIEW.padding * 2) / spanY,
    );
    const centerX = (Math.min(...xs) + Math.max(...xs)) / 2;
    const centerY = (Math.min(...ys) + Math.max(...ys)) / 2;
    const toScreen = (point: { x: number; y: number }) => ({
      x: NODE_VIEW.width / 2 + (point.x - centerX) * scale,
      // Y del modelo hacia arriba, Y del SVG hacia abajo.
      y: NODE_VIEW.height / 2 - (point.y - centerY) * scale,
    });
    return { edges: edges.map(toScreen), center: toScreen(node) };
  }, [node, project.members, project.nodes]);

  return <svg
    className="datasheet-node-preview"
    viewBox={`0 0 ${NODE_VIEW.width} ${NODE_VIEW.height}`}
    role="presentation"
  >
    {geometry.edges.map((point, index) => <line
      key={index}
      className="datasheet-node-preview__member"
      x1={geometry.center.x}
      y1={geometry.center.y}
      x2={point.x}
      y2={point.y}
    />)}
    <circle
      className="datasheet-node-preview__node"
      cx={geometry.center.x}
      cy={geometry.center.y}
      r="4.5"
    />
  </svg>;
};

const SectionPreview = ({ member }: { member: MemberModel }) => {
  const geometry = resolveSectionGeometry({
    area: member.A,
    inertia: member.I,
    sectionId: member.sectionId,
    sectionOrigin: member.sectionOrigin,
  });
  const layout = sectionShapeLayout(geometry, SECTION_VIEW);
  return <svg
    className="datasheet-section-preview"
    viewBox={`0 0 ${SECTION_VIEW.width} ${SECTION_VIEW.height}`}
    role="presentation"
  >
    <SectionShape shapeType={geometry.shapeType} layout={layout} />
  </svg>;
};

const NodeCards = ({
  project,
  node,
  units,
  t,
}: {
  project: ProjectModel;
  node: NodeModel;
  units: UnitSystemId;
  t: Translate;
}) => {
  const lengthUnit = unitLabel(units, 'length');
  const loads = project.nodalLoads.filter((load) => load.nodeId === node.id);
  const prescribed = (project.prescribedDisplacements ?? []).filter((item) => item.nodeId === node.id);
  const caseName = (caseId: string) => project.loadCases.find((item) => item.id === caseId)?.name ?? caseId;

  return <>
    <Card icon={MapPin} title={t('datasheet.card.node')}>
      <NodeNeighborhood project={project} node={node} />
      <Facts items={[
        { label: t('datasheet.column.id'), value: node.id },
        { label: `X (${lengthUnit})`, value: formatDatasheetNumber(node.x, units, 'length') },
        { label: `Y (${lengthUnit})`, value: formatDatasheetNumber(node.y, units, 'length') },
        { label: t('datasheet.column.hinge'), value: t(node.internalHinge ? 'datasheet.boolean.yes' : 'datasheet.boolean.no') },
      ]} />
    </Card>

    <Card icon={Anchor} title={t('datasheet.card.support')}>
      {node.support.type === 'none'
        ? <p className="datasheet-card__empty">{t('datasheet.support.noneHint')}</p>
        : <svg className="datasheet-support-preview" viewBox="0 0 80 60" role="presentation">
          <circle className="datasheet-node-preview__node" cx="40" cy="26" r="4" />
          <SupportGlyph support={node.support} />
        </svg>}
      <Facts items={[
        { label: t('datasheet.column.support'), value: t(`datasheet.support.${node.support.type}` as TranslationKey) },
        ...(node.support.type === 'roller'
          ? [{ label: t('datasheet.field.normalAngle'), value: `${Math.round(node.support.angleDeg ?? 90)}°` }]
          : []),
        ...(node.support.spring
          ? [{ label: t('datasheet.field.spring'), value: t('datasheet.boolean.yes') }]
          : []),
      ]} />
    </Card>

    <Card icon={Weight} title={t('datasheet.card.load')}>
      {loads.length === 0 && prescribed.length === 0
        ? <p className="datasheet-card__empty">{t('datasheet.card.noLoads')}</p>
        : <ul className="datasheet-load-list">
          {loads.map((load) => <li key={load.id}>
            <span className="datasheet-load-list__case">{caseName(load.caseId)}</span>
            <span>{`Fx ${formatDatasheetNumber(load.fx, units, 'force')} · Fy ${formatDatasheetNumber(load.fy, units, 'force')} · Mz ${formatDatasheetNumber(load.mz, units, 'moment')}`}</span>
          </li>)}
          {prescribed.map((item) => <li key={item.id}>
            <span className="datasheet-load-list__case">{caseName(item.caseId)}</span>
            <span>{`${item.component} = ${formatDatasheetNumber(item.value, units, 'length')} ${lengthUnit}`}</span>
          </li>)}
        </ul>}
    </Card>
  </>;
};

const MemberCards = ({
  project,
  member,
  units,
  t,
}: {
  project: ProjectModel;
  member: MemberModel;
  units: UnitSystemId;
  t: Translate;
}) => {
  const catalogMaterial = member.materialOrigin === 'catalog' && member.materialId
    ? findStandardMaterial(member.materialId)
    : undefined;
  const geometry = resolveSectionGeometry({
    area: member.A,
    inertia: member.I,
    sectionId: member.sectionId,
    sectionOrigin: member.sectionOrigin,
  });
  const loads = project.memberLoads.filter((load) => load.memberId === member.id);
  const caseName = (caseId: string) => project.loadCases.find((item) => item.id === caseId)?.name ?? caseId;
  const lengthUnit = unitLabel(units, 'length');

  return <>
    <Card icon={Layers} title={t('datasheet.card.material')}>
      <p className="datasheet-card__lead">{catalogMaterial?.name ?? t('datasheet.origin.custom')}</p>
      <Facts items={[
        { label: `E (${unitLabel(units, 'elasticModulus')})`, value: formatDatasheetNumber(member.E, units, 'elasticModulus') },
        ...(member.G !== undefined
          ? [{ label: `G (${unitLabel(units, 'elasticModulus')})`, value: formatDatasheetNumber(member.G, units, 'elasticModulus') }]
          : []),
        ...(member.density !== undefined
          ? [{ label: `ρ (${unitLabel(units, 'density')})`, value: formatDatasheetNumber(member.density, units, 'density') }]
          : []),
        { label: t('datasheet.column.materialOrigin'), value: t(`datasheet.origin.${member.materialOrigin ?? 'custom'}` as TranslationKey) },
      ]} />
    </Card>

    <Card icon={Box} title={t('datasheet.card.section')}>
      <SectionPreview member={member} />
      <p className="datasheet-card__lead">{geometry.section?.name ?? t('datasheet.section.equivalent')}</p>
      <Facts items={[
        { label: `A (${unitLabel(units, 'area')})`, value: formatDatasheetNumber(member.A, units, 'area') },
        { label: `I (${unitLabel(units, 'inertia')})`, value: formatDatasheetNumber(member.I, units, 'inertia') },
        { label: `h (${lengthUnit})`, value: formatDatasheetNumber(geometry.depth, units, 'length') },
        { label: `b (${lengthUnit})`, value: formatDatasheetNumber(geometry.width, units, 'length') },
      ]} />
      {geometry.section ? null : <p className="datasheet-card__note">{t('datasheet.section.equivalentHint')}</p>}
    </Card>

    <Card icon={Weight} title={t('datasheet.card.load')}>
      {loads.length === 0
        ? <p className="datasheet-card__empty">{t('datasheet.card.noLoads')}</p>
        : <ul className="datasheet-load-list">
          {loads.map((load) => <li key={load.id}>
            <span className="datasheet-load-list__case">{caseName(load.caseId)}</span>
            <span>{describeMemberLoad(load, units)}</span>
          </li>)}
        </ul>}
    </Card>
  </>;
};

/** Resumen de una carga de barra en su propia familia; nada de campos ajenos. */
const describeMemberLoad = (load: ProjectModel['memberLoads'][number], units: UnitSystemId): string => {
  if (load.type === 'moment') {
    return `M ${formatDatasheetNumber(load.moment ?? 0, units, 'moment')} ${unitLabel(units, 'moment')}`;
  }
  if (load.type === 'point') {
    const px = formatDatasheetNumber(load.px ?? 0, units, 'force');
    const py = formatDatasheetNumber(load.py ?? 0, units, 'force');
    return `Px ${px} · Py ${py} ${unitLabel(units, 'force')}`;
  }
  const start = formatDatasheetNumber(load.qyStart ?? 0, units, 'distributedForce');
  const end = formatDatasheetNumber(load.qyEnd ?? load.qyStart ?? 0, units, 'distributedForce');
  return `q ${start} → ${end} ${unitLabel(units, 'distributedForce')}`;
};

export interface DatasheetContextPanelProps {
  project: ProjectModel;
  /** Fila enfocada; `null` cuando la tabla está vacía o el objeto desapareció. */
  target: { kind: DatasheetRowKind; id: string } | null;
  units: UnitSystemId;
  t: Translate;
  onFocusObject: () => void;
  focusLabel: string;
}

export const DatasheetContextPanel = ({
  project,
  target,
  units,
  t,
  onFocusObject,
  focusLabel,
}: DatasheetContextPanelProps) => {
  const node = target?.kind === 'node' ? project.nodes.find((item) => item.id === target.id) : undefined;
  const member = target?.kind === 'member' ? project.members.find((item) => item.id === target.id) : undefined;

  return <aside className="datasheet-context" aria-label={t('datasheet.contextLabel')}>
    <header className="datasheet-context__header">
      <p className="datasheet-context__object">{target?.id ?? '—'}</p>
      <button type="button" className="datasheet-focus-action" onClick={onFocusObject} disabled={!target}>
        {focusLabel}
      </button>
    </header>
    <div className="datasheet-context__body">
      {node ? <NodeCards project={project} node={node} units={units} t={t} /> : null}
      {member ? <MemberCards project={project} member={member} units={units} t={t} /> : null}
      {!node && !member ? <p className="datasheet-card__empty">{t('datasheet.contextEmpty')}</p> : null}
    </div>
    <p className="datasheet-context__note">{t('datasheet.readOnlyPhase')}</p>
  </aside>;
};
