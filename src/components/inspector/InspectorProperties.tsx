import { useCallback, useMemo, useState, type ReactNode } from 'react';
import {
  AlertTriangle,
  Anchor,
  CircleDot,
  Layers3,
  Minus,
  MoveDown,
  MousePointer2,
  Plus,
  RotateCcw,
  Sigma,
  Trash2,
} from 'lucide-react';
import { repairProjectTopology } from '../../data/modelOperations';
import { fromDisplay, toDisplay, unitLabel, type UnitQuantity } from '../../engine/units';
import { useI18n } from '../../i18n/useI18n';
import { useClassroomSession } from '../../store/ClassroomSessionContext';
import { useProject } from '../../store/ProjectContext';
import type {
  MemberInitialEffect,
  MemberLoad,
  NodalLoad,
  PrescribedDisplacement,
  SupportType,
  UnitSystemId,
  ValidationIssue,
} from '../../types';
import { ClassroomGuide } from '../ClassroomGuide';
import { InspectorNumericField } from './InspectorNumericField';
import { formatInspectorValue } from './numericFormatting';
import {
  InspectorAdvancedProperties,
  InspectorDerivedList,
  InspectorHelper,
  InspectorLockedState,
  InspectorPropertyGroup,
  InspectorSelectionSummary,
  type InspectorSummaryMetric,
} from './InspectorPrimitives';

const ACCORDION_STORAGE_KEY = 'structureCo.inspector.expanded.v1';

const readExpandedSections = (): string[] => {
  if (typeof window === 'undefined') return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(ACCORDION_STORAGE_KEY) ?? '[]');
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : [];
  } catch {
    return [];
  }
};

const usePersistentInspectorSections = () => {
  const [expanded, setExpanded] = useState<string[]>(readExpandedSections);
  const updateExpanded = useCallback((next: string[]) => {
    setExpanded(next);
    try {
      window.localStorage.setItem(ACCORDION_STORAGE_KEY, JSON.stringify(next));
    } catch {
      // UI preference persistence must never block property editing.
    }
  }, []);
  return [expanded, updateExpanded] as const;
};

const SelectField = ({
  label,
  value,
  onChange,
  children,
  hint,
  disabled = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
  hint?: string;
  disabled?: boolean;
}) => (
  <label className={`select-field${disabled ? ' is-disabled' : ''}`}>
    <span>{label}{hint ? <small>{hint}</small> : null}</span>
    <select value={value} disabled={disabled} onChange={(event) => onChange(event.target.value)}>{children}</select>
  </label>
);

const PhysicalNumberField = ({
  label,
  value,
  units,
  quantity,
  resetKey,
  onCommit,
  hint,
  validate,
  disabled,
  lockedReason,
}: {
  label: string;
  value: number;
  units: UnitSystemId;
  quantity: UnitQuantity;
  resetKey: string;
  onCommit: (value: number) => void;
  hint?: string;
  validate?: (value: number) => string | undefined;
  disabled?: boolean;
  lockedReason?: string;
}) => (
  <InspectorNumericField
    label={label}
    value={toDisplay(value, units, quantity)}
    unit={unitLabel(units, quantity)}
    resetKey={`${resetKey}:${units}`}
    hint={hint}
    validate={validate}
    disabled={disabled}
    lockedReason={lockedReason}
    onCommit={(displayValue) => onCommit(fromDisplay(displayValue, units, quantity))}
  />
);

const formatPhysical = (value: number, units: UnitSystemId, quantity: UnitQuantity) => (
  formatInspectorValue(toDisplay(value, units, quantity), unitLabel(units, quantity))
);

const nonNegative = (value: number) => value >= 0 ? undefined : 'Debe ser mayor o igual que 0.';
const normalizedPosition = (value: number) => value >= 0 && value <= 1 ? undefined : 'Usa un valor entre 0 y 1.';

const supportNames: Record<SupportType, string> = {
  none: 'Libre',
  pin: 'Articulado',
  roller: 'Rodillo orientable',
  fixed: 'Empotramiento',
  custom: 'Personalizado',
};

const InspectorIssues = ({ issues }: { issues: readonly ValidationIssue[] }) => {
  if (issues.length === 0) return null;
  return <section className="inspector-inline-issues" aria-label="Validaciones del objeto">
    <h3>Validación del análisis</h3>
    {issues.map((issue) => <div key={issue.id} className={`is-${issue.severity}`} role={issue.severity === 'error' ? 'alert' : 'status'}>
      <AlertTriangle size={15} aria-hidden="true" />
      <span><strong>{issue.title}</strong>{issue.message}</span>
    </div>)}
  </section>;
};

export const InspectorProperties = () => {
  const { project, analysis, selection, setActiveTool, setSelection, updateProject, analyze } = useProject();
  const { t } = useI18n();
  const { resultsVisible } = useClassroomSession();
  const [expandedSections, setExpandedSections] = usePersistentInspectorSections();
  const units = project.settings.units;
  const classroomMode = project.settings.calculationMode === 'classroom';

  const selectedNode = selection?.kind === 'node' ? project.nodes.find((node) => node.id === selection.id) : null;
  const selectedMember = selection?.kind === 'member' ? project.members.find((member) => member.id === selection.id) : null;
  const selectedNodalLoad = selection?.kind === 'nodalLoad' ? project.nodalLoads.find((load) => load.id === selection.id) : null;
  const selectedMemberLoad = selection?.kind === 'memberLoad' ? project.memberLoads.find((load) => load.id === selection.id) : null;
  const selectedNodePrescribed = selectedNode ? (project.prescribedDisplacements ?? []).filter((item) => item.nodeId === selectedNode.id) : [];
  const selectedMemberEffects = selectedMember ? (project.memberInitialEffects ?? []).filter((effect) => effect.memberId === selectedMember.id) : [];
  const nodeMap = useMemo(() => new Map(project.nodes.map((node) => [node.id, node])), [project.nodes]);
  const nodeResult = selectedNode && analysis?.success ? analysis.nodeResults.find((result) => result.nodeId === selectedNode.id) : null;
  const memberResult = selectedMember && analysis?.success ? analysis.memberResults.find((result) => result.memberId === selectedMember.id) : null;
  const multiCount = selection?.kind === 'multi' ? selection.nodeIds.length + selection.memberIds.length : 0;
  const selectionKey = selection === null
    ? 'none'
    : selection.kind === 'multi'
      ? `multi:${selection.nodeIds.join(',')}:${selection.memberIds.join(',')}`
      : `${selection.kind}:${selection.id}`;

  const updateNode = (key: string, value: unknown) => {
    let resultingNodeId = selectedNode?.id ?? '';
    updateProject((draft) => {
      const node = draft.nodes.find((item) => item.id === selectedNode?.id);
      if (!node) return draft;
      if (key === 'x' || key === 'y') node[key] = Number(value);
      else if (key === 'internalHinge') node.internalHinge = Boolean(value);
      else if (key === 'supportType') {
        const type = value as SupportType;
        const spring = node.support.spring;
        node.support = type === 'roller'
          ? { type, angleDeg: node.support.angleDeg ?? 90, spring }
          : type === 'custom'
            ? { type, restrainX: false, restrainY: false, restrainR: false, spring }
            : { type, spring };
      } else if (key === 'supportAngle') node.support.angleDeg = Number(value);
      else if (key === 'restrainX' || key === 'restrainY' || key === 'restrainR') node.support[key] = Boolean(value);
      else if (key.startsWith('spring.')) {
        node.support.spring ??= {};
        const springKey = key.split('.')[1] as 'kx' | 'ky' | 'kr' | 'kNormal';
        node.support.spring[springKey] = Number(value);
      } else if (key.startsWith('prescribed.')) {
        node.support.prescribed ??= {};
        const component = key.split('.')[1] as 'ux' | 'uy' | 'rz' | 'normal';
        node.support.prescribed[component] = Number(value);
      }
      const repair = repairProjectTopology(draft);
      const merge = repair.mergedNodes.find((item) => item.removedNodeId === resultingNodeId);
      if (merge) resultingNodeId = merge.keptNodeId;
      return draft;
    });
    if (resultingNodeId && resultingNodeId !== selectedNode?.id) setSelection({ kind: 'node', id: resultingNodeId });
  };

  const updateMember = (key: string, value: unknown) => updateProject((draft) => {
    const member = draft.members.find((item) => item.id === selectedMember?.id);
    if (!member) return draft;
    if (key === 'type') member.type = value as typeof member.type;
    else if (key === 'E') member.E = Number(value);
    else if (key === 'A' || key === 'I' || key === 'density' || key === 'G' || key === 'shearArea' || key === 'rotationalSpringI' || key === 'rotationalSpringJ') member[key] = Number(value);
    else if (key === 'beamTheory') member.beamTheory = value as 'euler-bernoulli' | 'timoshenko';
    else if (key === 'useRotationalSpringI' || key === 'useRotationalSpringJ') {
      const property = key === 'useRotationalSpringI' ? 'rotationalSpringI' : 'rotationalSpringJ';
      if (value) member[property] ??= 1e6;
      else delete member[property];
    } else if (key === 'rigidOffsetI' || key === 'rigidOffsetJ') member[key] = Math.max(0, Number(value));
    else if (key === 'iMoment' || key === 'jMoment') {
      member.releases ??= {};
      member.releases[key] = Boolean(value);
    }
    return draft;
  });

  const updateNodalLoad = (key: keyof NodalLoad, value: string | number) => updateProject((draft) => {
    const load = draft.nodalLoads.find((item) => item.id === selectedNodalLoad?.id);
    if (load) (load as unknown as Record<string, string | number>)[key] = value;
    return draft;
  });

  const updateMemberLoad = (key: keyof MemberLoad, value: string | number) => updateProject((draft) => {
    const load = draft.memberLoads.find((item) => item.id === selectedMemberLoad?.id);
    if (load) (load as unknown as Record<string, string | number>)[key] = value;
    return draft;
  });

  const deleteLoad = (kind: 'nodal' | 'member', id: string) => updateProject((draft) => {
    if (kind === 'nodal') draft.nodalLoads = draft.nodalLoads.filter((load) => load.id !== id);
    else draft.memberLoads = draft.memberLoads.filter((load) => load.id !== id);
    return draft;
  });

  const updatePrescribed = (id: string, key: keyof PrescribedDisplacement, value: string | number) => updateProject((draft) => {
    const item = (draft.prescribedDisplacements ?? []).find((candidate) => candidate.id === id);
    if (item) (item as unknown as Record<string, string | number>)[key] = value;
    return draft;
  });

  const updateInitialEffect = (id: string, key: keyof MemberInitialEffect, value: string | number) => updateProject((draft) => {
    const item = (draft.memberInitialEffects ?? []).find((candidate) => candidate.id === id);
    if (item) (item as unknown as Record<string, string | number>)[key] = value;
    return draft;
  });

  const selectedId = selectedNode?.id ?? selectedMember?.id ?? selectedNodalLoad?.id ?? selectedMemberLoad?.id;
  const selectedIssues = selectedId ? (analysis?.issues ?? []).filter((issue) => issue.objectId === selectedId) : [];

  let summaryType = t('inspector.noneSelected');
  let summaryId = '—';
  let summaryDescription = 'Selecciona un nodo, miembro, apoyo o carga en el lienzo.';
  let SummaryIcon = MousePointer2;
  let summaryMetrics: InspectorSummaryMetric[] = [];

  if (selectedNode) {
    const hasSupport = selectedNode.support.type !== 'none';
    summaryType = hasSupport ? t('inspector.support') : t('inspector.node');
    summaryId = selectedNode.id;
    summaryDescription = hasSupport ? `${supportNames[selectedNode.support.type]} · nodo estructural` : 'Nodo libre · coordenadas editables';
    SummaryIcon = hasSupport ? Anchor : CircleDot;
    if (nodeResult && (!classroomMode || resultsVisible)) summaryMetrics = [
      { label: 'Rx', value: formatPhysical(nodeResult.rx, units, 'force') },
      { label: 'Ry', value: formatPhysical(nodeResult.ry, units, 'force') },
      { label: 'M', value: formatPhysical(nodeResult.rm, units, 'moment'), tone: 'moment' },
    ];
  } else if (selectedMember) {
    summaryType = t('inspector.member');
    summaryId = selectedMember.id;
    summaryDescription = `${selectedMember.type === 'frame' ? t('inspector.frame') : selectedMember.type === 'truss' ? t('inspector.truss') : t('inspector.rigid')} · ${selectedMember.i} → ${selectedMember.j}`;
    SummaryIcon = Minus;
    if (memberResult && (!classroomMode || resultsVisible)) summaryMetrics = [
      { label: 'N máx.', value: formatPhysical(memberResult.maxAxial, units, 'force'), tone: 'axial' },
      { label: 'V máx.', value: formatPhysical(memberResult.maxShear, units, 'force'), tone: 'shear' },
      { label: 'M máx.', value: formatPhysical(memberResult.maxMoment, units, 'moment'), tone: 'moment' },
    ];
  } else if (selectedNodalLoad) {
    const hasForce = Math.hypot(selectedNodalLoad.fx, selectedNodalLoad.fy) !== 0;
    const hasMoment = selectedNodalLoad.mz !== 0;
    summaryType = hasForce && hasMoment ? 'Carga nodal mixta' : hasMoment ? 'Momento' : 'Carga puntual';
    summaryId = selectedNodalLoad.id;
    summaryDescription = `Nodo ${selectedNodalLoad.nodeId} · ${selectedNodalLoad.caseId}`;
    SummaryIcon = hasMoment && !hasForce ? RotateCcw : MoveDown;
  } else if (selectedMemberLoad) {
    summaryType = selectedMemberLoad.type === 'distributed' ? 'Carga distribuida' : selectedMemberLoad.type === 'point' ? 'Carga puntual' : 'Momento';
    summaryId = selectedMemberLoad.id;
    summaryDescription = `Miembro ${selectedMemberLoad.memberId} · ${selectedMemberLoad.caseId}`;
    SummaryIcon = selectedMemberLoad.type === 'distributed' ? Sigma : selectedMemberLoad.type === 'point' ? MoveDown : RotateCcw;
  } else if (selection?.kind === 'multi') {
    summaryType = t('inspector.multiple');
    summaryId = `${multiCount} objetos`;
    summaryDescription = `${selection.nodeIds.length} nodos · ${selection.memberIds.length} miembros`;
    SummaryIcon = Layers3;
  }

  const renderNodeAdvanced = selectedNode ? <>
    <InspectorPropertyGroup title={t('inspector.connection')} description="Comportamiento rotacional del nodo.">
      <label className="toggle-row">
        <span>{t('inspector.internalHinge')}<small>{t('inspector.internalHingeHelp')}</small></span>
        <input type="checkbox" checked={selectedNode.internalHinge ?? false} onChange={(event) => updateNode('internalHinge', event.target.checked)} />
      </label>
    </InspectorPropertyGroup>

    {!classroomMode ? <InspectorPropertyGroup title="Resortes" description="Rigideces elásticas opcionales del apoyo.">
      <PhysicalNumberField label="kx" value={selectedNode.support.spring?.kx ?? 0} units={units} quantity="translationalStiffness" resetKey={`${selectionKey}:spring-kx`} validate={nonNegative} onCommit={(value) => updateNode('spring.kx', value)} />
      <PhysicalNumberField label="ky" value={selectedNode.support.spring?.ky ?? 0} units={units} quantity="translationalStiffness" resetKey={`${selectionKey}:spring-ky`} validate={nonNegative} onCommit={(value) => updateNode('spring.ky', value)} />
      <PhysicalNumberField label="kθ" value={selectedNode.support.spring?.kr ?? 0} units={units} quantity="rotationalStiffness" resetKey={`${selectionKey}:spring-kr`} validate={nonNegative} onCommit={(value) => updateNode('spring.kr', value)} />
      <PhysicalNumberField label="k normal" value={selectedNode.support.spring?.kNormal ?? 0} units={units} quantity="translationalStiffness" resetKey={`${selectionKey}:spring-normal`} validate={nonNegative} onCommit={(value) => updateNode('spring.kNormal', value)} />
    </InspectorPropertyGroup> : <InspectorLockedState title="Resortes bloqueados en modo Aula">Cambia a Completo para editar rigideces elásticas; los valores almacenados se conservan.</InspectorLockedState>}

    {!classroomMode && selectedNode.support.type !== 'none' ? <InspectorPropertyGroup title="Asentamientos por caso" description="Movimiento impuesto en un grado de libertad restringido.">
      <div className="section-heading">
        <span className="section-description">{selectedNodePrescribed.length > 0 ? `${selectedNodePrescribed.length} definidos` : 'Sin asentamientos definidos'}</span>
        <button type="button" className="mini-button" aria-label="Añadir desplazamiento prescrito" onClick={() => updateProject((draft) => {
          draft.prescribedDisplacements ??= [];
          let index = 1;
          while (draft.prescribedDisplacements.some((item) => item.id === `PD${index}`)) index += 1;
          const node = draft.nodes.find((item) => item.id === selectedNode.id);
          const component: PrescribedDisplacement['component'] = node?.support.type === 'roller' ? 'normal' : node?.support.type === 'custom' && !node.support.restrainX && node.support.restrainY ? 'uy' : node?.support.type === 'custom' && !node.support.restrainX && !node.support.restrainY ? 'rz' : 'ux';
          draft.prescribedDisplacements.push({ id: `PD${index}`, nodeId: selectedNode.id, caseId: draft.loadCases[0]?.id ?? 'LC1', component, value: 0 });
          return draft;
        })}><Plus size={15} /></button>
      </div>
      <div className="effect-list">{selectedNodePrescribed.map((item) => <div className="effect-card" key={item.id}>
        <SelectField label="Caso" value={item.caseId} onChange={(value) => updatePrescribed(item.id, 'caseId', value)}>{project.loadCases.map((loadCase) => <option key={loadCase.id} value={loadCase.id}>{loadCase.name}</option>)}</SelectField>
        <SelectField label="Componente" value={item.component} onChange={(value) => updatePrescribed(item.id, 'component', value)}>
          {selectedNode.support.type === 'roller' ? <option value="normal">Normal</option> : <>
            <option value="ux">Ux</option><option value="uy">Uy</option>
            {selectedNode.support.type === 'fixed' || selectedNode.support.type === 'custom' ? <option value="rz">Rz</option> : null}
          </>}
        </SelectField>
        {item.component === 'rz' ? <InspectorNumericField label="Valor" value={item.value} unit="rad" resetKey={`${selectionKey}:${item.id}:value`} onCommit={(value) => updatePrescribed(item.id, 'value', value)} /> : <PhysicalNumberField label="Valor" value={item.value} units={units} quantity="length" resetKey={`${selectionKey}:${item.id}:value`} onCommit={(value) => updatePrescribed(item.id, 'value', value)} />}
        <button type="button" className="icon-danger-button" aria-label={`Eliminar ${item.id}`} onClick={() => updateProject((draft) => {
          draft.prescribedDisplacements = (draft.prescribedDisplacements ?? []).filter((candidate) => candidate.id !== item.id);
          return draft;
        })}><Trash2 size={14} /> Eliminar</button>
      </div>)}</div>
      <InspectorHelper>El factor del caso o combinación activa multiplica el valor. En un rodillo se mide sobre la normal restringida.</InspectorHelper>
    </InspectorPropertyGroup> : null}
    {!classroomMode && selectedNode.support.type === 'none' ? <InspectorLockedState title="Asentamientos no disponibles">Selecciona un tipo de apoyo para habilitar movimientos prescritos compatibles.</InspectorLockedState> : null}
    {classroomMode ? <InspectorLockedState title="Asentamientos bloqueados en modo Aula">Cambia a Completo para editar desplazamientos prescritos por caso.</InspectorLockedState> : null}
  </> : null;

  const renderMemberAdvanced = selectedMember ? <>
    {selectedMember.type === 'rigid' ? <InspectorLockedState title="Propiedades mecánicas bloqueadas">El vínculo rígido usa compatibilidad cinemática exacta; no recibe una rigidez artificial.</InspectorLockedState> : <>
      {!classroomMode ? <InspectorPropertyGroup title="Material complementario" description="Propiedades menos frecuentes del elemento.">
        <PhysicalNumberField label="ρ" value={selectedMember.density ?? 0} units={units} quantity="density" resetKey={`${selectionKey}:density`} validate={nonNegative} hint={selectedMember.density === undefined ? 'Sin valor explícito; solo se guarda si lo editas.' : undefined} onCommit={(value) => updateMember('density', value)} />
      </InspectorPropertyGroup> : null}

      {selectedMember.type === 'frame' && !classroomMode ? <InspectorPropertyGroup title="Teoría de viga" description="Modelo de deformación del miembro.">
        <SelectField label="Teoría" value={selectedMember.beamTheory ?? 'euler-bernoulli'} onChange={(value) => updateMember('beamTheory', value)}>
          <option value="euler-bernoulli">Euler–Bernoulli</option><option value="timoshenko">Timoshenko</option>
        </SelectField>
        {selectedMember.beamTheory === 'timoshenko' ? <>
          <PhysicalNumberField label="G" value={selectedMember.G ?? selectedMember.E / 2.6} units={units} quantity="elasticModulus" resetKey={`${selectionKey}:G`} hint={selectedMember.G === undefined ? 'Valor sugerido; solo se guarda si lo editas.' : undefined} onCommit={(value) => updateMember('G', value)} />
          <PhysicalNumberField label="As efectiva" value={selectedMember.shearArea ?? selectedMember.A * 5 / 6} units={units} quantity="area" resetKey={`${selectionKey}:As`} hint={selectedMember.shearArea === undefined ? 'Valor sugerido; solo se guarda si lo editas.' : 'Incluye la corrección de cortante.'} onCommit={(value) => updateMember('shearArea', value)} />
        </> : null}
      </InspectorPropertyGroup> : null}

      {!classroomMode ? <InspectorPropertyGroup title="Temperatura y deformación inicial" description="Efectos dependientes del caso de carga.">
        <div className="section-heading">
          <span className="section-description">{selectedMemberEffects.length > 0 ? `${selectedMemberEffects.length} definidos` : 'Sin efectos iniciales'}</span>
          <button type="button" className="mini-button" aria-label="Añadir efecto inicial" onClick={() => updateProject((draft) => {
            draft.memberInitialEffects ??= [];
            let index = 1;
            while (draft.memberInitialEffects.some((item) => item.id === `IE${index}`)) index += 1;
            draft.memberInitialEffects.push({ id: `IE${index}`, memberId: selectedMember.id, caseId: draft.loadCases[0]?.id ?? 'LC1', type: 'temperature', alpha: 1.2e-5, deltaT: 0, gradient: 0 });
            return draft;
          })}><Plus size={15} /></button>
        </div>
        <div className="effect-list">{selectedMemberEffects.map((effect) => <div className="effect-card" key={effect.id}>
          <SelectField label="Tipo" value={effect.type} onChange={(value) => updateInitialEffect(effect.id, 'type', value)}><option value="temperature">Temperatura</option><option value="initial-strain">Deformación inicial</option></SelectField>
          <SelectField label="Caso" value={effect.caseId} onChange={(value) => updateInitialEffect(effect.id, 'caseId', value)}>{project.loadCases.map((loadCase) => <option key={loadCase.id} value={loadCase.id}>{loadCase.name}</option>)}</SelectField>
          {effect.type === 'temperature' ? <>
            <InspectorNumericField label="α" value={effect.alpha ?? 1.2e-5} unit="1/°C" resetKey={`${selectionKey}:${effect.id}:alpha`} validate={nonNegative} onCommit={(value) => updateInitialEffect(effect.id, 'alpha', Math.max(0, value))} />
            <InspectorNumericField label="ΔT uniforme" value={effect.deltaT ?? 0} unit="°C" resetKey={`${selectionKey}:${effect.id}:delta-t`} onCommit={(value) => updateInitialEffect(effect.id, 'deltaT', value)} />
            {selectedMember.type === 'frame' ? <InspectorNumericField label="Gradiente hacia +y local" value={effect.gradient ?? 0} unit="°C/m" resetKey={`${selectionKey}:${effect.id}:gradient`} onCommit={(value) => updateInitialEffect(effect.id, 'gradient', value)} /> : null}
          </> : <>
            <InspectorNumericField label="ε₀ axial" value={effect.axialStrain ?? 0} unit="" resetKey={`${selectionKey}:${effect.id}:strain`} onCommit={(value) => updateInitialEffect(effect.id, 'axialStrain', value)} />
            {selectedMember.type === 'frame' ? <InspectorNumericField label="κ₀" value={effect.curvature ?? 0} unit="1/m" resetKey={`${selectionKey}:${effect.id}:curvature`} onCommit={(value) => updateInitialEffect(effect.id, 'curvature', value)} /> : null}
          </>}
          <button type="button" className="icon-danger-button" aria-label={`Eliminar ${effect.id}`} onClick={() => updateProject((draft) => {
            draft.memberInitialEffects = (draft.memberInitialEffects ?? []).filter((candidate) => candidate.id !== effect.id);
            return draft;
          })}><Trash2 size={14} /> Eliminar</button>
        </div>)}</div>
        <InspectorHelper>ε₀ positivo alarga; κ₀ positivo incrementa dθ/dx. Un gradiente térmico positivo hacia +y produce κ₀ negativo.</InspectorHelper>
      </InspectorPropertyGroup> : <InspectorLockedState title="Propiedades avanzadas bloqueadas en modo Aula">Los valores mecánicos almacenados se conservan. Cambia a Completo para editarlos.</InspectorLockedState>}

      {selectedMember.type === 'frame' ? <InspectorPropertyGroup title="Conexiones" description="Semirrigidez y zonas rígidas de extremo.">
        {!classroomMode ? <>
          <h4 className="subsection-title">Conexiones semirrígidas</h4>
          <label className="toggle-row"><span>Activar en i</span><input type="checkbox" checked={selectedMember.rotationalSpringI !== undefined} onChange={(event) => updateMember('useRotationalSpringI', event.target.checked)} /></label>
          {selectedMember.rotationalSpringI !== undefined ? <PhysicalNumberField label="kθ extremo i" value={selectedMember.rotationalSpringI} units={units} quantity="rotationalStiffness" resetKey={`${selectionKey}:rot-spring-i`} validate={nonNegative} onCommit={(value) => updateMember('rotationalSpringI', value)} /> : null}
          <label className="toggle-row"><span>Activar en j</span><input type="checkbox" checked={selectedMember.rotationalSpringJ !== undefined} onChange={(event) => updateMember('useRotationalSpringJ', event.target.checked)} /></label>
          {selectedMember.rotationalSpringJ !== undefined ? <PhysicalNumberField label="kθ extremo j" value={selectedMember.rotationalSpringJ} units={units} quantity="rotationalStiffness" resetKey={`${selectionKey}:rot-spring-j`} validate={nonNegative} onCommit={(value) => updateMember('rotationalSpringJ', value)} /> : null}
          <InspectorHelper>Sin resorte significa unión rígida; kθ = 0 equivale a articulación. La liberación prevalece.</InspectorHelper>
          <h4 className="subsection-title">Zonas rígidas</h4>
          <PhysicalNumberField label="Offset i" value={selectedMember.rigidOffsetI ?? 0} units={units} quantity="length" resetKey={`${selectionKey}:offset-i`} validate={nonNegative} onCommit={(value) => updateMember('rigidOffsetI', Math.max(0, value))} />
          <PhysicalNumberField label="Offset j" value={selectedMember.rigidOffsetJ ?? 0} units={units} quantity="length" resetKey={`${selectionKey}:offset-j`} validate={nonNegative} onCommit={(value) => updateMember('rigidOffsetJ', Math.max(0, value))} />
          <InspectorHelper>Las cargas de miembro y los diagramas se definen sobre la longitud flexible entre caras.</InspectorHelper>
        </> : <InspectorLockedState title="Semirrigidez y offsets bloqueados">Cambia a Completo para editar conexiones avanzadas.</InspectorLockedState>}
      </InspectorPropertyGroup> : null}
    </>}
  </> : null;

  return <div className="inspector-properties">
    <div className="inspector-selection-header">
      <InspectorSelectionSummary
        icon={SummaryIcon}
        type={summaryType}
        id={summaryId}
        description={summaryDescription}
        metrics={summaryMetrics}
        empty={selection === null}
      />
    </div>

    {selection === null ? <div className="inspector-empty-state">
      {classroomMode ? <ClassroomGuide compact project={project} analysis={analysis} onChooseTool={setActiveTool} onAnalyze={analyze} /> : <InspectorHelper>Selecciona un objeto para ver sus propiedades, unidades y resultados derivados.</InspectorHelper>}
    </div> : null}

    {selection?.kind === 'multi' ? <>
      <InspectorPropertyGroup title="Resumen de selección" mode="derived" description="La selección múltiple es de lectura para evitar cambios físicos ambiguos.">
        <InspectorDerivedList rows={[
          { label: 'Nodos', value: selection.nodeIds.length, description: selection.nodeIds.join(', ') || 'Ninguno' },
          { label: 'Miembros', value: selection.memberIds.length, description: selection.memberIds.join(', ') || 'Ninguno' },
          { label: 'Total', value: multiCount },
        ]} />
      </InspectorPropertyGroup>
      <InspectorLockedState title="Edición masiva bloqueada">Selecciona un solo objeto para editar. Esta fase no agrega handlers masivos ni cambia contratos de selección.</InspectorLockedState>
    </> : null}

    {selectedNode ? <>
      <InspectorPropertyGroup title="Propiedades frecuentes" description="Posición y condición de apoyo del nodo.">
        <PhysicalNumberField label="X" value={selectedNode.x} units={units} quantity="length" resetKey={`${selectionKey}:x`} onCommit={(value) => updateNode('x', value)} />
        <PhysicalNumberField label="Y" value={selectedNode.y} units={units} quantity="length" resetKey={`${selectionKey}:y`} onCommit={(value) => updateNode('y', value)} />
        <SelectField label={t('inspector.support')} value={selectedNode.support.type} onChange={(value) => updateNode('supportType', value)}>
          <option value="none">{t('inspector.free')}</option><option value="pin">{t('inspector.pin')}</option><option value="roller">{t('inspector.roller')}</option><option value="fixed">{t('inspector.fixed')}</option><option value="custom">{t('inspector.custom')}</option>
        </SelectField>
        {selectedNode.support.type === 'roller' ? <InspectorNumericField label="Normal" value={selectedNode.support.angleDeg ?? 90} unit="°" resetKey={`${selectionKey}:support-angle`} formatOptions={{ maximumFractionDigits: 2 }} hint="Dirección restringida, antihoraria desde +X global." onCommit={(value) => updateNode('supportAngle', value)} /> : null}
        {selectedNode.support.type === 'custom' ? <div className="checkbox-grid" role="group" aria-label="Grados de libertad restringidos">
          <label><input type="checkbox" checked={selectedNode.support.restrainX ?? false} onChange={(event) => updateNode('restrainX', event.target.checked)} /> Ux</label>
          <label><input type="checkbox" checked={selectedNode.support.restrainY ?? false} onChange={(event) => updateNode('restrainY', event.target.checked)} /> Uy</label>
          <label><input type="checkbox" checked={selectedNode.support.restrainR ?? false} onChange={(event) => updateNode('restrainR', event.target.checked)} /> Rz</label>
        </div> : null}
      </InspectorPropertyGroup>
      <InspectorPropertyGroup title="Valores derivados" mode="derived" description="Solo lectura; se recalculan con el modelo.">
        <InspectorDerivedList rows={[
          { label: 'ID', value: selectedNode.id, description: 'Identificador del modelo' },
          ...(nodeResult && (!classroomMode || resultsVisible) ? [
            ...(!classroomMode ? [
              { label: 'Ux', value: formatPhysical(nodeResult.ux, units, 'length') },
              { label: 'Uy', value: formatPhysical(nodeResult.uy, units, 'length') },
              { label: 'Rz', value: formatInspectorValue(nodeResult.rz, 'rad') },
            ] : []),
            { label: 'Rx', value: formatPhysical(nodeResult.rx, units, 'force') },
            { label: 'Ry', value: formatPhysical(nodeResult.ry, units, 'force') },
            { label: 'M', value: formatPhysical(nodeResult.rm, units, 'moment') },
          ] : []),
        ]} />
      </InspectorPropertyGroup>
      <InspectorAdvancedProperties id="advanced-node" expanded={expandedSections} onExpandedChange={setExpandedSections}>{renderNodeAdvanced}</InspectorAdvancedProperties>
      <InspectorIssues issues={selectedIssues} />
    </> : null}

    {selectedMember ? (() => {
      const ni = nodeMap.get(selectedMember.i);
      const nj = nodeMap.get(selectedMember.j);
      const length = ni && nj ? Math.hypot(nj.x - ni.x, nj.y - ni.y) : Number.NaN;
      const angle = ni && nj ? Math.atan2(nj.y - ni.y, nj.x - ni.x) * 180 / Math.PI : Number.NaN;
      return <>
        <InspectorPropertyGroup title="Propiedades frecuentes" description="Tipo, material y sección del elemento.">
          <SelectField label={t('inspector.element')} value={selectedMember.type} onChange={(value) => updateMember('type', value)}>
            <option value="frame">{t('inspector.frame')}</option><option value="truss">{t('inspector.truss')}</option><option value="rigid">{t('inspector.rigid')}</option>
          </SelectField>
          {selectedMember.type !== 'rigid' && !classroomMode ? <>
            <PhysicalNumberField label="E" value={selectedMember.E} units={units} quantity="elasticModulus" resetKey={`${selectionKey}:E`} hint="El dominio valida E > 0 al analizar." onCommit={(value) => updateMember('E', value)} />
            <PhysicalNumberField label="A" value={selectedMember.A} units={units} quantity="area" resetKey={`${selectionKey}:A`} hint="El dominio valida A > 0 al analizar." onCommit={(value) => updateMember('A', value)} />
            <PhysicalNumberField label="I" value={selectedMember.I} units={units} quantity="inertia" resetKey={`${selectionKey}:I`} hint={selectedMember.type === 'frame' ? 'El dominio valida I > 0 al analizar.' : 'Se conserva para compatibilidad si el tipo cambia a pórtico.'} onCommit={(value) => updateMember('I', value)} />
          </> : null}
          {selectedMember.type !== 'rigid' && classroomMode ? <InspectorLockedState title="Material bloqueado en modo Aula">E, A e I conservan los valores actuales. Cambia a Completo para editarlos.</InspectorLockedState> : null}
          {selectedMember.type === 'rigid' ? <InspectorLockedState title="Sin propiedades de rigidez editables">El vínculo rígido se define por su cinemática.</InspectorLockedState> : null}
          {selectedMember.type === 'frame' ? <div className="checkbox-grid" role="group" aria-label="Liberaciones de momento">
            <label><input type="checkbox" checked={selectedMember.releases?.iMoment ?? false} onChange={(event) => updateMember('iMoment', event.target.checked)} /> Momento i</label>
            <label><input type="checkbox" checked={selectedMember.releases?.jMoment ?? false} onChange={(event) => updateMember('jMoment', event.target.checked)} /> Momento j</label>
          </div> : null}
        </InspectorPropertyGroup>
        <InspectorPropertyGroup title="Valores derivados" mode="derived" description="Geometría y extremos calculados, sin edición directa.">
          <InspectorDerivedList rows={[
            { label: t('inspector.nodeI'), value: selectedMember.i },
            { label: t('inspector.nodeJ'), value: selectedMember.j },
            { label: t('inspector.length'), value: formatPhysical(length, units, 'length') },
            { label: t('inspector.angle'), value: formatInspectorValue(angle, '°', { maximumFractionDigits: 2 }) },
            ...(memberResult && (!classroomMode || resultsVisible) ? [
              { label: 'N máx.', value: formatPhysical(memberResult.maxAxial, units, 'force') },
              { label: 'V máx.', value: formatPhysical(memberResult.maxShear, units, 'force') },
              { label: 'M máx.', value: formatPhysical(memberResult.maxMoment, units, 'moment') },
            ] : []),
          ]} />
        </InspectorPropertyGroup>
        <InspectorAdvancedProperties id="advanced-member" expanded={expandedSections} onExpandedChange={setExpandedSections}>{renderMemberAdvanced}</InspectorAdvancedProperties>
        <InspectorIssues issues={selectedIssues} />
      </>;
    })() : null}

    {selectedNodalLoad ? <>
      <InspectorPropertyGroup title="Propiedades frecuentes" description="Componentes de fuerza y momento aplicados al nodo.">
        <SelectField label="Caso" value={selectedNodalLoad.caseId} onChange={(value) => updateNodalLoad('caseId', value)}>{project.loadCases.map((loadCase) => <option key={loadCase.id} value={loadCase.id}>{loadCase.name}</option>)}</SelectField>
        <PhysicalNumberField label="Horizontal Fx" value={selectedNodalLoad.fx} units={units} quantity="force" resetKey={`${selectionKey}:fx`} onCommit={(value) => updateNodalLoad('fx', value)} />
        <PhysicalNumberField label="Vertical Fy" value={selectedNodalLoad.fy} units={units} quantity="force" resetKey={`${selectionKey}:fy`} onCommit={(value) => updateNodalLoad('fy', value)} />
        <PhysicalNumberField label="Momento Mz" value={selectedNodalLoad.mz} units={units} quantity="moment" resetKey={`${selectionKey}:mz`} onCommit={(value) => updateNodalLoad('mz', value)} />
        <InspectorHelper>Un signo negativo invierte la dirección visual. Fuerza y momento pueden coexistir en el mismo registro.</InspectorHelper>
      </InspectorPropertyGroup>
      <InspectorPropertyGroup title="Valores derivados" mode="derived"><InspectorDerivedList rows={[{ label: 'ID', value: selectedNodalLoad.id }, { label: 'Nodo', value: selectedNodalLoad.nodeId }]} /></InspectorPropertyGroup>
      <InspectorAdvancedProperties id="advanced-nodal-load" expanded={expandedSections} onExpandedChange={setExpandedSections}>
        <InspectorLockedState title="Relación con el modelo">El nodo de aplicación y el identificador se derivan de la carga seleccionada.</InspectorLockedState>
      </InspectorAdvancedProperties>
      <InspectorIssues issues={selectedIssues} />
      <button type="button" className="danger-button" onClick={() => deleteLoad('nodal', selectedNodalLoad.id)}><Trash2 size={15} /> Eliminar carga</button>
    </> : null}

    {selectedMemberLoad ? <>
      <InspectorPropertyGroup title="Propiedades frecuentes" description="Magnitud y posición sobre el miembro.">
        <SelectField label="Tipo" value={selectedMemberLoad.type} onChange={(value) => updateMemberLoad('type', value)}><option value="distributed">Distribuida</option><option value="point">Puntual</option><option value="moment">Momento</option></SelectField>
        <SelectField label="Caso" value={selectedMemberLoad.caseId} onChange={(value) => updateMemberLoad('caseId', value)}>{project.loadCases.map((loadCase) => <option key={loadCase.id} value={loadCase.id}>{loadCase.name}</option>)}</SelectField>
        <div className="segmented-control" role="group" aria-label="Sistema de coordenadas">
          {[{ value: 'global', label: 'Global' }, { value: 'local', label: 'Local' }].map((option) => <button type="button" key={option.value} aria-pressed={selectedMemberLoad.coordinateSystem === option.value} className={selectedMemberLoad.coordinateSystem === option.value ? 'active' : ''} onClick={() => updateMemberLoad('coordinateSystem', option.value)}>{option.label}</button>)}
        </div>
        {selectedMemberLoad.type === 'distributed' ? <SelectField label="Base" value={selectedMemberLoad.lengthBasis} onChange={(value) => updateMemberLoad('lengthBasis', value)}><option value="real">Longitud real</option><option value="horizontal">Proyección horizontal</option><option value="vertical">Proyección vertical</option></SelectField> : null}
        {selectedMemberLoad.type === 'distributed' ? <>
          <InspectorNumericField label="Desde" value={selectedMemberLoad.start} unit="x/L" resetKey={`${selectionKey}:start`} hint="Intervalo normalizado; debe ser menor que fin." validate={normalizedPosition} onCommit={(value) => updateMemberLoad('start', Math.max(0, Math.min(1, value)))} />
          <InspectorNumericField label="Hasta" value={selectedMemberLoad.end} unit="x/L" resetKey={`${selectionKey}:end`} hint="Intervalo normalizado; debe ser mayor que inicio." validate={normalizedPosition} onCommit={(value) => updateMemberLoad('end', Math.max(0, Math.min(1, value)))} />
          <PhysicalNumberField label="qx al inicio" value={selectedMemberLoad.qxStart ?? 0} units={units} quantity="distributedForce" resetKey={`${selectionKey}:qx-start`} onCommit={(value) => updateMemberLoad('qxStart', value)} />
          <PhysicalNumberField label="qx al final" value={selectedMemberLoad.qxEnd ?? 0} units={units} quantity="distributedForce" resetKey={`${selectionKey}:qx-end`} onCommit={(value) => updateMemberLoad('qxEnd', value)} />
          <PhysicalNumberField label="qy al inicio" value={selectedMemberLoad.qyStart ?? 0} units={units} quantity="distributedForce" resetKey={`${selectionKey}:qy-start`} onCommit={(value) => updateMemberLoad('qyStart', value)} />
          <PhysicalNumberField label="qy al final" value={selectedMemberLoad.qyEnd ?? 0} units={units} quantity="distributedForce" resetKey={`${selectionKey}:qy-end`} onCommit={(value) => updateMemberLoad('qyEnd', value)} />
        </> : null}
        {selectedMemberLoad.type === 'point' ? <>
          <InspectorNumericField label="Posición" value={selectedMemberLoad.position ?? 0.5} unit="x/L" resetKey={`${selectionKey}:position`} validate={normalizedPosition} onCommit={(value) => updateMemberLoad('position', Math.max(0, Math.min(1, value)))} />
          <PhysicalNumberField label="Fuerza X" value={selectedMemberLoad.px ?? 0} units={units} quantity="force" resetKey={`${selectionKey}:px`} onCommit={(value) => updateMemberLoad('px', value)} />
          <PhysicalNumberField label="Fuerza Y" value={selectedMemberLoad.py ?? 0} units={units} quantity="force" resetKey={`${selectionKey}:py`} onCommit={(value) => updateMemberLoad('py', value)} />
        </> : null}
        {selectedMemberLoad.type === 'moment' ? <>
          <InspectorNumericField label="Posición" value={selectedMemberLoad.position ?? 0.5} unit="x/L" resetKey={`${selectionKey}:position`} validate={normalizedPosition} onCommit={(value) => updateMemberLoad('position', Math.max(0, Math.min(1, value)))} />
          <PhysicalNumberField label="M" value={selectedMemberLoad.moment ?? 0} units={units} quantity="moment" resetKey={`${selectionKey}:moment`} onCommit={(value) => updateMemberLoad('moment', value)} />
        </> : null}
      </InspectorPropertyGroup>
      <InspectorPropertyGroup title="Valores derivados" mode="derived"><InspectorDerivedList rows={[{ label: 'ID', value: selectedMemberLoad.id }, { label: 'Miembro', value: selectedMemberLoad.memberId }]} /></InspectorPropertyGroup>
      <InspectorAdvancedProperties id="advanced-member-load" expanded={expandedSections} onExpandedChange={setExpandedSections}>
        <InspectorPropertyGroup title="Interpretación" description="Convención geométrica de la carga seleccionada.">
          <InspectorHelper tone="warning">La base se convierte explícitamente antes del análisis; no modifica las magnitudes almacenadas.</InspectorHelper>
        </InspectorPropertyGroup>
      </InspectorAdvancedProperties>
      <InspectorIssues issues={selectedIssues} />
      <button type="button" className="danger-button" onClick={() => deleteLoad('member', selectedMemberLoad.id)}><Trash2 size={15} /> Eliminar carga</button>
    </> : null}
  </div>;
};
