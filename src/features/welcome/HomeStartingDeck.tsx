import { ArrowRight } from 'lucide-react';
import { ThreeStructuralImage } from '../structural-assets';
import type { ThreeStructuralAssetId } from '../structural-assets/threeStructuralRender';
import './homeStartingDeck.css';

type HomeStartingDeckStep = 'start' | 'supports' | 'loads' | 'analyze';

const copy = {
  es: {
    title: 'Empieza con una estructura', body: 'Tres modelos reales para pasar de la idea al editor.', browse: 'Ver todas las plantillas', kicker: 'Siguiente movimiento', units: 'Unidades', activeCase: 'Caso activo', modelStatus: 'Lectura de modelo',
    steps: {
      start: { title: 'Abre una plantilla', body: 'Parte de una geometría preparada y conserva el control del modelo.', action: 'Ver plantillas' },
      supports: { title: 'Añade apoyos', body: 'La geometría ya existe; ahora define cómo se sostiene.', action: 'Abrir editor' },
      loads: { title: 'Añade una carga', body: 'El modelo está apoyado. Añade una acción antes de analizar.', action: 'Abrir editor' },
      analyze: { title: 'Analiza el modelo', body: 'Ya hay geometría, apoyos y cargas para revisar el comportamiento.', action: 'Abrir editor' },
    },
  },
  en: {
    title: 'Start with a structure', body: 'Three real models to move from an idea to the editor.', browse: 'View all templates', kicker: 'Next move', units: 'Units', activeCase: 'Active case', modelStatus: 'Model reading',
    steps: {
      start: { title: 'Open a template', body: 'Start from prepared geometry while keeping control of the model.', action: 'View templates' },
      supports: { title: 'Add supports', body: 'The geometry exists; now define how it is restrained.', action: 'Open editor' },
      loads: { title: 'Add a load', body: 'The model is supported. Add an action before analyzing.', action: 'Open editor' },
      analyze: { title: 'Analyze the model', body: 'Geometry, supports, and loads are ready for a review.', action: 'Open editor' },
    },
  },
} as const;

export interface HomeStartingDeckItem {
  id: string;
  name: string;
  description: string;
  assetId: ThreeStructuralAssetId;
  theme: 'light' | 'dark';
  onOpen: () => void;
}

export interface HomeStartingDeckNextStep {
  kind: HomeStartingDeckStep;
  onAction: () => void;
}

interface HomeStartingDeckProps {
  language: 'es' | 'en';
  onBrowse: () => void;
  items: readonly HomeStartingDeckItem[];
  nextStep: HomeStartingDeckNextStep;
  facts: { units: string; activeCases: number; modelSize: number };
}

export const HomeStartingDeck = ({
  language,
  onBrowse,
  items,
  nextStep,
  facts,
}: HomeStartingDeckProps) => {
  const text = copy[language];
  const step = text.steps[nextStep.kind];
  return <>
  <section className="sc-home-start-rail" aria-labelledby="home-start-title" data-testid="home-start-rail">
    <header className="sc-home-section-heading"><div><h2 id="home-start-title">{text.title}</h2><p>{text.body}</p></div><button type="button" onClick={onBrowse}>{text.browse}<ArrowRight size={15} aria-hidden="true" /></button></header>
    <div className="sc-home-start-rail__items">
      {items.map((item) => <button key={item.id} type="button" aria-label={item.name} data-start-id={item.id} onClick={item.onOpen}>
        <span className="sc-home-start-rail__media"><ThreeStructuralImage assetId={item.assetId} theme={item.theme} /></span>
        <span className="sc-home-start-rail__copy"><strong>{item.name}</strong><small>{item.description}</small></span>
        <ArrowRight size={16} aria-hidden="true" />
      </button>)}
    </div>
  </section>
  <section className="sc-home-next-step" aria-labelledby="home-next-step-title" data-testid="home-next-step">
    <div className="sc-home-next-step__copy"><p>{text.kicker}</p><h2 id="home-next-step-title">{step.title}</h2><span>{step.body}</span></div>
    <div className="sc-home-next-step__facts" aria-label={text.modelStatus}><span><small>{text.units}</small><strong>{facts.units}</strong></span><span><small>{text.activeCase}</small><strong>{facts.activeCases}</strong></span><span><small>{text.modelStatus}</small><strong>{facts.modelSize}</strong></span></div>
    <button type="button" className="sc-home-next-step__action" onClick={nextStep.onAction}>{step.action}<ArrowRight size={16} aria-hidden="true" /></button>
  </section>
</>;
};
