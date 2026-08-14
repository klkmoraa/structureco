import type { UnitQuantity } from '../../engine/units';
import { findStandardMaterial } from '../../data/standardMaterials';
import { findStandardSection } from '../../data/standardSections';
import type { TranslationKey } from '../../i18n/catalogs';
import type { MemberModel, NodeModel, ProjectModel } from '../../types';

/**
 * Proyección tabular del modelo estructural.
 *
 * Este módulo es puro y no conoce React, el store ni el idioma activo: recibe un
 * `ProjectModel` y devuelve filas. Esa es la garantía de que el datasheet no
 * puede convertirse en una segunda fuente de verdad — no hay dónde guardar una
 * copia divergente porque no hay estado que guardar.
 *
 * Las magnitudes viajan siempre en **unidades base internas** (kN, m, m², m⁴).
 * La conversión a las unidades del proyecto ocurre al presentar, nunca aquí: si
 * el orden dependiera del sistema de unidades mostrado, la misma columna
 * ordenaría distinto en kN-m y en kip-ft.
 */

export type DatasheetEntity = 'nodes' | 'members';

/**
 * Por qué una celda no se puede editar. Se declara desde la fase de sólo
 * lectura para que CRI-82 abra exactamente las celdas `pending` y ninguna más.
 */
export type DatasheetEditability =
  /** Nunca editable: identidad y referencias estructurales. */
  | 'identity'
  /** Nunca editable: se calcula del modelo. */
  | 'derived'
  /** Editable, todavía no en esta fase. */
  | 'pending';

/**
 * Valor de una celda.
 *
 * - `number` lleva la magnitud en unidad base y la cantidad con la que se
 *   convierte y se rotula; `null` es ausencia real, no cero.
 * - `token` lleva una clave estable del dominio (`pin`, `frame`, …) y su clave
 *   de traducción. Se guarda el token, no el texto, para que ordenar y filtrar
 *   no dependan del idioma.
 * - `text` es texto ya legible que no procede de un enumerado (nombre de
 *   catálogo, resumen de liberaciones).
 */
export type DatasheetValue =
  | { kind: 'text'; text: string }
  | { kind: 'number'; value: number | null; quantity?: UnitQuantity }
  | { kind: 'token'; token: string; labelKey: TranslationKey };

export interface DatasheetColumn {
  id: string;
  labelKey: TranslationKey;
  editability: DatasheetEditability;
  /** Cantidad física de la columna; su ausencia significa adimensional. */
  quantity?: UnitQuantity;
  /** Las columnas numéricas se alinean a la derecha para poder compararlas. */
  numeric?: boolean;
}

export interface DatasheetRow {
  id: string;
  kind: 'node' | 'member';
  values: Readonly<Record<string, DatasheetValue>>;
}

export interface DatasheetFacet {
  columnId: string;
  labelKey: TranslationKey;
  /** Tokens presentes en el modelo actual, en orden estable de catálogo. */
  options: ReadonlyArray<{ token: string; labelKey: TranslationKey; count: number }>;
}

export type DatasheetSortDirection = 'asc' | 'desc';

export interface DatasheetSort {
  columnId: string;
  direction: DatasheetSortDirection;
}

const SUPPORT_LABELS: Record<string, TranslationKey> = {
  none: 'datasheet.support.none',
  pin: 'datasheet.support.pin',
  roller: 'datasheet.support.roller',
  fixed: 'datasheet.support.fixed',
  custom: 'datasheet.support.custom',
};

const MEMBER_TYPE_LABELS: Record<string, TranslationKey> = {
  frame: 'datasheet.memberType.frame',
  truss: 'datasheet.memberType.truss',
  rigid: 'datasheet.memberType.rigid',
};

const ORIGIN_LABELS: Record<string, TranslationKey> = {
  catalog: 'datasheet.origin.catalog',
  custom: 'datasheet.origin.custom',
  imported: 'datasheet.origin.imported',
  legacy: 'datasheet.origin.legacy',
};

const BOOLEAN_LABELS: Record<string, TranslationKey> = {
  yes: 'datasheet.boolean.yes',
  no: 'datasheet.boolean.no',
};

/** Orden de presentación de los tokens; el orden alfabético no dice nada aquí. */
const TOKEN_ORDER: Record<string, readonly string[]> = {
  support: ['none', 'pin', 'roller', 'fixed', 'custom'],
  type: ['frame', 'truss', 'rigid'],
  materialOrigin: ['catalog', 'custom', 'imported', 'legacy'],
  hinge: ['no', 'yes'],
};

export const NODE_COLUMNS: readonly DatasheetColumn[] = [
  { id: 'id', labelKey: 'datasheet.column.id', editability: 'identity' },
  { id: 'x', labelKey: 'datasheet.column.x', editability: 'pending', quantity: 'length', numeric: true },
  { id: 'y', labelKey: 'datasheet.column.y', editability: 'pending', quantity: 'length', numeric: true },
  { id: 'support', labelKey: 'datasheet.column.support', editability: 'pending' },
  { id: 'restraints', labelKey: 'datasheet.column.restraints', editability: 'derived' },
  { id: 'hinge', labelKey: 'datasheet.column.hinge', editability: 'pending' },
  { id: 'loads', labelKey: 'datasheet.column.loads', editability: 'derived', numeric: true },
];

export const MEMBER_COLUMNS: readonly DatasheetColumn[] = [
  { id: 'id', labelKey: 'datasheet.column.id', editability: 'identity' },
  { id: 'i', labelKey: 'datasheet.column.nodeI', editability: 'identity' },
  { id: 'j', labelKey: 'datasheet.column.nodeJ', editability: 'identity' },
  { id: 'type', labelKey: 'datasheet.column.memberType', editability: 'pending' },
  { id: 'length', labelKey: 'datasheet.column.length', editability: 'derived', quantity: 'length', numeric: true },
  { id: 'material', labelKey: 'datasheet.column.material', editability: 'pending' },
  { id: 'materialOrigin', labelKey: 'datasheet.column.materialOrigin', editability: 'derived' },
  { id: 'E', labelKey: 'datasheet.column.elasticModulus', editability: 'pending', quantity: 'elasticModulus', numeric: true },
  { id: 'section', labelKey: 'datasheet.column.section', editability: 'pending' },
  { id: 'A', labelKey: 'datasheet.column.area', editability: 'pending', quantity: 'area', numeric: true },
  { id: 'I', labelKey: 'datasheet.column.inertia', editability: 'pending', quantity: 'inertia', numeric: true },
  { id: 'releases', labelKey: 'datasheet.column.releases', editability: 'pending' },
  { id: 'loads', labelKey: 'datasheet.column.loads', editability: 'derived', numeric: true },
];

export const datasheetColumns = (entity: DatasheetEntity): readonly DatasheetColumn[] =>
  entity === 'nodes' ? NODE_COLUMNS : MEMBER_COLUMNS;

/** Columnas cuyos tokens se ofrecen como filtro; el resto tiene demasiados valores. */
export const datasheetFacetColumnIds = (entity: DatasheetEntity): readonly string[] =>
  entity === 'nodes' ? ['support'] : ['type', 'materialOrigin'];

const booleanValue = (value: boolean): DatasheetValue => ({
  kind: 'token',
  token: value ? 'yes' : 'no',
  labelKey: BOOLEAN_LABELS[value ? 'yes' : 'no'],
});

/**
 * Grados restringidos del apoyo, en el mismo lenguaje que usa el solver.
 *
 * Un rodillo restringe su normal, no un eje global, así que se rotula como tal
 * en vez de traducirlo a X o Y: la orientación vive en `angleDeg`.
 */
const restraintSummary = (node: NodeModel): string => {
  const support = node.support;
  switch (support.type) {
    case 'none': return '—';
    case 'pin': return 'X Y';
    case 'fixed': return 'X Y Rz';
    case 'roller': return `n ${Math.round(support.angleDeg ?? 90)}°`;
    case 'custom': {
      const parts = [
        support.restrainX ? 'X' : null,
        support.restrainY ? 'Y' : null,
        support.restrainR ? 'Rz' : null,
      ].filter((part): part is string => part !== null);
      return parts.length > 0 ? parts.join(' ') : '—';
    }
  }
};

const releaseSummary = (member: MemberModel): string => {
  const parts = [
    member.releases?.iMoment ? 'i' : null,
    member.releases?.jMoment ? 'j' : null,
  ].filter((part): part is string => part !== null);
  return parts.length > 0 ? parts.join(' ') : '—';
};

/**
 * Nombre de material o sección.
 *
 * Sólo una identidad de catálogo se rotula con su nombre; cualquier otro origen
 * se rotula como personalizado. Deducir un perfil a partir de A e I sería
 * inventar una identidad que el modelo no declara, la misma regla que aplica
 * `resolveSectionGeometry`.
 */
const catalogName = (
  id: string | undefined,
  origin: MemberModel['materialOrigin'],
  lookup: (id: string) => { name: string } | undefined,
): DatasheetValue => {
  if (origin === 'catalog' && id) {
    const found = lookup(id);
    if (found) return { kind: 'text', text: found.name };
  }
  return { kind: 'token', token: 'custom', labelKey: ORIGIN_LABELS.custom };
};

const nodeRow = (
  node: NodeModel,
  loadCount: number,
): DatasheetRow => ({
  id: node.id,
  kind: 'node',
  values: {
    id: { kind: 'text', text: node.id },
    x: { kind: 'number', value: node.x, quantity: 'length' },
    y: { kind: 'number', value: node.y, quantity: 'length' },
    support: { kind: 'token', token: node.support.type, labelKey: SUPPORT_LABELS[node.support.type] },
    restraints: { kind: 'text', text: restraintSummary(node) },
    hinge: booleanValue(node.internalHinge === true),
    loads: { kind: 'number', value: loadCount },
  },
});

const memberRow = (
  member: MemberModel,
  length: number | null,
  loadCount: number,
): DatasheetRow => {
  const materialOrigin = member.materialOrigin ?? 'custom';
  return {
    id: member.id,
    kind: 'member',
    values: {
      id: { kind: 'text', text: member.id },
      i: { kind: 'text', text: member.i },
      j: { kind: 'text', text: member.j },
      type: { kind: 'token', token: member.type, labelKey: MEMBER_TYPE_LABELS[member.type] },
      length: { kind: 'number', value: length, quantity: 'length' },
      material: catalogName(member.materialId, member.materialOrigin, findStandardMaterial),
      materialOrigin: { kind: 'token', token: materialOrigin, labelKey: ORIGIN_LABELS[materialOrigin] },
      E: { kind: 'number', value: member.E, quantity: 'elasticModulus' },
      section: catalogName(member.sectionId, member.sectionOrigin, findStandardSection),
      A: { kind: 'number', value: member.A, quantity: 'area' },
      I: { kind: 'number', value: member.I, quantity: 'inertia' },
      releases: { kind: 'text', text: releaseSummary(member) },
      loads: { kind: 'number', value: loadCount },
    },
  };
};

/**
 * Proyecta el modelo a filas. Recorre cada colección una sola vez y cuenta las
 * cargas con índices previos: contar dentro del bucle de nudos convertiría una
 * tabla de mil filas en un recorrido cuadrático sobre las cargas.
 */
export const projectDatasheetRows = (
  project: ProjectModel,
  entity: DatasheetEntity,
): DatasheetRow[] => {
  if (entity === 'nodes') {
    const loadsByNode = new Map<string, number>();
    for (const load of project.nodalLoads) loadsByNode.set(load.nodeId, (loadsByNode.get(load.nodeId) ?? 0) + 1);
    for (const item of project.prescribedDisplacements ?? []) {
      loadsByNode.set(item.nodeId, (loadsByNode.get(item.nodeId) ?? 0) + 1);
    }
    return project.nodes.map((node) => nodeRow(node, loadsByNode.get(node.id) ?? 0));
  }

  const loadsByMember = new Map<string, number>();
  for (const load of project.memberLoads) loadsByMember.set(load.memberId, (loadsByMember.get(load.memberId) ?? 0) + 1);
  for (const effect of project.memberInitialEffects ?? []) {
    loadsByMember.set(effect.memberId, (loadsByMember.get(effect.memberId) ?? 0) + 1);
  }
  const nodeById = new Map(project.nodes.map((node) => [node.id, node]));
  return project.members.map((member) => {
    const start = nodeById.get(member.i);
    const end = nodeById.get(member.j);
    // Una barra puede referenciar un nudo ausente en un modelo importado a
    // medias: se muestra sin longitud en vez de propagar un NaN por la columna.
    const length = start && end ? Math.hypot(end.x - start.x, end.y - start.y) : null;
    return memberRow(member, length, loadsByMember.get(member.id) ?? 0);
  });
};

/** Texto sobre el que busca la caja de búsqueda; el llamador traduce los tokens. */
export const datasheetRowSearchText = (
  row: DatasheetRow,
  translateToken: (labelKey: TranslationKey) => string,
  formatNumeric: (value: number, quantity?: UnitQuantity) => string,
): string => {
  const parts: string[] = [row.id];
  for (const value of Object.values(row.values)) {
    if (value.kind === 'text') parts.push(value.text);
    else if (value.kind === 'token') parts.push(translateToken(value.labelKey));
    else if (value.value !== null) parts.push(formatNumeric(value.value, value.quantity));
  }
  return parts.join(' ').toLowerCase();
};

/**
 * Búsqueda por subcadena sobre el texto ya presentado.
 *
 * Se normalizan los acentos para que «seccion» encuentre «sección»: en un
 * datasheet técnico, obligar a acentuar es una barrera sin contrapartida.
 */
const normalizeSearch = (value: string): string =>
  value.trim().toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '');

export const searchDatasheetRows = (
  rows: readonly DatasheetRow[],
  query: string,
  haystack: (row: DatasheetRow) => string,
): DatasheetRow[] => {
  const needle = normalizeSearch(query);
  if (needle === '') return [...rows];
  return rows.filter((row) => normalizeSearch(haystack(row)).includes(needle));
};

/** Facetas presentes en las filas dadas, con su recuento y en orden de dominio. */
export const datasheetFacets = (
  rows: readonly DatasheetRow[],
  entity: DatasheetEntity,
): DatasheetFacet[] => {
  const columns = datasheetColumns(entity);
  return datasheetFacetColumnIds(entity).flatMap((columnId) => {
    const column = columns.find((candidate) => candidate.id === columnId);
    if (!column) return [];
    const counts = new Map<string, { labelKey: TranslationKey; count: number }>();
    for (const row of rows) {
      const value = row.values[columnId];
      if (value?.kind !== 'token') continue;
      const current = counts.get(value.token);
      if (current) current.count += 1;
      else counts.set(value.token, { labelKey: value.labelKey, count: 1 });
    }
    const order = TOKEN_ORDER[columnId] ?? [];
    const options = [...counts.entries()]
      .map(([token, entry]) => ({ token, labelKey: entry.labelKey, count: entry.count }))
      .sort((first, second) => {
        const firstIndex = order.indexOf(first.token);
        const secondIndex = order.indexOf(second.token);
        if (firstIndex !== secondIndex) return (firstIndex < 0 ? order.length : firstIndex) - (secondIndex < 0 ? order.length : secondIndex);
        return first.token.localeCompare(second.token);
      });
    return options.length > 1 ? [{ columnId, labelKey: column.labelKey, options }] : [];
  });
};

/** Filtros activos por columna. Un conjunto vacío no filtra: no oculta todo. */
export type DatasheetFilters = Readonly<Record<string, ReadonlySet<string>>>;

export const filterDatasheetRows = (
  rows: readonly DatasheetRow[],
  filters: DatasheetFilters,
): DatasheetRow[] => {
  const active = Object.entries(filters).filter(([, tokens]) => tokens.size > 0);
  if (active.length === 0) return [...rows];
  return rows.filter((row) => active.every(([columnId, tokens]) => {
    const value = row.values[columnId];
    return value?.kind === 'token' && tokens.has(value.token);
  }));
};

/**
 * Comparación estable dentro de una columna.
 *
 * Los números se comparan como números y la ausencia (`null`) va siempre al
 * final, ascendente o descendente: una celda vacía no es «menor que cero», es
 * una celda sin dato, y enterrarla entre valores reales la haría parecer uno.
 * Los tokens se comparan por su clave estable, nunca por su traducción.
 */
const compareValues = (first: DatasheetValue | undefined, second: DatasheetValue | undefined): number => {
  if (!first || !second) return 0;
  if (first.kind === 'number' && second.kind === 'number') {
    if (first.value === null) return second.value === null ? 0 : 1;
    if (second.value === null) return -1;
    return first.value - second.value;
  }
  const firstText = first.kind === 'token' ? first.token : first.kind === 'text' ? first.text : '';
  const secondText = second.kind === 'token' ? second.token : second.kind === 'text' ? second.text : '';
  return firstText.localeCompare(secondText, undefined, { numeric: true, sensitivity: 'base' });
};

/**
 * Ordena por una columna. Con valores iguales gana el orden del modelo, así que
 * reordenar dos veces por la misma columna devuelve exactamente la misma tabla.
 */
export const sortDatasheetRows = (
  rows: readonly DatasheetRow[],
  sort: DatasheetSort | null,
): DatasheetRow[] => {
  if (!sort) return [...rows];
  const indexed = rows.map((row, index) => ({ row, index }));
  const sign = sort.direction === 'asc' ? 1 : -1;
  indexed.sort((first, second) => {
    const firstValue = first.row.values[sort.columnId];
    const secondValue = second.row.values[sort.columnId];
    // La ausencia se mantiene al final en ambos sentidos, así que no se invierte.
    if (firstValue?.kind === 'number' && secondValue?.kind === 'number') {
      if (firstValue.value === null || secondValue.value === null) {
        const comparison = compareValues(firstValue, secondValue);
        if (comparison !== 0) return comparison;
        return first.index - second.index;
      }
    }
    const comparison = compareValues(firstValue, secondValue) * sign;
    return comparison !== 0 ? comparison : first.index - second.index;
  });
  return indexed.map((entry) => entry.row);
};

export interface DatasheetPipelineInput {
  rows: readonly DatasheetRow[];
  query: string;
  filters: DatasheetFilters;
  sort: DatasheetSort | null;
  haystack: (row: DatasheetRow) => string;
}

/** Búsqueda, después filtros, después orden. El orden nunca decide qué se ve. */
export const applyDatasheetPipeline = ({
  rows,
  query,
  filters,
  sort,
  haystack,
}: DatasheetPipelineInput): DatasheetRow[] =>
  sortDatasheetRows(filterDatasheetRows(searchDatasheetRows(rows, query, haystack), filters), sort);
