import { useEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import { AlertTriangle, ChevronRight, CircleHelp, MoveDown, Plus, RotateCcw, Sigma, Trash2, X } from 'lucide-react';
import { useProject } from '../store/ProjectContext';
import type { MemberInitialEffect, MemberLoad, NodalLoad, PrescribedDisplacement, SupportType, Tool } from '../types';
import { formatDisplay, fromDisplay, toDisplay, unitLabel, type UnitQuantity } from '../engine/units';
import { useI18n } from '../i18n/useI18n';
import { useClassroomSession } from '../store/ClassroomSessionContext';
import { ClassroomGuide } from './ClassroomGuide';
import { repairProjectTopology } from '../data/modelOperations';

const NumberField = ({ label, value, unit, step = 'any', onChange }: { label: string; value: number; unit?: string; step?: string; onChange: (value: number) => void }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [text, setText] = useState(() => Number.isFinite(value) ? String(value) : '0');
  useEffect(() => {
    if (document.activeElement !== inputRef.current) setText(Number.isFinite(value) ? String(value) : '0');
  }, [value]);
  return (
    <label className="field-row">
      <span>{label}</span>
      <div className="number-control">
        <input
          ref={inputRef}
          aria-label={label}
          type="number"
          inputMode="decimal"
          step={step}
          value={text}
          onChange={(event) => {
            setText(event.target.value);
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter') event.currentTarget.blur();
            if (event.key === 'Escape') {
              setText(Number.isFinite(value) ? String(value) : '0');
              event.currentTarget.blur();
            }
          }}
          onBlur={() => {
            const parsed = Number(text);
            if (text.trim() === '' || !Number.isFinite(parsed)) setText(Number.isFinite(value) ? String(value) : '0');
            else onChange(parsed);
          }}
        />
        {unit ? <small>{unit}</small> : null}
      </div>
    </label>
  );
};

const Segmented = ({ value, options, onChange }: { value: string; options: Array<{ value: string; label: string }>; onChange: (value: string) => void }) => (
  <div className="segmented-control" role="group">
    {options.map((option) => <button key={option.value} aria-pressed={value === option.value} className={value === option.value ? 'active' : ''} onClick={() => onChange(option.value)}>{option.label}</button>)}
  </div>
);

const loadToolOptions: Array<{ tool: Extract<Tool, 'pointLoad' | 'distributedLoad' | 'moment'>; label: string; detail: string; icon: typeof MoveDown }> = [
  { tool: 'pointLoad', label: 'Puntual', detail: 'En nodo o miembro', icon: MoveDown },
  { tool: 'distributedLoad', label: 'Distribuida', detail: 'Sobre un miembro', icon: Sigma },
  { tool: 'moment', label: 'Momento', detail: 'En nodo o miembro', icon: RotateCcw },
];

export const Inspector = ({ className = '', modal = false, onClose }: { className?: string; modal?: boolean; onClose?: () => void }) => {
  const { project, analysis, selection, activeTool, setActiveTool, setSelection, updateProject, selectedCombinationId, setSelectedCombinationId, analyze } = useProject();
  const { t } = useI18n();
  const { resultsVisible } = useClassroomSession();
  const [tab, setTab] = useState<'inspector' | 'loads' | 'display'>('inspector');
  const panelRef = useRef<HTMLElement>(null);
  const units = project.settings.units;
  const classroomMode = project.settings.calculationMode === 'classroom';
  const display = (value: number, quantity: UnitQuantity) => toDisplay(value, units, quantity);
  const base = (value: number, quantity: UnitQuantity) => fromDisplay(value, units, quantity);
  const selectedNode = selection?.kind === 'node' ? project.nodes.find((node) => node.id === selection.id) : null;
  const selectedMember = selection?.kind === 'member' ? project.members.find((member) => member.id === selection.id) : null;
  const selectedNodalLoad = selection?.kind === 'nodalLoad' ? project.nodalLoads.find((load) => load.id === selection.id) : null;
  const selectedMemberLoad = selection?.kind === 'memberLoad' ? project.memberLoads.find((load) => load.id === selection.id) : null;
  const selectedNodePrescribed = selectedNode ? (project.prescribedDisplacements ?? []).filter((item) => item.nodeId === selectedNode.id) : [];
  const selectedMemberEffects = selectedMember ? (project.memberInitialEffects ?? []).filter((effect) => effect.memberId === selectedMember.id) : [];
  const nodeMap = useMemo(() => new Map(project.nodes.map((node) => [node.id, node])), [project.nodes]);
  const memberResult = selectedMember ? analysis?.memberResults.find((result) => result.memberId === selectedMember.id) : null;
  const multiCount = selection?.kind === 'multi' ? selection.nodeIds.length + selection.memberIds.length : 0;

  useEffect(() => {
    if (selection) setTab('inspector');
  }, [selection]);

  useEffect(() => {
    if (!modal) return;
    const panel = panelRef.current;
    const focusable = panel?.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])');
    focusable?.[0]?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); onClose?.(); return; }
      if (event.key !== 'Tab' || !focusable?.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [modal, onClose]);

  const chooseLoadTool = (tool: Extract<Tool, 'pointLoad' | 'distributedLoad' | 'moment'>) => {
    setActiveTool(tool);
    onClose?.();
  };

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
        const springKey = key.split('.')[1] as 'kx' | 'ky' | 'kr' | 'kNormal' | 'angleDeg';
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
    }
    else if (key === 'rigidOffsetI' || key === 'rigidOffsetJ') member[key] = Math.max(0, Number(value));
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

  const inspectorTabs = ['inspector', 'loads', 'display'] as const;
  const onTabKeyDown = (event: ReactKeyboardEvent<HTMLButtonElement>, index: number) => {
    let nextIndex = index;
    if (event.key === 'ArrowLeft') nextIndex = (index - 1 + inspectorTabs.length) % inspectorTabs.length;
    else if (event.key === 'ArrowRight') nextIndex = (index + 1) % inspectorTabs.length;
    else if (event.key === 'Home') nextIndex = 0;
    else if (event.key === 'End') nextIndex = inspectorTabs.length - 1;
    else return;
    event.preventDefault();
    const next = inspectorTabs[nextIndex];
    setTab(next);
    panelRef.current?.querySelector<HTMLButtonElement>(`#inspector-tab-${next}`)?.focus();
  };

  return (
    <aside ref={panelRef} className={`inspector-panel ${className}`.trim()} role={modal ? 'dialog' : 'complementary'} aria-modal={modal || undefined} aria-label={t('inspector.tab')}>
      <div className="inspector-tabs" role="tablist" aria-label={t('inspector.tab')}>
        <button id="inspector-tab-inspector" role="tab" aria-controls="inspector-tabpanel" aria-selected={tab === 'inspector'} tabIndex={tab === 'inspector' ? 0 : -1} className={tab === 'inspector' ? 'active' : ''} onClick={() => setTab('inspector')} onKeyDown={(event) => onTabKeyDown(event, 0)}>{t('inspector.tab')}</button>
        <button id="inspector-tab-loads" role="tab" aria-controls="inspector-tabpanel" aria-selected={tab === 'loads'} tabIndex={tab === 'loads' ? 0 : -1} className={tab === 'loads' ? 'active' : ''} onClick={() => setTab('loads')} onKeyDown={(event) => onTabKeyDown(event, 1)}>{t('inspector.loadsTab')}</button>
        <button id="inspector-tab-display" role="tab" aria-controls="inspector-tabpanel" aria-selected={tab === 'display'} tabIndex={tab === 'display' ? 0 : -1} className={tab === 'display' ? 'active' : ''} onClick={() => setTab('display')} onKeyDown={(event) => onTabKeyDown(event, 2)}>{t('inspector.viewTab')}</button>
        <button className="mobile-inspector-close" aria-label={t('inspector.close')} onClick={onClose}><X size={18} /></button>
      </div>

      <div id="inspector-tabpanel" className="inspector-scroll" role="tabpanel" aria-labelledby={`inspector-tab-${tab}`}>
        {tab === 'inspector' ? (
          <>
            {classroomMode && !selection ? <ClassroomGuide compact project={project} analysis={analysis} onChooseTool={setActiveTool} onAnalyze={analyze} /> : null}
            <section className="inspector-section">
              <h3>{t('inspector.selection')}</h3>
              <div className="selection-card">
                <span className="selection-icon">{selectedNode ? '●' : selectedMember ? '╱' : selectedNodalLoad || selectedMemberLoad ? '↓' : multiCount ? '▣' : '—'}</span>
                <div>
                  <strong>{selectedNode?.id ?? selectedMember?.id ?? selectedNodalLoad?.id ?? selectedMemberLoad?.id ?? (multiCount ? t('inspector.multiple') : t('inspector.noneSelected'))}</strong>
                  <small>{selectedNode ? t('inspector.node') : selectedMember ? t('inspector.member') : selectedNodalLoad ? t('inspector.nodalLoad') : selectedMemberLoad ? t('inspector.memberLoad') : multiCount ? t('inspector.selectedCount', { count: multiCount }) : t('inspector.selectObject')}</small>
                </div>
              </div>
            </section>

            {selectedNode ? (
              <>
                <section className="inspector-section">
                  <h3>{t('inspector.coordinates')}</h3>
                  <NumberField label="X" value={display(selectedNode.x, 'length')} unit={unitLabel(units, 'length')} onChange={(value) => updateNode('x', base(value, 'length'))} />
                  <NumberField label="Y" value={display(selectedNode.y, 'length')} unit={unitLabel(units, 'length')} onChange={(value) => updateNode('y', base(value, 'length'))} />
                </section>
                <section className="inspector-section">
                  <h3>{t('inspector.support')}</h3>
                  <label className="select-field"><span>{t('inspector.type')}</span><select value={selectedNode.support.type} onChange={(event) => updateNode('supportType', event.target.value)}><option value="none">{t('inspector.free')}</option><option value="pin">{t('inspector.pin')}</option><option value="roller">{t('inspector.roller')}</option><option value="fixed">{t('inspector.fixed')}</option><option value="custom">{t('inspector.custom')}</option></select></label>
                  {selectedNode.support.type === 'roller' ? <NumberField label="Normal" value={selectedNode.support.angleDeg ?? 90} unit="°" onChange={(value) => updateNode('supportAngle', value)} /> : null}
                  {selectedNode.support.type === 'custom' ? <div className="checkbox-grid"><label><input type="checkbox" checked={selectedNode.support.restrainX ?? false} onChange={(event) => updateNode('restrainX', event.target.checked)} /> Ux</label><label><input type="checkbox" checked={selectedNode.support.restrainY ?? false} onChange={(event) => updateNode('restrainY', event.target.checked)} /> Uy</label><label><input type="checkbox" checked={selectedNode.support.restrainR ?? false} onChange={(event) => updateNode('restrainR', event.target.checked)} /> Rz</label></div> : null}
                </section>
                {!classroomMode && selectedNode.support.type !== 'none' ? <section className="inspector-section">
                  <div className="section-heading"><h3>Asentamientos por caso</h3><button className="mini-button" aria-label="Añadir desplazamiento prescrito" onClick={() => updateProject((draft) => {
                    draft.prescribedDisplacements ??= [];
                    let index = 1; while (draft.prescribedDisplacements.some((item) => item.id === `PD${index}`)) index += 1;
                    const node = draft.nodes.find((item) => item.id === selectedNode.id);
                    const component: PrescribedDisplacement['component'] = node?.support.type === 'roller' ? 'normal' : node?.support.type === 'custom' && !node.support.restrainX && node.support.restrainY ? 'uy' : node?.support.type === 'custom' && !node.support.restrainX && !node.support.restrainY ? 'rz' : 'ux';
                    draft.prescribedDisplacements.push({ id: `PD${index}`, nodeId: selectedNode.id, caseId: draft.loadCases[0]?.id ?? 'LC1', component, value: 0 });
                    return draft;
                  })}><Plus size={15} /></button></div>
                  <div className="effect-list">{selectedNodePrescribed.map((item) => <div className="effect-card" key={item.id}>
                    <label className="select-field"><span>Caso</span><select value={item.caseId} onChange={(event) => updatePrescribed(item.id, 'caseId', event.target.value)}>{project.loadCases.map((loadCase) => <option key={loadCase.id} value={loadCase.id}>{loadCase.name}</option>)}</select></label>
                    <label className="select-field"><span>Componente</span><select value={item.component} onChange={(event) => updatePrescribed(item.id, 'component', event.target.value)}>{selectedNode.support.type === 'roller' ? <option value="normal">Normal</option> : <><option value="ux">Ux</option><option value="uy">Uy</option>{selectedNode.support.type === 'fixed' || selectedNode.support.type === 'custom' ? <option value="rz">Rz</option> : null}</>}</select></label>
                    <NumberField label="Valor" value={item.component === 'rz' ? item.value : display(item.value, 'length')} unit={item.component === 'rz' ? 'rad' : unitLabel(units, 'length')} onChange={(value) => updatePrescribed(item.id, 'value', item.component === 'rz' ? value : base(value, 'length'))} />
                    <button className="icon-danger-button" aria-label={`Eliminar ${item.id}`} onClick={() => updateProject((draft) => { draft.prescribedDisplacements = (draft.prescribedDisplacements ?? []).filter((candidate) => candidate.id !== item.id); return draft; })}><Trash2 size={14} /> Eliminar</button>
                  </div>)}</div>
                  <div className="inspector-note"><CircleHelp size={17} /> El valor se multiplica por el factor del caso o combinación activa. En un rodillo se mide sobre su normal restringida.</div>
                </section> : null}
                <section className="inspector-section">
                  <h3>{t('inspector.connection')}</h3>
                  <label className="toggle-row"><span>{t('inspector.internalHinge')}</span><input type="checkbox" checked={selectedNode.internalHinge ?? false} onChange={(event) => updateNode('internalHinge', event.target.checked)} /></label>
                  <div className="inspector-note"><CircleHelp size={17} /> {t('inspector.internalHingeHelp')}</div>
                </section>
                {!classroomMode ? <section className="inspector-section">
                  <h3>{t('inspector.springs')}</h3>
                  <NumberField label="kx" value={display(selectedNode.support.spring?.kx ?? 0, 'translationalStiffness')} unit={unitLabel(units, 'translationalStiffness')} onChange={(value) => updateNode('spring.kx', base(value, 'translationalStiffness'))} />
                  <NumberField label="ky" value={display(selectedNode.support.spring?.ky ?? 0, 'translationalStiffness')} unit={unitLabel(units, 'translationalStiffness')} onChange={(value) => updateNode('spring.ky', base(value, 'translationalStiffness'))} />
                  <NumberField label="kθ" value={display(selectedNode.support.spring?.kr ?? 0, 'rotationalStiffness')} unit={unitLabel(units, 'rotationalStiffness')} onChange={(value) => updateNode('spring.kr', base(value, 'rotationalStiffness'))} />
                  <NumberField label="k normal" value={display(selectedNode.support.spring?.kNormal ?? 0, 'translationalStiffness')} unit={unitLabel(units, 'translationalStiffness')} onChange={(value) => updateNode('spring.kNormal', base(value, 'translationalStiffness'))} />
                </section> : null}
                {analysis?.success && (!classroomMode || resultsVisible) ? (() => {
                  const result = analysis.nodeResults.find((item) => item.nodeId === selectedNode.id);
                  if (!result) return null;
                  return <section className="inspector-section result-summary"><h3>Resultados</h3><dl>{classroomMode ? null : <><div><dt>Ux</dt><dd>{formatDisplay(result.ux, units, 'length', 3)}</dd></div><div><dt>Uy</dt><dd>{formatDisplay(result.uy, units, 'length', 3)}</dd></div><div><dt>Rz</dt><dd>{result.rz.toExponential(3)} rad</dd></div></>}<div><dt>Rx</dt><dd>{formatDisplay(result.rx, units, 'force', 3)}</dd></div><div><dt>Ry</dt><dd>{formatDisplay(result.ry, units, 'force', 3)}</dd></div><div><dt>M</dt><dd>{formatDisplay(result.rm, units, 'moment', 3)}</dd></div></dl></section>;
                })() : null}
              </>
            ) : null}

            {selectedMember ? (() => {
              const ni = nodeMap.get(selectedMember.i)!; const nj = nodeMap.get(selectedMember.j)!;
              const L = Math.hypot(nj.x - ni.x, nj.y - ni.y); const angle = Math.atan2(nj.y - ni.y, nj.x - ni.x) * 180 / Math.PI;
              return <>
                <section className="inspector-section"><h3>{t('inspector.type')}</h3><label className="select-field"><span>{t('inspector.element')}</span><select value={selectedMember.type} onChange={(event) => updateMember('type', event.target.value)}><option value="frame">{t('inspector.frame')}</option><option value="truss">{t('inspector.truss')}</option><option value="rigid">{t('inspector.rigid')}</option></select></label></section>
                <section className="inspector-section"><h3>{t('inspector.geometry')}</h3><dl className="computed-list"><div><dt>{t('inspector.nodeI')}</dt><dd>{selectedMember.i}</dd></div><div><dt>{t('inspector.nodeJ')}</dt><dd>{selectedMember.j}</dd></div><div><dt>{t('inspector.length')}</dt><dd>{formatDisplay(L, units, 'length', 3)}</dd></div><div><dt>{t('inspector.angle')}</dt><dd>{angle.toFixed(2)}°</dd></div></dl></section>
                {selectedMember.type !== 'rigid' ? <>
                  {!classroomMode ? <section className="inspector-section"><h3>Material y sección</h3><NumberField label="E" value={display(selectedMember.E, 'elasticModulus')} unit={unitLabel(units, 'elasticModulus')} onChange={(value) => updateMember('E', base(value, 'elasticModulus'))} /><NumberField label="A" value={display(selectedMember.A, 'area')} unit={unitLabel(units, 'area')} onChange={(value) => updateMember('A', base(value, 'area'))} /><NumberField label="I" value={display(selectedMember.I, 'inertia')} unit={unitLabel(units, 'inertia')} onChange={(value) => updateMember('I', base(value, 'inertia'))} /><NumberField label="ρ" value={display(selectedMember.density ?? 0, 'density')} unit={unitLabel(units, 'density')} onChange={(value) => updateMember('density', base(value, 'density'))} />{selectedMember.type === 'frame' ? <><label className="select-field"><span>Teoría de viga</span><select value={selectedMember.beamTheory ?? 'euler-bernoulli'} onChange={(event) => updateMember('beamTheory', event.target.value)}><option value="euler-bernoulli">Euler–Bernoulli</option><option value="timoshenko">Timoshenko</option></select></label>{selectedMember.beamTheory === 'timoshenko' ? <><NumberField label="G" value={display(selectedMember.G ?? selectedMember.E / 2.6, 'elasticModulus')} unit={unitLabel(units, 'elasticModulus')} onChange={(value) => updateMember('G', base(value, 'elasticModulus'))} /><NumberField label="As efectiva" value={display(selectedMember.shearArea ?? selectedMember.A * 5 / 6, 'area')} unit={unitLabel(units, 'area')} onChange={(value) => updateMember('shearArea', base(value, 'area'))} /><div className="inspector-note"><CircleHelp size={17} /> Timoshenko incluye deformación por cortante. As debe incorporar el factor de corrección.</div></> : null}</> : null}</section> : <div className="inspector-note classroom-mode-note"><CircleHelp size={17} /> Modo Aula: E, A e I usan valores automáticos. Puedes concentrarte en geometría, apoyos, liberaciones y cargas.</div>}
                  {!classroomMode ? <section className="inspector-section">
                    <div className="section-heading"><h3>Temperatura y deformación inicial</h3><button className="mini-button" aria-label="Añadir efecto inicial" onClick={() => updateProject((draft) => {
                      draft.memberInitialEffects ??= [];
                      let index = 1; while (draft.memberInitialEffects.some((item) => item.id === `IE${index}`)) index += 1;
                      draft.memberInitialEffects.push({ id: `IE${index}`, memberId: selectedMember.id, caseId: draft.loadCases[0]?.id ?? 'LC1', type: 'temperature', alpha: 1.2e-5, deltaT: 0, gradient: 0 });
                      return draft;
                    })}><Plus size={15} /></button></div>
                    <div className="effect-list">{selectedMemberEffects.map((effect) => <div className="effect-card" key={effect.id}>
                      <label className="select-field"><span>Tipo</span><select value={effect.type} onChange={(event) => updateInitialEffect(effect.id, 'type', event.target.value)}><option value="temperature">Temperatura</option><option value="initial-strain">Deformación inicial</option></select></label>
                      <label className="select-field"><span>Caso</span><select value={effect.caseId} onChange={(event) => updateInitialEffect(effect.id, 'caseId', event.target.value)}>{project.loadCases.map((loadCase) => <option key={loadCase.id} value={loadCase.id}>{loadCase.name}</option>)}</select></label>
                      {effect.type === 'temperature' ? <><NumberField label="α" value={effect.alpha ?? 1.2e-5} unit="1/°C" onChange={(value) => updateInitialEffect(effect.id, 'alpha', Math.max(0, value))} /><NumberField label="ΔT uniforme" value={effect.deltaT ?? 0} unit="°C" onChange={(value) => updateInitialEffect(effect.id, 'deltaT', value)} />{selectedMember.type === 'frame' ? <NumberField label="Gradiente hacia +y local" value={effect.gradient ?? 0} unit="°C/m" onChange={(value) => updateInitialEffect(effect.id, 'gradient', value)} /> : null}</> : <><NumberField label="ε₀ axial" value={effect.axialStrain ?? 0} onChange={(value) => updateInitialEffect(effect.id, 'axialStrain', value)} />{selectedMember.type === 'frame' ? <NumberField label="κ₀" value={effect.curvature ?? 0} unit="1/m" onChange={(value) => updateInitialEffect(effect.id, 'curvature', value)} /> : null}</>}
                      <button className="icon-danger-button" aria-label={`Eliminar ${effect.id}`} onClick={() => updateProject((draft) => { draft.memberInitialEffects = (draft.memberInitialEffects ?? []).filter((candidate) => candidate.id !== effect.id); return draft; })}><Trash2 size={14} /> Eliminar</button>
                    </div>)}</div>
                    <div className="inspector-note"><CircleHelp size={17} /> ε₀ positivo alarga; κ₀ positivo incrementa dθ/dx. Un gradiente térmico positivo hacia +y produce κ₀ negativo.</div>
                  </section> : null}
                  {selectedMember.type === 'frame' ? <><section className="inspector-section"><h3>Liberaciones</h3><div className="checkbox-grid"><label><input type="checkbox" checked={selectedMember.releases?.iMoment ?? false} onChange={(event) => updateMember('iMoment', event.target.checked)} /> Momento i</label><label><input type="checkbox" checked={selectedMember.releases?.jMoment ?? false} onChange={(event) => updateMember('jMoment', event.target.checked)} /> Momento j</label></div>{!classroomMode ? <><h3 className="subsection-title">Conexiones semirrígidas</h3><label className="toggle-row"><span>Activar en i</span><input type="checkbox" checked={selectedMember.rotationalSpringI !== undefined} onChange={(event) => updateMember('useRotationalSpringI', event.target.checked)} /></label>{selectedMember.rotationalSpringI !== undefined ? <NumberField label="kθ extremo i" value={display(selectedMember.rotationalSpringI, 'rotationalStiffness')} unit={unitLabel(units, 'rotationalStiffness')} onChange={(value) => updateMember('rotationalSpringI', base(value, 'rotationalStiffness'))} /> : null}<label className="toggle-row"><span>Activar en j</span><input type="checkbox" checked={selectedMember.rotationalSpringJ !== undefined} onChange={(event) => updateMember('useRotationalSpringJ', event.target.checked)} /></label>{selectedMember.rotationalSpringJ !== undefined ? <NumberField label="kθ extremo j" value={display(selectedMember.rotationalSpringJ, 'rotationalStiffness')} unit={unitLabel(units, 'rotationalStiffness')} onChange={(value) => updateMember('rotationalSpringJ', base(value, 'rotationalStiffness'))} /> : null}<div className="inspector-note"><CircleHelp size={17} /> Sin resorte significa unión rígida; kθ = 0 equivale a articulación. La casilla de liberación prevalece.</div></> : null}</section>{!classroomMode ? <section className="inspector-section"><h3>Zonas rígidas</h3><NumberField label="Offset i" value={display(selectedMember.rigidOffsetI ?? 0, 'length')} unit={unitLabel(units, 'length')} onChange={(value) => updateMember('rigidOffsetI', base(value, 'length'))} /><NumberField label="Offset j" value={display(selectedMember.rigidOffsetJ ?? 0, 'length')} unit={unitLabel(units, 'length')} onChange={(value) => updateMember('rigidOffsetJ', base(value, 'length'))} /><div className="inspector-note"><CircleHelp size={17} /> Las cargas de miembro y los diagramas se definen sobre la longitud flexible entre caras.</div></section> : null}</> : null}
                </> : <div className="inspector-note"><CircleHelp size={17} /> El vínculo rígido usa compatibilidad cinemática exacta; no se asigna una rigidez artificial.</div>}
                {memberResult && (!classroomMode || resultsVisible) ? <section className="inspector-section result-summary"><h3>Extremos</h3><dl><div><dt>N máx.</dt><dd className="axial-text">{formatDisplay(memberResult.maxAxial, units, 'force', 3)}</dd></div><div><dt>V máx.</dt><dd className="shear-text">{formatDisplay(memberResult.maxShear, units, 'force', 3)}</dd></div><div><dt>M máx.</dt><dd className="moment-text">{formatDisplay(memberResult.maxMoment, units, 'moment', 3)}</dd></div></dl></section> : null}
              </>;
            })() : null}

            {selectedNodalLoad ? <>
              <section className="inspector-section"><h3>Carga nodal</h3><p className="load-editor-hint">Define la acción en el nodo seleccionado. Un valor negativo invierte la flecha.</p><label className="select-field"><span>Caso</span><select value={selectedNodalLoad.caseId} onChange={(event) => updateNodalLoad('caseId', event.target.value)}>{project.loadCases.map((loadCase) => <option key={loadCase.id} value={loadCase.id}>{loadCase.name}</option>)}</select></label><NumberField label="Horizontal Fx" value={display(selectedNodalLoad.fx, 'force')} unit={unitLabel(units, 'force')} onChange={(value) => updateNodalLoad('fx', base(value, 'force'))} /><NumberField label="Vertical Fy" value={display(selectedNodalLoad.fy, 'force')} unit={unitLabel(units, 'force')} onChange={(value) => updateNodalLoad('fy', base(value, 'force'))} /><NumberField label="Momento Mz" value={display(selectedNodalLoad.mz, 'moment')} unit={unitLabel(units, 'moment')} onChange={(value) => updateNodalLoad('mz', base(value, 'moment'))} /><button className="danger-button" onClick={() => deleteLoad('nodal', selectedNodalLoad.id)}><Trash2 size={15} /> Eliminar carga</button></section>
            </> : null}

            {selectedMemberLoad ? <>
              <section className="inspector-section"><h3>Carga de miembro</h3><p className="load-editor-hint">Global usa los ejes X/Y del lienzo; local usa los ejes del miembro.</p><label className="select-field"><span>Tipo</span><select value={selectedMemberLoad.type} onChange={(event) => updateMemberLoad('type', event.target.value)}><option value="distributed">Distribuida</option><option value="point">Puntual</option><option value="moment">Momento</option></select></label><label className="select-field"><span>Caso</span><select value={selectedMemberLoad.caseId} onChange={(event) => updateMemberLoad('caseId', event.target.value)}>{project.loadCases.map((loadCase) => <option key={loadCase.id} value={loadCase.id}>{loadCase.name}</option>)}</select></label><Segmented value={selectedMemberLoad.coordinateSystem} options={[{ value: 'global', label: 'Global' }, { value: 'local', label: 'Local' }]} onChange={(value) => updateMemberLoad('coordinateSystem', value)} /></section>
              {selectedMemberLoad.type === 'distributed' ? <section className="inspector-section"><h3>Distribución</h3><label className="select-field"><span>Base</span><select value={selectedMemberLoad.lengthBasis} onChange={(event) => updateMemberLoad('lengthBasis', event.target.value)}><option value="real">Longitud real</option><option value="horizontal">Proyección horizontal</option><option value="vertical">Proyección vertical</option></select></label><NumberField label="Desde (0–1)" value={selectedMemberLoad.start} unit="L" onChange={(value) => updateMemberLoad('start', Math.max(0, Math.min(1, value)))} /><NumberField label="Hasta (0–1)" value={selectedMemberLoad.end} unit="L" onChange={(value) => updateMemberLoad('end', Math.max(0, Math.min(1, value)))} /><NumberField label="qx al inicio" value={display(selectedMemberLoad.qxStart ?? 0, 'distributedForce')} unit={unitLabel(units, 'distributedForce')} onChange={(value) => updateMemberLoad('qxStart', base(value, 'distributedForce'))} /><NumberField label="qx al final" value={display(selectedMemberLoad.qxEnd ?? 0, 'distributedForce')} unit={unitLabel(units, 'distributedForce')} onChange={(value) => updateMemberLoad('qxEnd', base(value, 'distributedForce'))} /><NumberField label="qy al inicio" value={display(selectedMemberLoad.qyStart ?? 0, 'distributedForce')} unit={unitLabel(units, 'distributedForce')} onChange={(value) => updateMemberLoad('qyStart', base(value, 'distributedForce'))} /><NumberField label="qy al final" value={display(selectedMemberLoad.qyEnd ?? 0, 'distributedForce')} unit={unitLabel(units, 'distributedForce')} onChange={(value) => updateMemberLoad('qyEnd', base(value, 'distributedForce'))} /><div className="inspector-note"><AlertTriangle size={16} /> La base de longitud se convierte explícitamente antes del análisis.</div></section> : null}
              {selectedMemberLoad.type === 'point' ? <section className="inspector-section"><h3>Fuerza</h3><NumberField label="Posición (0–1)" value={selectedMemberLoad.position ?? 0.5} unit="L" onChange={(value) => updateMemberLoad('position', Math.max(0, Math.min(1, value)))} /><NumberField label="Fuerza X" value={display(selectedMemberLoad.px ?? 0, 'force')} unit={unitLabel(units, 'force')} onChange={(value) => updateMemberLoad('px', base(value, 'force'))} /><NumberField label="Fuerza Y" value={display(selectedMemberLoad.py ?? 0, 'force')} unit={unitLabel(units, 'force')} onChange={(value) => updateMemberLoad('py', base(value, 'force'))} /></section> : null}
              {selectedMemberLoad.type === 'moment' ? <section className="inspector-section"><h3>Momento</h3><NumberField label="Posición" value={selectedMemberLoad.position ?? 0.5} unit="L" onChange={(value) => updateMemberLoad('position', Math.max(0, Math.min(1, value)))} /><NumberField label="M" value={display(selectedMemberLoad.moment ?? 0, 'moment')} unit={unitLabel(units, 'moment')} onChange={(value) => updateMemberLoad('moment', base(value, 'moment'))} /></section> : null}
              <button className="danger-button" onClick={() => deleteLoad('member', selectedMemberLoad.id)}><Trash2 size={15} /> Eliminar carga</button>
            </> : null}
          </>
        ) : null}

        {tab === 'loads' ? <LoadsPanel activeTool={activeTool} onChooseTool={chooseLoadTool} selectedCombinationId={selectedCombinationId} setSelectedCombinationId={setSelectedCombinationId} /> : null}
        {tab === 'display' ? <DisplayPanel /> : null}
      </div>
    </aside>
  );
};

const LoadsPanel = ({ activeTool, onChooseTool, selectedCombinationId, setSelectedCombinationId }: {
  activeTool: Tool;
  onChooseTool: (tool: Extract<Tool, 'pointLoad' | 'distributedLoad' | 'moment'>) => void;
  selectedCombinationId: string;
  setSelectedCombinationId: (id: string) => void;
}) => {
  const { project, updateProject } = useProject();
  return <>
    <section className="inspector-section load-starter">
      <h3>Añadir una carga</h3>
      <p>Elige un tipo y después toca el nodo o miembro en el lienzo.</p>
      <div className="load-tool-grid">
        {loadToolOptions.map(({ tool, label, detail, icon: Icon }) => <button key={tool} aria-pressed={activeTool === tool} className={`tool-${tool}${activeTool === tool ? ' active' : ''}`} onClick={() => onChooseTool(tool)}><Icon size={18} /><strong>{label}</strong><small>{detail}</small></button>)}
      </div>
    </section>
    <section className="inspector-section"><div className="section-heading"><h3>Casos de carga</h3><button className="mini-button" aria-label="Añadir caso de carga" onClick={() => updateProject((draft) => { let index = 1; while (draft.loadCases.some((item) => item.id === `LC${index}`)) index += 1; const id = `LC${index}`; draft.loadCases.push({ id, name: `Caso ${index}`, category: 'other', active: true }); return draft; })}><Plus size={15} /></button></div>
      <div className="load-case-list">{project.loadCases.map((loadCase) => <div className="load-case-row" key={loadCase.id}><input aria-label={`Activar ${loadCase.name}`} type="checkbox" checked={loadCase.active} onChange={(event) => updateProject((draft) => { const item = draft.loadCases.find((candidate) => candidate.id === loadCase.id); if (item) item.active = event.target.checked; return draft; })} /><div><input aria-label={`Nombre del caso ${loadCase.id}`} value={loadCase.name} onChange={(event) => updateProject((draft) => { const item = draft.loadCases.find((candidate) => candidate.id === loadCase.id); if (item) item.name = event.target.value; return draft; })} /><small>{loadCase.category}</small></div><ChevronRight size={15} aria-hidden="true" /></div>)}</div>
    </section>
    <section className="inspector-section"><div className="section-heading"><h3>Combinaciones</h3><button className="mini-button" aria-label="Añadir combinación" onClick={() => updateProject((draft) => { let index = 1; while (draft.combinations.some((item) => item.id === `COMB${index}`)) index += 1; const id = `COMB${index}`; draft.combinations.push({ id, name: `Combinación ${index}`, factors: Object.fromEntries(draft.loadCases.map((item) => [item.id, 1])) }); return draft; })}><Plus size={15} /></button></div>
      <label className="select-field"><span>Analizar</span><select value={selectedCombinationId} onChange={(event) => setSelectedCombinationId(event.target.value)}><option value="">Casos activos</option>{project.combinations.map((combination) => <option key={combination.id} value={combination.id}>{combination.name}</option>)}</select></label>
      {project.combinations.map((combination) => <details className="combination-card" key={combination.id} open={combination.id === selectedCombinationId}><summary>{combination.name}</summary>{project.loadCases.map((loadCase) => <NumberField key={loadCase.id} label={loadCase.name} value={combination.factors[loadCase.id] ?? 0} onChange={(value) => updateProject((draft) => { const item = draft.combinations.find((candidate) => candidate.id === combination.id); if (item) item.factors[loadCase.id] = value; return draft; })} />)}{combination.source ? <div className="norm-source"><strong>{combination.jurisdiction} · {combination.edition}</strong><span>{combination.source}</span><small>Plantilla editable. No sustituye una revisión profesional.</small></div> : null}</details>)}
    </section>
    <div className="inspector-note"><CircleHelp size={17} /> structureCo combina los efectos completos N(x), V(x) y M(x), no únicamente sus máximos.</div>
  </>;
};

const DisplayPanel = () => {
  const { project, updateProjectView } = useProject();
  const units = project.settings.units;
  const display = (value: number, quantity: UnitQuantity) => toDisplay(value, units, quantity);
  const base = (value: number, quantity: UnitQuantity) => fromDisplay(value, units, quantity);
  const setSetting = (key: keyof typeof project.settings, value: unknown) => updateProjectView((draft) => ({ ...draft, settings: { ...draft.settings, [key]: value } }));
  return <>
    <section className="inspector-section calculation-mode-section"><h3>Experiencia de cálculo</h3><Segmented value={project.settings.calculationMode ?? 'complete'} options={[{ value: 'classroom', label: 'Aula · diagramas' }, { value: 'complete', label: 'Completo' }]} onChange={(value) => setSetting('calculationMode', value)} />{project.settings.calculationMode === 'classroom' ? <div className="classroom-mode-card"><strong>Solo lo esencial</strong><span>Dibuja nodos, miembros, apoyos y cargas. La app asigna propiedades internas y muestra reacciones y N–V–M.</span><small>En estructuras hiperestáticas, el reparto sí depende de esas rigideces asumidas y se indicará como advertencia.</small></div> : <div className="inspector-note"><CircleHelp size={17} /> El modo completo habilita materiales, Timoshenko, asentamientos, temperatura y deformaciones iniciales.</div>}</section>
    <section className="inspector-section"><h3>Lienzo</h3><label className="toggle-row"><span>Cuadrícula</span><input type="checkbox" checked={project.settings.showGrid} onChange={(event) => setSetting('showGrid', event.target.checked)} /></label><label className="toggle-row"><span>Ajuste automático</span><input type="checkbox" checked={project.settings.snap} onChange={(event) => setSetting('snap', event.target.checked)} /></label><NumberField label="Separación" value={display(project.settings.gridSize, 'length')} unit={unitLabel(units, 'length')} onChange={(value) => setSetting('gridSize', Math.max(1e-6, base(value, 'length')))} /><label className="toggle-row"><span>Etiquetas de nodos</span><input type="checkbox" checked={project.settings.showNodeLabels} onChange={(event) => setSetting('showNodeLabels', event.target.checked)} /></label><label className="toggle-row"><span>Etiquetas de miembros</span><input type="checkbox" checked={project.settings.showMemberLabels} onChange={(event) => setSetting('showMemberLabels', event.target.checked)} /></label><label className="toggle-row"><span>Ejes locales</span><input type="checkbox" checked={project.settings.showLocalAxes} onChange={(event) => setSetting('showLocalAxes', event.target.checked)} /></label><label className="toggle-row"><span>Cotas</span><input type="checkbox" checked={project.settings.showDimensions} onChange={(event) => setSetting('showDimensions', event.target.checked)} /></label><label className="toggle-row"><span>Cargas</span><input type="checkbox" checked={project.settings.showLoads} onChange={(event) => setSetting('showLoads', event.target.checked)} /></label><label className="toggle-row"><span>Valores críticos</span><input type="checkbox" checked={project.settings.showResultValues} onChange={(event) => setSetting('showResultValues', event.target.checked)} /></label></section>
    <section className="inspector-section">
      <h3>Precisión CAD</h3>
      <p className="section-description">Elige qué referencias atraen el cursor y qué objetos admite la selección.</p>
      <div className="compact-toggle-grid">
        <label><input type="checkbox" checked={project.settings.snapTargets?.grid ?? true} onChange={(event) => setSetting('snapTargets', { ...project.settings.snapTargets, grid: event.target.checked })} /><span>Cuadrícula</span></label>
        <label><input type="checkbox" checked={project.settings.snapTargets?.nodes ?? true} onChange={(event) => setSetting('snapTargets', { ...project.settings.snapTargets, nodes: event.target.checked })} /><span>Nodos</span></label>
        <label><input type="checkbox" checked={project.settings.snapTargets?.midpoints ?? true} onChange={(event) => setSetting('snapTargets', { ...project.settings.snapTargets, midpoints: event.target.checked })} /><span>Puntos medios</span></label>
        <label><input type="checkbox" checked={project.settings.snapTargets?.intersections ?? true} onChange={(event) => setSetting('snapTargets', { ...project.settings.snapTargets, intersections: event.target.checked })} /><span>Intersecciones</span></label>
        <label><input type="checkbox" checked={project.settings.snapTargets?.perpendicular ?? true} onChange={(event) => setSetting('snapTargets', { ...project.settings.snapTargets, perpendicular: event.target.checked })} /><span>Perpendicular</span></label>
      </div>
      <small className="field-help">Selección: arrastra → para ventana completa o ← para cruce.</small>
      <div className="filter-chip-row" role="group" aria-label="Filtros de selección"><button aria-pressed={project.settings.selectionFilter?.nodes ?? true} onClick={() => setSetting('selectionFilter', { ...(project.settings.selectionFilter ?? { nodes: true, members: true, loads: true }), nodes: !(project.settings.selectionFilter?.nodes ?? true) })}>Nodos</button><button aria-pressed={project.settings.selectionFilter?.members ?? true} onClick={() => setSetting('selectionFilter', { ...(project.settings.selectionFilter ?? { nodes: true, members: true, loads: true }), members: !(project.settings.selectionFilter?.members ?? true) })}>Miembros</button><button aria-pressed={project.settings.selectionFilter?.loads ?? true} onClick={() => setSetting('selectionFilter', { ...(project.settings.selectionFilter ?? { nodes: true, members: true, loads: true }), loads: !(project.settings.selectionFilter?.loads ?? true) })}>Cargas</button></div>
    </section>
    <section className="inspector-section"><h3>Resultados</h3><label className="toggle-row"><span>Superponer en el modelo</span><input type="checkbox" checked={project.settings.showResultOverlay ?? true} onChange={(event) => setSetting('showResultOverlay', event.target.checked)} /></label><Segmented value={project.settings.diagramScaleMode ?? 'common'} options={[{ value: 'common', label: 'Escala común' }, { value: 'individual', label: 'Por miembro' }]} onChange={(value) => setSetting('diagramScaleMode', value)} /><NumberField label="Factor visual" value={project.settings.diagramScale} onChange={(value) => setSetting('diagramScale', Math.max(0.1, value))} /><NumberField label="Escala deformada" value={project.settings.deformedScale} onChange={(value) => setSetting('deformedScale', Math.max(1, value))} /><Segmented value={project.settings.diagramSide} options={[{ value: 'positive', label: 'Lado +y local' }, { value: 'negative', label: 'Lado −y local' }]} onChange={(value) => setSetting('diagramSide', value)} /></section>
    <section className="inspector-section"><h3>Colores semánticos</h3><div className="legend-list"><span><i className="legend-dot axial" /> Fuerza axial</span><span><i className="legend-dot shear" /> Fuerza cortante</span><span><i className="legend-dot moment" /> Momento flector</span><span><i className="legend-dot force" /> Cargas</span><span><i className="legend-dot dimension" /> Cotas</span><span><i className="legend-dot axis" /> Ejes y cortes</span></div></section>
  </>;
};
