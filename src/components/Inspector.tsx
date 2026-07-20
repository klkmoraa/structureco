import { useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import { ChevronRight, CircleHelp, MoveDown, Plus, RotateCcw, Sigma, X } from 'lucide-react';
import { fromDisplay, toDisplay, unitLabel, type UnitQuantity } from '../engine/units';
import { useI18n } from '../i18n/useI18n';
import { useProject } from '../store/ProjectContext';
import type { Tool } from '../types';
import { InspectorNumericField } from './inspector/InspectorNumericField';
import { InspectorProperties } from './inspector/InspectorProperties';

const NumberField = ({
  label,
  value,
  unit,
  step = 'any',
  resetKey = label,
  hint,
  onChange,
}: {
  label: string;
  value: number;
  unit?: string;
  step?: string;
  resetKey?: string;
  hint?: string;
  onChange: (value: number) => void;
}) => (
  <InspectorNumericField
    label={label}
    value={value}
    unit={unit}
    step={step}
    resetKey={resetKey}
    hint={hint}
    onCommit={onChange}
  />
);

const Segmented = ({ value, options, onChange }: { value: string; options: Array<{ value: string; label: string }>; onChange: (value: string) => void }) => (
  <div className="segmented-control" role="group">
    {options.map((option) => <button type="button" key={option.value} aria-pressed={value === option.value} className={value === option.value ? 'active' : ''} onClick={() => onChange(option.value)}>{option.label}</button>)}
  </div>
);

const loadToolOptions: Array<{ tool: Extract<Tool, 'pointLoad' | 'distributedLoad' | 'moment'>; label: string; detail: string; icon: typeof MoveDown }> = [
  { tool: 'pointLoad', label: 'Puntual', detail: 'En nodo o miembro', icon: MoveDown },
  { tool: 'distributedLoad', label: 'Distribuida', detail: 'Sobre un miembro', icon: Sigma },
  { tool: 'moment', label: 'Momento', detail: 'En nodo o miembro', icon: RotateCcw },
];

const focusableSelector = [
  'button:not([disabled]):not([tabindex="-1"])',
  'input:not([disabled]):not([tabindex="-1"])',
  'select:not([disabled]):not([tabindex="-1"])',
  'textarea:not([disabled]):not([tabindex="-1"])',
  'a[href]:not([tabindex="-1"])',
  'summary',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

const getFocusableElements = (panel: HTMLElement | null) => [
  ...(panel?.querySelectorAll<HTMLElement>(focusableSelector) ?? []),
].filter((element) => {
  if (element.closest('[hidden], [aria-hidden="true"], [inert]')) return false;
  const closedDetails = element.closest('details:not([open])');
  return !closedDetails || element.tagName === 'SUMMARY';
});

export const Inspector = ({ className = '', modal = false, onClose }: { className?: string; modal?: boolean; onClose?: () => void }) => {
  const { selection, activeTool, setActiveTool, selectedCombinationId, setSelectedCombinationId } = useProject();
  const { t } = useI18n();
  const [tab, setTab] = useState<'inspector' | 'loads' | 'display'>('inspector');
  const panelRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (selection) setTab('inspector');
  }, [selection]);

  useEffect(() => {
    if (!modal) return undefined;
    const panel = panelRef.current;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const focusFrame = window.requestAnimationFrame(() => getFocusableElements(panel)[0]?.focus());
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose?.();
        return;
      }
      if (event.key !== 'Tab') return;
      const focusable = getFocusableElements(panel);
      if (focusable.length === 0) {
        event.preventDefault();
        panel?.focus();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && (document.activeElement === first || !panel?.contains(document.activeElement))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (document.activeElement === last || !panel?.contains(document.activeElement))) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [modal, onClose]);

  const chooseLoadTool = (tool: Extract<Tool, 'pointLoad' | 'distributedLoad' | 'moment'>) => {
    setActiveTool(tool);
    onClose?.();
  };

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
    <aside
      ref={panelRef}
      id="workspace-inspector"
      className={`inspector-panel ${className}`.trim()}
      role={modal ? 'dialog' : 'complementary'}
      aria-modal={modal || undefined}
      aria-label={t('inspector.tab')}
      tabIndex={modal ? -1 : undefined}
    >
      <div className="inspector-tabs" role="tablist" aria-label={t('inspector.tab')}>
        <button id="inspector-tab-inspector" type="button" role="tab" aria-controls="inspector-tabpanel" aria-selected={tab === 'inspector'} tabIndex={tab === 'inspector' ? 0 : -1} className={tab === 'inspector' ? 'active' : ''} onClick={() => setTab('inspector')} onKeyDown={(event) => onTabKeyDown(event, 0)}>{t('inspector.tab')}</button>
        <button id="inspector-tab-loads" type="button" role="tab" aria-controls="inspector-tabpanel" aria-selected={tab === 'loads'} tabIndex={tab === 'loads' ? 0 : -1} className={tab === 'loads' ? 'active' : ''} onClick={() => setTab('loads')} onKeyDown={(event) => onTabKeyDown(event, 1)}>{t('inspector.loadsTab')}</button>
        <button id="inspector-tab-display" type="button" role="tab" aria-controls="inspector-tabpanel" aria-selected={tab === 'display'} tabIndex={tab === 'display' ? 0 : -1} className={tab === 'display' ? 'active' : ''} onClick={() => setTab('display')} onKeyDown={(event) => onTabKeyDown(event, 2)}>{t('inspector.viewTab')}</button>
        <button type="button" className="mobile-inspector-close" aria-label={t('inspector.close')} onClick={onClose}><X size={18} /></button>
      </div>

      <div id="inspector-tabpanel" className="inspector-scroll" role="tabpanel" aria-labelledby={`inspector-tab-${tab}`}>
        {tab === 'inspector' ? <InspectorProperties /> : null}
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
        {loadToolOptions.map(({ tool, label, detail, icon: Icon }) => <button type="button" key={tool} aria-pressed={activeTool === tool} className={`tool-${tool}${activeTool === tool ? ' active' : ''}`} onClick={() => onChooseTool(tool)}><Icon size={18} /><strong>{label}</strong><small>{detail}</small></button>)}
      </div>
    </section>
    <section className="inspector-section">
      <div className="section-heading"><h3>Casos de carga</h3><button type="button" className="mini-button" aria-label="Añadir caso de carga" onClick={() => updateProject((draft) => {
        let index = 1;
        while (draft.loadCases.some((item) => item.id === `LC${index}`)) index += 1;
        const id = `LC${index}`;
        draft.loadCases.push({ id, name: `Caso ${index}`, category: 'other', active: true });
        return draft;
      })}><Plus size={15} /></button></div>
      <div className="load-case-list">{project.loadCases.map((loadCase) => <div className="load-case-row" key={loadCase.id}>
        <input aria-label={`Activar ${loadCase.name}`} type="checkbox" checked={loadCase.active} onChange={(event) => updateProject((draft) => {
          const item = draft.loadCases.find((candidate) => candidate.id === loadCase.id);
          if (item) item.active = event.target.checked;
          return draft;
        })} />
        <div><input aria-label={`Nombre del caso ${loadCase.id}`} value={loadCase.name} onChange={(event) => updateProject((draft) => {
          const item = draft.loadCases.find((candidate) => candidate.id === loadCase.id);
          if (item) item.name = event.target.value;
          return draft;
        })} /><small>{loadCase.category}</small></div>
        <ChevronRight size={15} aria-hidden="true" />
      </div>)}</div>
    </section>
    <section className="inspector-section">
      <div className="section-heading"><h3>Combinaciones</h3><button type="button" className="mini-button" aria-label="Añadir combinación" onClick={() => updateProject((draft) => {
        let index = 1;
        while (draft.combinations.some((item) => item.id === `COMB${index}`)) index += 1;
        const id = `COMB${index}`;
        draft.combinations.push({ id, name: `Combinación ${index}`, factors: Object.fromEntries(draft.loadCases.map((item) => [item.id, 1])) });
        return draft;
      })}><Plus size={15} /></button></div>
      <label className="select-field"><span>Analizar</span><select value={selectedCombinationId} onChange={(event) => setSelectedCombinationId(event.target.value)}><option value="">Casos activos</option>{project.combinations.map((combination) => <option key={combination.id} value={combination.id}>{combination.name}</option>)}</select></label>
      {project.combinations.map((combination) => <details className="combination-card" key={combination.id} open={combination.id === selectedCombinationId}>
        <summary>{combination.name}</summary>
        {project.loadCases.map((loadCase) => <NumberField key={loadCase.id} resetKey={`${combination.id}:${loadCase.id}`} label={loadCase.name} value={combination.factors[loadCase.id] ?? 0} onChange={(value) => updateProject((draft) => {
          const item = draft.combinations.find((candidate) => candidate.id === combination.id);
          if (item) item.factors[loadCase.id] = value;
          return draft;
        })} />)}
        {combination.source ? <div className="norm-source"><strong>{combination.jurisdiction} · {combination.edition}</strong><span>{combination.source}</span><small>Plantilla editable. No sustituye una revisión profesional.</small></div> : null}
      </details>)}
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
    <section className="inspector-section calculation-mode-section">
      <h3>Experiencia de cálculo</h3>
      <Segmented value={project.settings.calculationMode ?? 'complete'} options={[{ value: 'classroom', label: 'Aula · diagramas' }, { value: 'complete', label: 'Completo' }]} onChange={(value) => setSetting('calculationMode', value)} />
      {project.settings.calculationMode === 'classroom'
        ? <div className="classroom-mode-card"><strong>Solo lo esencial</strong><span>Dibuja nodos, miembros, apoyos y cargas. La app asigna propiedades internas y muestra reacciones y N–V–M.</span><small>En estructuras hiperestáticas, el reparto sí depende de esas rigideces asumidas y se indicará como advertencia.</small></div>
        : <div className="inspector-note"><CircleHelp size={17} /> El modo completo habilita materiales, Timoshenko, asentamientos, temperatura y deformaciones iniciales.</div>}
    </section>
    <section className="inspector-section">
      <h3>Lienzo</h3>
      <label className="toggle-row"><span>Cuadrícula</span><input type="checkbox" checked={project.settings.showGrid} onChange={(event) => setSetting('showGrid', event.target.checked)} /></label>
      <label className="toggle-row"><span>Ajuste automático</span><input type="checkbox" checked={project.settings.snap} onChange={(event) => setSetting('snap', event.target.checked)} /></label>
      <NumberField label="Separación" value={display(project.settings.gridSize, 'length')} unit={unitLabel(units, 'length')} resetKey={`grid-size:${units}`} onChange={(value) => setSetting('gridSize', Math.max(1e-6, base(value, 'length')))} />
      <label className="toggle-row"><span>Etiquetas de nodos</span><input type="checkbox" checked={project.settings.showNodeLabels} onChange={(event) => setSetting('showNodeLabels', event.target.checked)} /></label>
      <label className="toggle-row"><span>Etiquetas de miembros</span><input type="checkbox" checked={project.settings.showMemberLabels} onChange={(event) => setSetting('showMemberLabels', event.target.checked)} /></label>
      <label className="toggle-row"><span>Ejes locales</span><input type="checkbox" checked={project.settings.showLocalAxes} onChange={(event) => setSetting('showLocalAxes', event.target.checked)} /></label>
      <label className="toggle-row"><span>Cotas</span><input type="checkbox" checked={project.settings.showDimensions} onChange={(event) => setSetting('showDimensions', event.target.checked)} /></label>
      <label className="toggle-row"><span>Cargas</span><input type="checkbox" checked={project.settings.showLoads} onChange={(event) => setSetting('showLoads', event.target.checked)} /></label>
      <label className="toggle-row"><span>Valores críticos</span><input type="checkbox" checked={project.settings.showResultValues} onChange={(event) => setSetting('showResultValues', event.target.checked)} /></label>
    </section>
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
      <div className="filter-chip-row" role="group" aria-label="Filtros de selección">
        <button type="button" aria-pressed={project.settings.selectionFilter?.nodes ?? true} onClick={() => setSetting('selectionFilter', { ...(project.settings.selectionFilter ?? { nodes: true, members: true, loads: true }), nodes: !(project.settings.selectionFilter?.nodes ?? true) })}>Nodos</button>
        <button type="button" aria-pressed={project.settings.selectionFilter?.members ?? true} onClick={() => setSetting('selectionFilter', { ...(project.settings.selectionFilter ?? { nodes: true, members: true, loads: true }), members: !(project.settings.selectionFilter?.members ?? true) })}>Miembros</button>
        <button type="button" aria-pressed={project.settings.selectionFilter?.loads ?? true} onClick={() => setSetting('selectionFilter', { ...(project.settings.selectionFilter ?? { nodes: true, members: true, loads: true }), loads: !(project.settings.selectionFilter?.loads ?? true) })}>Cargas</button>
      </div>
    </section>
    <section className="inspector-section">
      <h3>Resultados</h3>
      <label className="toggle-row"><span>Superponer en el modelo</span><input type="checkbox" checked={project.settings.showResultOverlay ?? true} onChange={(event) => setSetting('showResultOverlay', event.target.checked)} /></label>
      <Segmented value={project.settings.diagramScaleMode ?? 'common'} options={[{ value: 'common', label: 'Escala común' }, { value: 'individual', label: 'Por miembro' }]} onChange={(value) => setSetting('diagramScaleMode', value)} />
      <NumberField label="Factor visual" value={project.settings.diagramScale} resetKey="diagram-scale" onChange={(value) => setSetting('diagramScale', Math.max(0.1, value))} />
      <NumberField label="Escala deformada" value={project.settings.deformedScale} resetKey="deformed-scale" onChange={(value) => setSetting('deformedScale', Math.max(1, value))} />
      <Segmented value={project.settings.diagramSide} options={[{ value: 'positive', label: 'Lado +y local' }, { value: 'negative', label: 'Lado −y local' }]} onChange={(value) => setSetting('diagramSide', value)} />
    </section>
    <section className="inspector-section"><h3>Colores semánticos</h3><div className="legend-list"><span><i className="legend-dot axial" /> Fuerza axial</span><span><i className="legend-dot shear" /> Fuerza cortante</span><span><i className="legend-dot moment" /> Momento flector</span><span><i className="legend-dot force" /> Cargas</span><span><i className="legend-dot dimension" /> Cotas</span><span><i className="legend-dot axis" /> Ejes y cortes</span></div></section>
  </>;
};
