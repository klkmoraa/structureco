import type { ProjectModel, Selection, SupportType } from '../../types';
import type { TranslationKey } from '../../i18n/catalogs';

export interface SelectionQueryResult { nodeIds: string[]; memberIds: string[]; }
export const EMPTY_SELECTION_QUERY_RESULT: SelectionQueryResult = { nodeIds: [], memberIds: [] };
export type SelectionQueryId =
  | 'members.frame' | 'members.truss' | 'members.released' | 'members.loaded' | 'members.unloaded' | 'members.similar'
  | 'nodes.supported' | 'nodes.free' | 'nodes.loaded' | 'nodes.support.pin' | 'nodes.support.roller' | 'nodes.support.fixed';
export interface SelectionQuery { id: SelectionQueryId; labelKey: TranslationKey; needsSelection?: boolean; run: (project: ProjectModel, selection: Selection) => SelectionQueryResult; }

const members = (project: ProjectModel, predicate: (member: ProjectModel['members'][number]) => boolean): SelectionQueryResult => ({ nodeIds: [], memberIds: project.members.filter(predicate).map((member) => member.id) });
const nodes = (project: ProjectModel, predicate: (node: ProjectModel['nodes'][number]) => boolean): SelectionQueryResult => ({ nodeIds: project.nodes.filter(predicate).map((node) => node.id), memberIds: [] });
const support = (type: SupportType) => (node: ProjectModel['nodes'][number]) => node.support.type === type;
const memberLoadIds = (project: ProjectModel) => new Set(project.memberLoads.map((load) => load.memberId));
const nodeLoadIds = (project: ProjectModel) => new Set(project.nodalLoads.map((load) => load.nodeId));
const hasRelease = (member: ProjectModel['members'][number]) => Boolean(member.releases?.iMoment || member.releases?.jMoment);
const selectedMembers = (project: ProjectModel, selection: Selection): ProjectModel['members'] => {
  if (!selection) return [];
  const ids = new Set<string>();
  if (selection.kind === 'member') ids.add(selection.id);
  if (selection.kind === 'multi') selection.memberIds.forEach((id) => ids.add(id));
  if (selection.kind === 'memberLoad') { const load = project.memberLoads.find((item) => item.id === selection.id); if (load) ids.add(load.memberId); }
  return project.members.filter((member) => ids.has(member.id));
};
const similarityKey = (member: ProjectModel['members'][number]) => [member.type, member.sectionId ?? `A:${member.A}|I:${member.I}`, member.materialId ?? `E:${member.E}`].join('·');

/** Pure query catalogue used by the command palette; it never changes the project. */
export const SELECTION_QUERIES: readonly SelectionQuery[] = [
  { id: 'members.similar', labelKey: 'select.membersSimilar', needsSelection: true, run: (project, selection) => { const keys = new Set(selectedMembers(project, selection).map(similarityKey)); return keys.size ? members(project, (member) => keys.has(similarityKey(member))) : EMPTY_SELECTION_QUERY_RESULT; } },
  { id: 'members.frame', labelKey: 'select.membersFrame', run: (project) => members(project, (member) => member.type === 'frame') },
  { id: 'members.truss', labelKey: 'select.membersTruss', run: (project) => members(project, (member) => member.type === 'truss') },
  { id: 'members.released', labelKey: 'select.membersReleased', run: (project) => members(project, hasRelease) },
  { id: 'members.loaded', labelKey: 'select.membersLoaded', run: (project) => { const loaded = memberLoadIds(project); return members(project, (member) => loaded.has(member.id)); } },
  { id: 'members.unloaded', labelKey: 'select.membersUnloaded', run: (project) => { const loaded = memberLoadIds(project); return members(project, (member) => !loaded.has(member.id)); } },
  { id: 'nodes.supported', labelKey: 'select.nodesSupported', run: (project) => nodes(project, (node) => node.support.type !== 'none') },
  { id: 'nodes.free', labelKey: 'select.nodesFree', run: (project) => nodes(project, support('none')) },
  { id: 'nodes.loaded', labelKey: 'select.nodesLoaded', run: (project) => { const loaded = nodeLoadIds(project); return nodes(project, (node) => loaded.has(node.id)); } },
  { id: 'nodes.support.pin', labelKey: 'select.nodesPin', run: (project) => nodes(project, support('pin')) },
  { id: 'nodes.support.roller', labelKey: 'select.nodesRoller', run: (project) => nodes(project, support('roller')) },
  { id: 'nodes.support.fixed', labelKey: 'select.nodesFixed', run: (project) => nodes(project, support('fixed')) },
];

export const countOf = (result: SelectionQueryResult): number => result.nodeIds.length + result.memberIds.length;
export const toSelection = (result: SelectionQueryResult): Selection => countOf(result) ? { kind: 'multi', nodeIds: result.nodeIds, memberIds: result.memberIds } : null;
