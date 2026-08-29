import { applyProjectPatch, compileProjectCommand, type ProjectCommand } from '../commands/projectCommand';
import { standardMaterials } from '../data/standardMaterials';
import { standardSections } from '../data/standardSections';
import { diffProjects, type ProjectDiff } from '../data/projectDiff';
import type { MemberModel, ProjectModel } from '../types';

export interface ProposalQuantity { value: number; unit: string; }
export type ProposedOperation =
  | { kind: 'member.update'; memberId: string; changes: Partial<Record<'E' | 'A' | 'I' | 'density', ProposalQuantity>> }
  | { kind: 'member.section.apply'; memberId: string; sectionId: string }
  | { kind: 'member.material.apply'; memberId: string; materialId: string };

export type LocalProposal = {
  version: 1;
  proposalId: string;
  snapshotHash: string;
  summary: string;
} & (
  | { status: 'ready'; operation: ProposedOperation }
  | { status: 'needs-clarification'; question: string }
  | { status: 'rejected'; reason: string }
);

export interface ProposalRequest {
  intent: string;
  snapshotHash: string;
  memberIds: readonly string[];
  sectionIds: readonly string[];
  materialIds: readonly string[];
}

type QuantityKind = 'elasticModulus' | 'area' | 'inertia' | 'density';
const FACTORS: Record<QuantityKind, Record<string, number>> = {
  elasticModulus: { Pa: 1e-3, kPa: 1, MPa: 1e3, GPa: 1e6, psi: 6.894757293168361e-3, ksi: 6.894757293168361 },
  area: { m2: 1, cm2: 1e-4, mm2: 1e-6, in2: 6.4516e-4 },
  inertia: { m4: 1, cm4: 1e-8, mm4: 1e-12, in4: 4.162314256e-7 },
  density: { 'kg/m3': 1, 'lb/ft3': 16.018463373960142 },
};
const FIELD_KINDS = { E: 'elasticModulus', A: 'area', I: 'inertia', density: 'density' } as const;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SHA256 = /^[a-f0-9]{64}$/;

const record = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);
const proposalId = () => {
  if (!globalThis.crypto?.randomUUID) throw new Error('Web Crypto no puede crear una propuesta local.');
  return globalThis.crypto.randomUUID();
};
const mentioned = (intent: string, ids: readonly string[]) => {
  const lower = intent.toLowerCase();
  return [...ids].sort((left, right) => right.length - left.length).find((id) => lower.includes(id.toLowerCase()));
};
const allowedUnits = (kind: QuantityKind) => Object.keys(FACTORS[kind]);
const toBase = (quantity: ProposalQuantity, kind: QuantityKind) => {
  const factor = FACTORS[kind][quantity.unit];
  if (factor === undefined || !Number.isFinite(quantity.value)) throw new Error(`La unidad ${quantity.unit} no está admitida para ${kind}.`);
  return quantity.value * factor;
};
const quantityIn = (intent: string, field: keyof typeof FIELD_KINDS): ProposalQuantity | null => {
  const kind = FIELD_KINDS[field];
  const units = allowedUnits(kind).map((unit) => unit.replace(/[/\\^$*+?.()|[\]{}]/g, '\\$&')).join('|');
  const match = new RegExp(`\\b${field}\\b\\s*=?\\s*(-?\\d+(?:[.,]\\d+)?)\\s*(${units})\\b`, 'i').exec(intent);
  if (!match) return null;
  const unit = allowedUnits(kind).find((candidate) => candidate.toLowerCase() === match[2]!.toLowerCase());
  return unit ? { value: Number.parseFloat(match[1]!.replace(',', '.')), unit } : null;
};

/** Parser local determinista. No hace llamadas de red ni aplica cambios. */
export const proposeLocalCommand = (request: ProposalRequest): LocalProposal => {
  const base = { version: 1 as const, proposalId: proposalId(), snapshotHash: request.snapshotHash };
  const memberId = mentioned(request.intent, request.memberIds);
  if (!memberId) return { ...base, status: 'needs-clarification', summary: 'Falta identificar la barra.', question: 'Indica el identificador de la barra que quieres modificar.' };
  const sectionId = mentioned(request.intent, request.sectionIds);
  if (sectionId) return { ...base, status: 'ready', summary: `Aplicar la sección ${sectionId} a ${memberId}.`, operation: { kind: 'member.section.apply', memberId, sectionId } };
  const materialId = mentioned(request.intent, request.materialIds);
  if (materialId) return { ...base, status: 'ready', summary: `Aplicar el material ${materialId} a ${memberId}.`, operation: { kind: 'member.material.apply', memberId, materialId } };
  const changes: Extract<ProposedOperation, { kind: 'member.update' }>['changes'] = {};
  (Object.keys(FIELD_KINDS) as Array<keyof typeof FIELD_KINDS>).forEach((field) => {
    const quantity = quantityIn(request.intent, field);
    if (quantity) changes[field] = quantity;
  });
  if (Object.keys(changes).length) return { ...base, status: 'ready', summary: `Actualizar ${Object.keys(changes).join(', ')} en ${memberId}.`, operation: { kind: 'member.update', memberId, changes } };
  return { ...base, status: 'rejected', summary: `No existe una operación compatible para ${memberId}.`, reason: 'Nombra una sección, material o propiedad con unidad explícita.' };
};

const rejectExtra = (value: Record<string, unknown>, keys: readonly string[]) => Object.keys(value).filter((key) => !keys.includes(key));
const validQuantity = (value: unknown): value is ProposalQuantity => record(value) && rejectExtra(value, ['value', 'unit']).length === 0 && typeof value.value === 'number' && Number.isFinite(value.value) && typeof value.unit === 'string' && value.unit.length > 0;

/** Frontera estricta para cualquier proveedor futuro: no convierte ni ignora datos externos. */
export const validateLocalProposal = (input: unknown): { ok: true; value: LocalProposal } | { ok: false; reason: string } => {
  if (!record(input) || input.version !== 1 || typeof input.proposalId !== 'string' || !UUID.test(input.proposalId) || typeof input.snapshotHash !== 'string' || !SHA256.test(input.snapshotHash) || typeof input.summary !== 'string' || !input.summary.trim() || input.summary.length > 240) return { ok: false, reason: 'La propuesta no cumple el contrato local.' };
  const status = input.status;
  if (status === 'needs-clarification' && rejectExtra(input, ['version', 'proposalId', 'snapshotHash', 'summary', 'status', 'question']).length === 0 && typeof input.question === 'string' && input.question.trim()) return { ok: true, value: input as LocalProposal };
  if (status === 'rejected' && rejectExtra(input, ['version', 'proposalId', 'snapshotHash', 'summary', 'status', 'reason']).length === 0 && typeof input.reason === 'string' && input.reason.trim()) return { ok: true, value: input as LocalProposal };
  if (status !== 'ready' || rejectExtra(input, ['version', 'proposalId', 'snapshotHash', 'summary', 'status', 'operation']).length || !record(input.operation) || typeof input.operation.kind !== 'string' || typeof input.operation.memberId !== 'string' || !input.operation.memberId) return { ok: false, reason: 'La operación propuesta no está permitida.' };
  const operation = input.operation;
  if (operation.kind === 'member.section.apply' && rejectExtra(operation, ['kind', 'memberId', 'sectionId']).length === 0 && typeof operation.sectionId === 'string' && operation.sectionId) return { ok: true, value: input as LocalProposal };
  if (operation.kind === 'member.material.apply' && rejectExtra(operation, ['kind', 'memberId', 'materialId']).length === 0 && typeof operation.materialId === 'string' && operation.materialId) return { ok: true, value: input as LocalProposal };
  if (operation.kind === 'member.update' && rejectExtra(operation, ['kind', 'memberId', 'changes']).length === 0 && record(operation.changes) && Object.keys(operation.changes).length && Object.keys(operation.changes).every((field) => ['E', 'A', 'I', 'density'].includes(field) && validQuantity((operation.changes as Record<string, unknown>)[field]))) return { ok: true, value: input as LocalProposal };
  return { ok: false, reason: 'La operación propuesta no está permitida.' };
};

const commandFor = (project: ProjectModel, operation: ProposedOperation): ProjectCommand | { error: string } => {
  const member = project.members.find((candidate) => candidate.id === operation.memberId);
  if (!member) return { error: `La barra ${operation.memberId} ya no existe.` };
  if (operation.kind === 'member.section.apply') {
    const section = standardSections.find((candidate) => candidate.id === operation.sectionId);
    return section ? { kind: 'member.section.apply', description: `Aplicar sección ${section.name}`, memberId: member.id, sectionId: section.id, properties: { A: section.area, I: section.inertiaX } } : { error: 'La sección no existe en el catálogo local.' };
  }
  if (operation.kind === 'member.material.apply') {
    const material = standardMaterials.find((candidate) => candidate.id === operation.materialId);
    return material ? { kind: 'member.material.apply', description: `Aplicar material ${material.name}`, memberId: member.id, materialId: material.id, properties: { E: material.elasticModulus, G: material.shearModulus, density: material.density } } : { error: 'El material no existe en el catálogo local.' };
  }
  const changes: Partial<Omit<MemberModel, 'id'>> = {};
  try {
    Object.entries(operation.changes).forEach(([field, quantity]) => {
      const value = toBase(quantity!, FIELD_KINDS[field as keyof typeof FIELD_KINDS]);
      if (!(value > 0)) throw new Error(`El valor de ${field} debe ser positivo.`);
      (changes as Record<string, number>)[field] = value;
    });
  } catch (error) { return { error: error instanceof Error ? error.message : 'No se pudo convertir la propuesta.' }; }
  return { kind: 'member.update', description: `Actualizar ${Object.keys(changes).join(', ')} en ${member.id}`, memberId: member.id, changes };
};

export type PreparedLocalProposal = { proposal: Extract<LocalProposal, { status: 'ready' }>; command: ProjectCommand; diff: ProjectDiff };
export const prepareLocalProposal = (project: ProjectModel, snapshotHash: string, proposal: Extract<LocalProposal, { status: 'ready' }>): { ok: true; value: PreparedLocalProposal } | { ok: false; reason: string } => {
  if (proposal.snapshotHash !== snapshotHash) return { ok: false, reason: 'El proyecto cambió antes de preparar la propuesta.' };
  const command = commandFor(project, proposal.operation);
  if ('error' in command) return { ok: false, reason: command.error };
  try {
    const after = applyProjectPatch(project, compileProjectCommand(project, command).forward);
    const diff = diffProjects(project, after);
    return diff.identical ? { ok: false, reason: 'La propuesta no cambiaría el proyecto.' } : { ok: true, value: { proposal, command, diff } };
  } catch (error) { return { ok: false, reason: error instanceof Error ? error.message : 'No se pudo preparar la propuesta.' }; }
};

export const confirmLocalProposal = (prepared: PreparedLocalProposal, confirmation: { proposalId: string; snapshotHash: string }, currentHash: string): { ok: true; command: ProjectCommand } | { ok: false; reason: string } => {
  if (confirmation.proposalId !== prepared.proposal.proposalId || confirmation.snapshotHash !== prepared.proposal.snapshotHash) return { ok: false, reason: 'La confirmación no corresponde a la propuesta revisada.' };
  return currentHash === prepared.proposal.snapshotHash ? { ok: true, command: prepared.command } : { ok: false, reason: 'El proyecto cambió mientras revisabas la propuesta.' };
};
