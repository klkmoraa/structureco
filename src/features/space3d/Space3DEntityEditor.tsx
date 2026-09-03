/**
 * Formularios autoritativos de Space 3D.
 *
 * Todo campo numérico es un borrador de texto: se escribe libre y sólo se
 * convierte al confirmar. Convertir en cada pulsación impide escribir «-», «0.»
 * o «1e-» y obliga a inventar un valor mientras el usuario todavía teclea.
 *
 * No se crean coordenadas con un clic en la escena: en tres dimensiones un
 * punto de pantalla es una recta, no un punto, y adivinar la profundidad
 * produciría geometría que el usuario no ha decidido.
 */
import { useEffect, useMemo, useState } from 'react';
import { Check, X } from 'lucide-react';
import {
  fixedSpace3DRestraints,
  freeSpace3DRestraints,
  noSpace3DReleases,
  SPACE3D_RELEASE_KEYS,
  type Space3DFrameMember,
  type Space3DLoadAxes,
  type Space3DMemberLoad,
  type Space3DMemberLoadKind,
  type Space3DMemberReleases,
  type Space3DNodalLoad,
  type Space3DNode,
  type Space3DProject,
  type Space3DRestraints,
  type Space3DSupportSettlement,
} from '../../space3d/model/types';
import type { Space3DCommand } from '../../space3d/data/commands';
import type { TranslationKey } from '../../i18n/catalogs';

export type Space3DEditorTarget =
  | { readonly kind: 'node'; readonly id: string | null }
  | { readonly kind: 'member'; readonly id: string | null }
  | { readonly kind: 'load'; readonly id: string | null }
  | { readonly kind: 'member-load'; readonly id: string | null }
  | { readonly kind: 'settlement'; readonly id: string | null }
  | { readonly kind: 'case'; readonly id: string | null };

export interface Space3DEntityEditorProps {
  readonly project: Space3DProject;
  readonly target: Space3DEditorTarget;
  readonly t: (key: TranslationKey, variables?: Record<string, string | number>) => string;
  readonly onSubmit: (command: Space3DCommand) => boolean;
  readonly onCancel: () => void;
  readonly onDelete?: (target: Space3DEditorTarget) => void;
}

type Draft = Record<string, string>;

const DOF_KEYS = ['ux', 'uy', 'uz', 'rx', 'ry', 'rz'] as const;
const LOAD_KEYS = ['fx', 'fy', 'fz', 'mx', 'my', 'mz'] as const;
const PROPERTY_KEYS = ['E', 'G', 'A', 'Iy', 'Iz', 'J'] as const;
const NON_NEGATIVE_MEMBER_KEYS = ['shearAreaY', 'shearAreaZ', 'density'] as const;
const SPRING_KEYS = ['kux', 'kuy', 'kuz', 'krx', 'kry', 'krz'] as const;
const VALUE_KEYS = ['startX', 'startY', 'startZ', 'endX', 'endY', 'endZ'] as const;

const MEMBER_LOAD_KINDS: readonly Space3DMemberLoadKind[] = ['distributed', 'force', 'moment'];
const KIND_LABELS: Readonly<Record<Space3DMemberLoadKind, TranslationKey>> = {
  distributed: 'space3d.memberLoadDistributed',
  force: 'space3d.memberLoadForce',
  moment: 'space3d.memberLoadMoment',
};

const nextId = (prefix: string, used: readonly string[]): string => {
  let index = used.length + 1;
  while (used.includes(`${prefix}${index}`)) index += 1;
  return `${prefix}${index}`;
};

const numeric = (value: string): number | null => {
  const trimmed = value.trim().replace(',', '.');
  if (trimmed === '') return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
};

const nodeDraft = (node: Space3DNode | undefined): Draft => ({
  x: String(node?.x ?? 0),
  y: String(node?.y ?? 0),
  z: String(node?.z ?? 0),
  kux: String(node?.springs.ux ?? 0),
  kuy: String(node?.springs.uy ?? 0),
  kuz: String(node?.springs.uz ?? 0),
  krx: String(node?.springs.rx ?? 0),
  kry: String(node?.springs.ry ?? 0),
  krz: String(node?.springs.rz ?? 0),
});

const memberDraft = (member: Space3DFrameMember | undefined, fallback: Space3DFrameMember | undefined): Draft => {
  const source = member ?? fallback;
  return {
    E: String(source?.E ?? 200_000_000),
    G: String(source?.G ?? 77_000_000),
    A: String(source?.A ?? 0.0076),
    Iy: String(source?.Iy ?? 4.5e-5),
    Iz: String(source?.Iz ?? 1.36e-4),
    J: String(source?.J ?? 4e-7),
    shearAreaY: String(source?.shearAreaY ?? 0),
    shearAreaZ: String(source?.shearAreaZ ?? 0),
    density: String(source?.density ?? 0),
    refX: String(source?.orientation.localYReferenceGlobal[0] ?? 0),
    refY: String(source?.orientation.localYReferenceGlobal[1] ?? 1),
    refZ: String(source?.orientation.localYReferenceGlobal[2] ?? 0),
    roll: String(source?.orientation.rollRadians ?? 0),
  };
};

const loadDraft = (load: Space3DNodalLoad | undefined): Draft => ({
  fx: String(load?.fx ?? 0),
  fy: String(load?.fy ?? 0),
  fz: String(load?.fz ?? 0),
  mx: String(load?.mx ?? 0),
  my: String(load?.my ?? 0),
  mz: String(load?.mz ?? 0),
});

const memberLoadDraft = (load: Space3DMemberLoad | undefined): Draft => ({
  start: String(load?.start ?? 0),
  end: String(load?.end ?? 1),
  startX: String(load?.startValue[0] ?? 0),
  startY: String(load?.startValue[1] ?? 0),
  startZ: String(load?.startValue[2] ?? 0),
  endX: String(load?.endValue[0] ?? 0),
  endY: String(load?.endValue[1] ?? 0),
  endZ: String(load?.endValue[2] ?? 0),
});

const settlementDraft = (settlement: Space3DSupportSettlement | undefined): Draft => ({
  ux: String(settlement?.ux ?? 0),
  uy: String(settlement?.uy ?? 0),
  uz: String(settlement?.uz ?? 0),
  rx: String(settlement?.rx ?? 0),
  ry: String(settlement?.ry ?? 0),
  rz: String(settlement?.rz ?? 0),
});

export const Space3DEntityEditor = ({ project, target, t, onSubmit, onCancel, onDelete }: Space3DEntityEditorProps) => {
  const node = target.kind === 'node' ? project.nodes.find((item) => item.id === target.id) : undefined;
  const member = target.kind === 'member' ? project.members.find((item) => item.id === target.id) : undefined;
  const load = target.kind === 'load' ? project.nodalLoads.find((item) => item.id === target.id) : undefined;
  const memberLoad = target.kind === 'member-load' ? project.memberLoads.find((item) => item.id === target.id) : undefined;
  const settlement = target.kind === 'settlement' ? project.settlements.find((item) => item.id === target.id) : undefined;
  const loadCase = target.kind === 'case' ? project.loadCases.find((item) => item.id === target.id) : undefined;

  const initialDraft = useMemo(() => {
    if (target.kind === 'node') return nodeDraft(node);
    if (target.kind === 'member') return memberDraft(member, project.members[0]);
    if (target.kind === 'member-load') return memberLoadDraft(memberLoad);
    if (target.kind === 'settlement') return settlementDraft(settlement);
    if (target.kind === 'case') return { selfWeightFactor: String(loadCase?.selfWeightFactor ?? 0) };
    return loadDraft(load);
  }, [load, loadCase, member, memberLoad, node, project.members, settlement, target.kind]);

  const [draft, setDraft] = useState<Draft>(initialDraft);
  const [restraints, setRestraints] = useState<Space3DRestraints>(node?.restraints ?? freeSpace3DRestraints());
  const [releases, setReleases] = useState<Space3DMemberReleases>(member?.releases ?? noSpace3DReleases());
  const [endI, setEndI] = useState(member?.i ?? project.nodes[0]?.id ?? '');
  const [endJ, setEndJ] = useState(member?.j ?? project.nodes[1]?.id ?? '');
  const [loadNodeId, setLoadNodeId] = useState(load?.nodeId ?? settlement?.nodeId ?? project.nodes[0]?.id ?? '');
  const [loadCaseId, setLoadCaseId] = useState(
    load?.caseId ?? memberLoad?.caseId ?? settlement?.caseId ?? project.loadCases[0]?.id ?? '',
  );
  const [loadMemberId, setLoadMemberId] = useState(memberLoad?.memberId ?? project.members[0]?.id ?? '');
  const [loadKind, setLoadKind] = useState<Space3DMemberLoadKind>(memberLoad?.kind ?? 'distributed');
  const [loadAxes, setLoadAxes] = useState<Space3DLoadAxes>(memberLoad?.axes ?? 'global');
  const [caseName, setCaseName] = useState(loadCase?.name ?? '');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const key = `${target.kind}:${target.id ?? 'new'}`;
  useEffect(() => {
    setDraft(initialDraft);
    setRestraints(node?.restraints ?? freeSpace3DRestraints());
    setReleases(member?.releases ?? noSpace3DReleases());
    setEndI(member?.i ?? project.nodes[0]?.id ?? '');
    setEndJ(member?.j ?? project.nodes[1]?.id ?? '');
    setLoadNodeId(load?.nodeId ?? settlement?.nodeId ?? project.nodes[0]?.id ?? '');
    setLoadCaseId(load?.caseId ?? memberLoad?.caseId ?? settlement?.caseId ?? project.loadCases[0]?.id ?? '');
    setLoadMemberId(memberLoad?.memberId ?? project.members[0]?.id ?? '');
    setLoadKind(memberLoad?.kind ?? 'distributed');
    setLoadAxes(memberLoad?.axes ?? 'global');
    setCaseName(loadCase?.name ?? '');
    setErrors({});
    // Un cambio de entidad recarga el borrador entero; el resto de dependencias
    // son el propio proyecto, que no debe pisar lo que el usuario está tecleando.
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  /**
   * La unidad va fuera del `<label>` y se enlaza con `aria-describedby`: si
   * viviera dentro, el nombre accesible del campo sería «X m» en vez de «X», y
   * el usuario de lector de pantalla oiría la unidad como parte del rótulo.
   */
  const field = (name: string, label: string, unit?: string, positive = false) => {
    const invalid = errors[name];
    const inputId = `space3d-${target.kind}-${name}`;
    const unitId = unit ? `${inputId}-unit` : undefined;
    return <div className={`space3d-field${invalid ? ' is-invalid' : ''}`} key={name}>
      <label className="space3d-field-label" htmlFor={inputId}>{label}</label>
      {unit ? <span className="space3d-field-unit" id={unitId}>{unit}</span> : null}
      <input
        id={inputId}
        type="text"
        inputMode="decimal"
        autoComplete="off"
        aria-describedby={unitId}
        value={draft[name] ?? ''}
        aria-invalid={invalid ? true : undefined}
        onChange={(event) => setDraft((current) => ({ ...current, [name]: event.target.value }))}
      />
      {invalid ? <small role="alert">{t(positive ? 'space3d.requiredPositive' : 'space3d.requiredNumber')}</small> : null}
    </div>;
  };

  const readNumbers = (
    names: readonly string[],
    positive: readonly string[] = [],
    nonNegative: readonly string[] = [],
  ): Record<string, number> | null => {
    const next: Record<string, string> = {};
    const values: Record<string, number> = {};
    for (const name of names) {
      const value = numeric(draft[name] ?? '');
      const rejected = value === null
        || (positive.includes(name) && value <= 0)
        || (nonNegative.includes(name) && value < 0);
      if (rejected) next[name] = 'invalid';
      else values[name] = value as number;
    }
    setErrors(next);
    return Object.keys(next).length > 0 ? null : values;
  };

  const actions = (saveLabel: string) => <footer className="space3d-editor-actions">
    <button type="submit" className="space3d-button space3d-button--primary"><Check size={16} aria-hidden="true" />{saveLabel}</button>
    <button type="button" className="space3d-button" onClick={onCancel}><X size={16} aria-hidden="true" />{t('space3d.cancelEdit')}</button>
    {target.id && onDelete
      ? <button type="button" className="space3d-button space3d-button--danger" onClick={() => onDelete(target)}>{t('space3d.deleteEntity')}</button>
      : null}
  </footer>;

  const caseSelect = () => <label className="space3d-field">
    <span className="space3d-field-label">{t('space3d.loadCase')}</span>
    <select value={loadCaseId} onChange={(event) => setLoadCaseId(event.target.value)}>
      {project.loadCases.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
    </select>
  </label>;

  const nodeSelect = () => <label className="space3d-field">
    <span className="space3d-field-label">{t('space3d.node')}</span>
    <select value={loadNodeId} onChange={(event) => setLoadNodeId(event.target.value)}>
      {project.nodes.map((item) => <option key={item.id} value={item.id}>{item.id}</option>)}
    </select>
  </label>;

  if (target.kind === 'node') {
    const id = target.id ?? nextId('N', project.nodes.map((item) => item.id));
    const submit = () => {
      const values = readNumbers(['x', 'y', 'z', ...SPRING_KEYS], [], [...SPRING_KEYS]);
      if (!values) return;
      const springs = {
        ux: values.kux, uy: values.kuy, uz: values.kuz,
        rx: values.krx, ry: values.kry, rz: values.krz,
      };
      const payload: Space3DNode = { id, x: values.x, y: values.y, z: values.z, restraints, springs };
      const ok = target.id
        ? onSubmit({ kind: 'update-node', nodeId: id, changes: { x: values.x, y: values.y, z: values.z, restraints, springs } })
        : onSubmit({ kind: 'add-node', node: payload });
      if (ok) onCancel();
    };

    return <form className="space3d-editor" onSubmit={(event) => { event.preventDefault(); submit(); }}>
      <header className="space3d-editor-head">
        <h3>{t('space3d.node')} <code>{id}</code></h3>
      </header>
      <div className="space3d-field-grid">
        {field('x', t('space3d.fieldX'), t('space3d.unitLength'))}
        {field('y', t('space3d.fieldY'), t('space3d.unitLength'))}
        {field('z', t('space3d.fieldZ'), t('space3d.unitLength'))}
      </div>

      <fieldset className="space3d-fieldset">
        <legend>{t('space3d.restraints')}</legend>
        <div className="space3d-dof-grid">
          {DOF_KEYS.map((dof) => <label key={dof} className="space3d-check">
            <input
              type="checkbox"
              checked={restraints[dof]}
              onChange={(event) => setRestraints((current) => ({ ...current, [dof]: event.target.checked }))}
            />
            <span>{dof}</span>
          </label>)}
        </div>
        <div className="space3d-inline-actions">
          <button type="button" className="space3d-button space3d-button--ghost" onClick={() => setRestraints(fixedSpace3DRestraints())}>{t('space3d.fixAll')}</button>
          <button type="button" className="space3d-button space3d-button--ghost" onClick={() => setRestraints(freeSpace3DRestraints())}>{t('space3d.freeAll')}</button>
        </div>
      </fieldset>

      <fieldset className="space3d-fieldset">
        <legend>{t('space3d.springs')}</legend>
        <p className="space3d-help">{t('space3d.springsHelp')}</p>
        <div className="space3d-field-grid">
          {field('kux', 'Kux', t('space3d.unitSpringForce'))}
          {field('kuy', 'Kuy', t('space3d.unitSpringForce'))}
          {field('kuz', 'Kuz', t('space3d.unitSpringForce'))}
          {field('krx', 'Krx', t('space3d.unitSpringMoment'))}
          {field('kry', 'Kry', t('space3d.unitSpringMoment'))}
          {field('krz', 'Krz', t('space3d.unitSpringMoment'))}
        </div>
        <div className="space3d-inline-actions">
          <button
            type="button"
            className="space3d-button space3d-button--ghost"
            onClick={() => setDraft((current) => ({
              ...current, kux: '0', kuy: '0', kuz: '0', krx: '0', kry: '0', krz: '0',
            }))}
          >{t('space3d.springsClear')}</button>
        </div>
      </fieldset>

      {actions(t('space3d.saveNode'))}
    </form>;
  }

  if (target.kind === 'member') {
    const id = target.id ?? nextId('M', project.members.map((item) => item.id));
    const submit = () => {
      const values = readNumbers(
        [...PROPERTY_KEYS, ...NON_NEGATIVE_MEMBER_KEYS, 'refX', 'refY', 'refZ', 'roll'],
        [...PROPERTY_KEYS],
        [...NON_NEGATIVE_MEMBER_KEYS],
      );
      if (!values) return;
      const orientation = {
        localYReferenceGlobal: [values.refX, values.refY, values.refZ] as const,
        rollRadians: values.roll,
      };
      const changes = {
        i: endI, j: endJ,
        E: values.E, G: values.G, A: values.A, Iy: values.Iy, Iz: values.Iz, J: values.J,
        shearAreaY: values.shearAreaY, shearAreaZ: values.shearAreaZ, density: values.density,
        releases,
        orientation,
      };
      const ok = target.id
        ? onSubmit({ kind: 'update-member', memberId: id, changes })
        : onSubmit({ kind: 'add-member', member: { id, ...changes } });
      if (ok) onCancel();
    };

    const releaseRow = (end: 'i' | 'j') => <div className="space3d-dof-grid" key={end}>
      {SPACE3D_RELEASE_KEYS.filter((item) => item.startsWith(end)).map((item) => <label key={item} className="space3d-check">
        <input
          type="checkbox"
          checked={releases[item]}
          onChange={(event) => setReleases((current) => ({ ...current, [item]: event.target.checked }))}
        />
        <span>{item}</span>
      </label>)}
    </div>;

    return <form className="space3d-editor" onSubmit={(event) => { event.preventDefault(); submit(); }}>
      <header className="space3d-editor-head">
        <h3>{t('space3d.member')} <code>{id}</code></h3>
      </header>
      <div className="space3d-field-grid">
        <label className="space3d-field">
          <span className="space3d-field-label">{t('space3d.endI')}</span>
          <select value={endI} onChange={(event) => setEndI(event.target.value)}>
            {project.nodes.map((item) => <option key={item.id} value={item.id}>{item.id}</option>)}
          </select>
        </label>
        <label className="space3d-field">
          <span className="space3d-field-label">{t('space3d.endJ')}</span>
          <select value={endJ} onChange={(event) => setEndJ(event.target.value)}>
            {project.nodes.map((item) => <option key={item.id} value={item.id}>{item.id}</option>)}
          </select>
        </label>
      </div>

      <div className="space3d-field-grid">
        {field('E', t('space3d.propertyE'), t('space3d.unitStress'), true)}
        {field('G', t('space3d.propertyG'), t('space3d.unitStress'), true)}
        {field('A', t('space3d.propertyA'), t('space3d.unitArea'), true)}
        {field('Iy', t('space3d.propertyIy'), t('space3d.unitInertia'), true)}
        {field('Iz', t('space3d.propertyIz'), t('space3d.unitInertia'), true)}
        {field('J', t('space3d.propertyJ'), t('space3d.unitInertia'), true)}
      </div>

      <fieldset className="space3d-fieldset">
        <legend>{t('space3d.shearAndWeight')}</legend>
        <p className="space3d-help">{t('space3d.shearAndWeightHelp')}</p>
        <div className="space3d-field-grid">
          {field('shearAreaY', t('space3d.propertyShearAreaY'), t('space3d.unitArea'))}
          {field('shearAreaZ', t('space3d.propertyShearAreaZ'), t('space3d.unitArea'))}
          {field('density', t('space3d.propertyDensity'), t('space3d.unitDensity'))}
        </div>
      </fieldset>

      <fieldset className="space3d-fieldset">
        <legend>{t('space3d.releases')}</legend>
        <p className="space3d-help">{t('space3d.releasesHelp')}</p>
        <span className="space3d-field-label">{t('space3d.endI')}</span>
        {releaseRow('i')}
        <span className="space3d-field-label">{t('space3d.endJ')}</span>
        {releaseRow('j')}
        <div className="space3d-inline-actions">
          <button type="button" className="space3d-button space3d-button--ghost" onClick={() => setReleases(noSpace3DReleases())}>{t('space3d.releasesClear')}</button>
        </div>
      </fieldset>

      <fieldset className="space3d-fieldset">
        <legend>{t('space3d.orientationReference')}</legend>
        <div className="space3d-field-grid">
          {field('refX', t('space3d.fieldX'))}
          {field('refY', t('space3d.fieldY'))}
          {field('refZ', t('space3d.fieldZ'))}
          {field('roll', t('space3d.roll'), t('space3d.unitAngle'))}
        </div>
      </fieldset>

      {actions(t('space3d.saveMember'))}
    </form>;
  }

  if (target.kind === 'member-load') {
    const id = target.id ?? nextId('ML', project.memberLoads.map((item) => item.id));
    const distributed = loadKind === 'distributed';
    const unit = loadKind === 'distributed'
      ? t('space3d.unitLineLoad')
      : loadKind === 'force' ? t('space3d.unitForce') : t('space3d.unitMoment');

    const submit = () => {
      const names = distributed ? ['start', 'end', ...VALUE_KEYS] : ['start', 'startX', 'startY', 'startZ'];
      const values = readNumbers(names);
      if (!values) return;
      const start = values.start;
      const end = distributed ? values.end : values.start;
      if (start < 0 || start > 1 || end < 0 || end > 1 || (distributed && end <= start)) {
        setErrors(distributed ? { end: 'invalid' } : { start: 'invalid' });
        return;
      }
      const changes = {
        memberId: loadMemberId,
        caseId: loadCaseId,
        kind: loadKind,
        axes: loadAxes,
        start,
        end,
        startValue: [values.startX, values.startY, values.startZ] as const,
        endValue: distributed
          ? [values.endX, values.endY, values.endZ] as const
          : [0, 0, 0] as const,
      };
      const ok = target.id
        ? onSubmit({ kind: 'update-member-load', loadId: id, changes })
        : onSubmit({ kind: 'add-member-load', load: { id, ...changes } });
      if (ok) onCancel();
    };

    return <form className="space3d-editor" onSubmit={(event) => { event.preventDefault(); submit(); }}>
      <header className="space3d-editor-head">
        <h3>{t('space3d.memberLoad')} <code>{id}</code></h3>
      </header>
      <div className="space3d-field-grid">
        <label className="space3d-field">
          <span className="space3d-field-label">{t('space3d.member')}</span>
          <select value={loadMemberId} onChange={(event) => setLoadMemberId(event.target.value)}>
            {project.members.map((item) => <option key={item.id} value={item.id}>{item.id}</option>)}
          </select>
        </label>
        {caseSelect()}
        <label className="space3d-field">
          <span className="space3d-field-label">{t('space3d.memberLoadKind')}</span>
          <select value={loadKind} onChange={(event) => setLoadKind(event.target.value as Space3DMemberLoadKind)}>
            {MEMBER_LOAD_KINDS.map((item) => <option key={item} value={item}>{t(KIND_LABELS[item])}</option>)}
          </select>
        </label>
        <label className="space3d-field">
          <span className="space3d-field-label">{t('space3d.memberLoadAxes')}</span>
          <select value={loadAxes} onChange={(event) => setLoadAxes(event.target.value as Space3DLoadAxes)}>
            <option value="global">{t('space3d.axesGlobal')}</option>
            <option value="local">{t('space3d.axesLocal')}</option>
          </select>
        </label>
      </div>

      <p className="space3d-help">{distributed ? t('space3d.memberLoadSpanHelp') : t('space3d.memberLoadPointHelp')}</p>
      <div className="space3d-field-grid">
        {field('start', distributed ? t('space3d.memberLoadStart') : t('space3d.memberLoadPosition'))}
        {distributed ? field('end', t('space3d.memberLoadEnd')) : null}
      </div>

      <fieldset className="space3d-fieldset">
        <legend>{distributed ? t('space3d.memberLoadStartValue') : t('space3d.memberLoadValue')}</legend>
        <div className="space3d-field-grid">
          {field('startX', t('space3d.fieldX'), unit)}
          {field('startY', t('space3d.fieldY'), unit)}
          {field('startZ', t('space3d.fieldZ'), unit)}
        </div>
      </fieldset>

      {distributed ? <fieldset className="space3d-fieldset">
        <legend>{t('space3d.memberLoadEndValue')}</legend>
        <div className="space3d-inline-actions">
          <button
            type="button"
            className="space3d-button space3d-button--ghost"
            onClick={() => setDraft((current) => ({
              ...current, endX: current.startX, endY: current.startY, endZ: current.startZ,
            }))}
          >{t('space3d.memberLoadUniform')}</button>
        </div>
        <div className="space3d-field-grid">
          {field('endX', t('space3d.fieldX'), unit)}
          {field('endY', t('space3d.fieldY'), unit)}
          {field('endZ', t('space3d.fieldZ'), unit)}
        </div>
      </fieldset> : null}

      {actions(t('space3d.saveMemberLoad'))}
    </form>;
  }

  if (target.kind === 'settlement') {
    const id = target.id ?? nextId('S', project.settlements.map((item) => item.id));
    const submit = () => {
      const values = readNumbers([...DOF_KEYS]);
      if (!values) return;
      const changes = {
        nodeId: loadNodeId, caseId: loadCaseId,
        ux: values.ux, uy: values.uy, uz: values.uz, rx: values.rx, ry: values.ry, rz: values.rz,
      };
      const ok = target.id
        ? onSubmit({ kind: 'update-settlement', settlementId: id, changes })
        : onSubmit({ kind: 'add-settlement', settlement: { id, ...changes } });
      if (ok) onCancel();
    };

    return <form className="space3d-editor" onSubmit={(event) => { event.preventDefault(); submit(); }}>
      <header className="space3d-editor-head">
        <h3>{t('space3d.settlement')} <code>{id}</code></h3>
      </header>
      <div className="space3d-field-grid">
        {nodeSelect()}
        {caseSelect()}
      </div>
      <p className="space3d-help">{t('space3d.settlementHelp')}</p>
      <div className="space3d-field-grid">
        {field('ux', 'ux', t('space3d.unitLength'))}
        {field('uy', 'uy', t('space3d.unitLength'))}
        {field('uz', 'uz', t('space3d.unitLength'))}
        {field('rx', 'rx', t('space3d.unitAngle'))}
        {field('ry', 'ry', t('space3d.unitAngle'))}
        {field('rz', 'rz', t('space3d.unitAngle'))}
      </div>
      {actions(t('space3d.saveSettlement'))}
    </form>;
  }

  if (target.kind === 'case') {
    const id = target.id ?? project.loadCases[0]?.id ?? '';
    const submit = () => {
      const values = readNumbers(['selfWeightFactor']);
      if (!values || caseName.trim() === '') return;
      if (onSubmit({ kind: 'update-load-case', caseId: id, changes: { name: caseName, selfWeightFactor: values.selfWeightFactor } })) onCancel();
    };

    return <form className="space3d-editor" onSubmit={(event) => { event.preventDefault(); submit(); }}>
      <header className="space3d-editor-head">
        <h3>{t('space3d.loadCase')} <code>{id}</code></h3>
      </header>
      <div className="space3d-field-grid">
        <label className="space3d-field">
          <span className="space3d-field-label">{t('space3d.caseName')}</span>
          <input type="text" value={caseName} autoComplete="off" onChange={(event) => setCaseName(event.target.value)} />
        </label>
        {field('selfWeightFactor', t('space3d.selfWeightFactor'))}
      </div>
      <p className="space3d-help">{t('space3d.selfWeightHelp')}</p>
      {actions(t('space3d.saveCase'))}
    </form>;
  }

  const id = target.id ?? nextId('L', project.nodalLoads.map((item) => item.id));
  const submit = () => {
    const values = readNumbers([...LOAD_KEYS]);
    if (!values) return;
    const changes = {
      nodeId: loadNodeId, caseId: loadCaseId,
      fx: values.fx, fy: values.fy, fz: values.fz, mx: values.mx, my: values.my, mz: values.mz,
    };
    const ok = target.id
      ? onSubmit({ kind: 'update-nodal-load', loadId: id, changes })
      : onSubmit({ kind: 'add-nodal-load', load: { id, ...changes } });
    if (ok) onCancel();
  };

  return <form className="space3d-editor" onSubmit={(event) => { event.preventDefault(); submit(); }}>
    <header className="space3d-editor-head">
      <h3>{t('space3d.load')} <code>{id}</code></h3>
    </header>
    <div className="space3d-field-grid">
      {nodeSelect()}
      {caseSelect()}
    </div>
    <div className="space3d-field-grid">
      {field('fx', t('space3d.fieldFx'), t('space3d.unitForce'))}
      {field('fy', t('space3d.fieldFy'), t('space3d.unitForce'))}
      {field('fz', t('space3d.fieldFz'), t('space3d.unitForce'))}
      {field('mx', t('space3d.fieldMx'), t('space3d.unitMoment'))}
      {field('my', t('space3d.fieldMy'), t('space3d.unitMoment'))}
      {field('mz', t('space3d.fieldMz'), t('space3d.unitMoment'))}
    </div>
    {actions(t('space3d.saveLoad'))}
  </form>;
};
