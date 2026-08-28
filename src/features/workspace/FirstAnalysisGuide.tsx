import { Check, ChevronRight, Eye, Layers3, Sparkles, X } from 'lucide-react';
import { deriveClassroomProgress } from '../../education/classroomProgress';
import type { AnalysisResult, ProjectModel, Tool } from '../../types';

type Language = 'es' | 'en';

export interface FirstAnalysisGuideProps {
  project: ProjectModel;
  analysis: AnalysisResult | null;
  onOpenTemplates: () => void;
  onOpenGenerator: () => void;
  onChooseTool: (tool: Tool) => void;
  onOpenDoctor: () => void;
  onAnalyze: () => void;
  onDismiss: () => void;
}

const copy = {
  es: {
    eyebrow: 'Primer análisis', title: 'Llega a un resultado verificable', close: 'Ocultar guía del primer análisis',
    choose: '1. Elige cómo empezar', chooseBody: 'Puedes empezar con una estructura preparada, generar una tipología o dibujarla manualmente. Ninguna ruta bloquea las demás.',
    template: 'Usar una plantilla', generator: 'Abrir generador guiado', manual: 'Dibujar desde cero',
    summary: 'Resumen antes de analizar', geometry: 'Geometría', supports: 'Apoyos', loads: 'Cargas', units: 'Unidades',
    review: 'Revisar con Model Doctor', analyze: 'Analizar modelo', next: 'Siguiente acción',
    complete: 'Listo para analizar', expert: 'Puedes ocultar esta guía y volver a abrirla desde Buscar comandos.',
    step: { geometry: 'Geometría', supports: 'Apoyos', loads: 'Cargas', analysis: 'Analizar' },
    action: { node: 'Crear nodos', member: 'Conectar miembros', support: 'Agregar apoyo', pointLoad: 'Aplicar carga', analyze: 'Analizar estructura', analyzeAgain: 'Analizar de nuevo' },
  },
  en: {
    eyebrow: 'First analysis', title: 'Reach a verifiable result', close: 'Hide first-analysis guide',
    choose: '1. Choose how to start', chooseBody: 'Start with a prepared structure, generate a typology, or draw it manually. None of these routes blocks the others.',
    template: 'Use a template', generator: 'Open guided generator', manual: 'Draw from scratch',
    summary: 'Summary before analysis', geometry: 'Geometry', supports: 'Supports', loads: 'Loads', units: 'Units',
    review: 'Review with Model Doctor', analyze: 'Analyze model', next: 'Next action',
    complete: 'Ready to analyze', expert: 'You can hide this guide and reopen it from Search commands.',
    step: { geometry: 'Geometry', supports: 'Supports', loads: 'Loads', analysis: 'Analyze' },
    action: { node: 'Create nodes', member: 'Connect members', support: 'Add support', pointLoad: 'Apply load', analyze: 'Analyze structure', analyzeAgain: 'Analyze again' },
  },
} as const;

/** A non-blocking four-step companion for a blank project. It only chooses UI tools. */
export const FirstAnalysisGuide = ({ project, analysis, onOpenTemplates, onOpenGenerator, onChooseTool, onOpenDoctor, onAnalyze, onDismiss }: FirstAnalysisGuideProps) => {
  const language: Language = project.settings.language === 'en' ? 'en' : 'es';
  const text = copy[language];
  const progress = deriveClassroomProgress(project, analysis);
  const isBlank = project.nodes.length === 0 && project.members.length === 0;
  const current = progress.currentStep;
  const summary = [
    { label: text.geometry, value: `${progress.geometry.nodeCount} · ${progress.geometry.memberCount}` },
    { label: text.supports, value: String(progress.supports.restraintCount) },
    { label: text.loads, value: String(progress.loads.activeActionCount) },
    { label: text.units, value: project.settings.units },
  ];
  const runCurrentAction = () => {
    if (current.action.kind === 'tool') onChooseTool(current.action.tool);
    else onAnalyze();
  };
  const currentActionLabel = current.action.kind === 'tool'
    ? text.action[current.action.tool as keyof typeof text.action] ?? current.action.label
    : analysis ? text.action.analyzeAgain : text.action.analyze;

  return <aside className="first-analysis-guide" aria-labelledby="first-analysis-guide-title" data-first-analysis-step={isBlank ? 'start' : current.id}>
    <header>
      <div><span>{text.eyebrow}</span><h2 id="first-analysis-guide-title">{text.title}</h2></div>
      <button type="button" aria-label={text.close} onClick={onDismiss}><X size={17} /></button>
    </header>
    {isBlank ? <section className="first-analysis-guide__start" aria-labelledby="first-analysis-start-title">
      <h3 id="first-analysis-start-title">{text.choose}</h3>
      <p>{text.chooseBody}</p>
      <div className="first-analysis-guide__choices">
        <button type="button" onClick={onOpenTemplates}><Layers3 size={17} />{text.template}</button>
        <button type="button" onClick={onOpenGenerator}><Sparkles size={17} />{text.generator}</button>
        <button type="button" onClick={() => onChooseTool('node')}><ChevronRight size={17} />{text.manual}</button>
      </div>
    </section> : <section className="first-analysis-guide__journey" aria-labelledby="first-analysis-summary-title">
      <h3 id="first-analysis-summary-title">{text.summary}</h3>
      <dl>{summary.map(({ label, value }) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
      <ol aria-label={text.next}>{progress.steps.map((step, index) => <li key={step.id} data-state={step.state}><span aria-hidden="true">{step.complete ? <Check size={14} /> : index + 1}</span><strong>{text.step[step.id]}</strong></li>)}</ol>
      {progress.readyToAnalyze ? <div className="first-analysis-guide__actions"><button type="button" onClick={onOpenDoctor}><Eye size={16} />{text.review}</button><button type="button" onClick={onAnalyze}><ChevronRight size={16} />{text.analyze}</button></div> : <button className="first-analysis-guide__next" type="button" onClick={runCurrentAction}>{text.next}: {currentActionLabel}<ChevronRight size={16} /></button>}
    </section>}
    <p className="first-analysis-guide__note">{progress.readyToAnalyze ? text.complete : text.expert}</p>
  </aside>;
};
