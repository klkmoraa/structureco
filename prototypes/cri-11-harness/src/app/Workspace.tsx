/**
 * Workspace · un solo árbol de slots, tres composiciones.
 *
 * Ésta es la parte que hace ganar a la Alternativa D de CRI-9: NO hay un
 * `ExpandedComposer`, un `MediumComposer` y un `CompactComposer`. Hay un árbol,
 * y la presentación de cada superficie es un DATO que llega del resolutor. Por
 * eso cruzar la frontera no desmonta nada: la selección, el borrador, el
 * desplazamiento y el foco sobreviven porque el componente no se remonta.
 *
 * Lo que cambia entre clases:
 *   X2 · rail 164 px con etiquetas + detalle en `dock` (recompone el lienzo)
 *   M1 · rail 76 px de iconos + detalle en `inset` (NO recompone: se superpone)
 *   K0 · rail flotante + detalle en `sheet` por el borde que CB-6 permita
 */

import { useEffect, useRef, useState } from 'react';
import { FIXTURE_SOLVE_MS } from '../core/analysis';
import { useObservedSize } from '../core/environment';
import { measureInteraction, record } from '../core/telemetry';
import { useActions, usePrototype } from '../state/PrototypeStore';
import { ContextualActions } from './ContextualActions';
import { DenseSurface } from './DenseSurface';
import { DetailSurface } from './DetailSurface';
import { StatusChannel } from './StatusChannel';
import { StructuralCanvas } from './StructuralCanvas';
import { ToolRail } from './ToolRail';
import { TopBar } from './TopBar';
import { ViewSurface } from './ViewSurface';
import type { Evidence } from '../core/analysis';
import type { TranslationKey } from '../core/i18n';

const EVIDENCE_KEY: Record<Exclude<Evidence, 'none'>, TranslationKey> = {
  N: 'evidence.N',
  V: 'evidence.V',
  M: 'evidence.M',
  deformed: 'evidence.deformed',
};

export const Workspace = () => {
  const { state, derived } = usePrototype();
  const { select, openSurface, closeSurface, restoreSurface, finishSolve, dispatch, invoke } = useActions();
  const { t, composition, verdict } = derived;
  const [canvasBox, setCanvasBox] = useState<HTMLDivElement | null>(null);
  const canvasSize = useObservedSize(canvasBox, { width: 640, height: 420 });
  const solveTimer = useRef<number | null>(null);

  const open = state.broker.open;
  const detailVisible = derived.detailPresent;
  const viewOpen = open.includes('view');
  const denseOpen = open.includes('dense');
  const sheetSide = verdict.sheetSide ?? 'bottom';

  // El cálculo simulado: `calculating` tiene que durar lo suficiente para ser
  // un estado que se vive, no un parpadeo. El nivel lo decide el eje del
  // harness, para poder llegar a `unreliable` por el camino normal.
  useEffect(() => {
    if (!state.analysis.isAnalyzing) return;
    const axisLevel = state.axes.state;
    const level = axisLevel === 'limited' || axisLevel === 'unreliable' || axisLevel === 'failed' ? axisLevel : 'reliable';
    solveTimer.current = window.setTimeout(() => finishSolve(level), FIXTURE_SOLVE_MS);
    return () => {
      if (solveTimer.current) window.clearTimeout(solveTimer.current);
    };
  }, [state.analysis.isAnalyzing, state.axes.state, finishSolve]);

  // `Escape` con alcance acotado: primero el borrador, después la superficie
  // más reciente, y sólo entonces la selección (D-06).
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      if (state.draft) {
        dispatch({ type: 'draft/cancel' });
        return;
      }
      const top = open[open.length - 1];
      if (top) {
        closeSurface(top);
        return;
      }
      if (state.selection) select(null);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [state.draft, state.selection, open, closeSurface, dispatch, select]);

  useEffect(() => {
    record('task_started', { task: 'vertical-slice' });
  }, []);

  /**
   * CB-5 · el rectángulo seguro se deriva del chrome de reposo, no de
   * constantes sueltas. Las superficies contextuales quedan fuera a propósito:
   * abrirlas no puede re-encuadrar el modelo (D-01).
   */
  const landscapeCompact = composition === 'K0' && derived.orientation === 'landscape';
  const insets = {
    top: 44,
    right: 0,
    bottom: composition === 'K0' ? (landscapeCompact ? 44 : 68) : 0,
    left: landscapeCompact ? 68 : 0,
  };

  return (
    <div className="pt-shell" data-composition={composition} data-orientation={derived.orientation}>
      <TopBar />

      <div className="pt-stage">
        {composition !== 'K0' ? <ToolRail /> : null}

        <div className="pt-canvas-area" ref={setCanvasBox}>
          <StructuralCanvas
            width={canvasSize.width}
            height={canvasSize.height}
            insets={insets}
            onSelect={(selection) => measureInteraction('canvas.select', () => select(selection))}
          />

          <div className="pt-canvas-chrome" data-composition={composition}>
            <button
              type="button"
              className="pt-chip pt-chip--trigger"
              aria-expanded={viewOpen}
              onClick={() => {
                invoke('surface.view.toggle', 'visible');
                viewOpen ? closeSurface('view') : openSurface('view', 'canvas-chrome');
              }}
            >
              {t('surface.view')}
              {state.evidence !== 'none' ? <span className="pt-chip__value">{t(EVIDENCE_KEY[state.evidence])}</span> : null}
            </button>
            <button
              type="button"
              className="pt-chip pt-chip--trigger"
              aria-expanded={denseOpen}
              onClick={() => {
                invoke('surface.dense.toggle', 'visible');
                measureInteraction('dense.open', () => (denseOpen ? closeSurface('dense') : openSurface('dense', 'canvas-chrome')));
              }}
            >
              {t('surface.dense')}
            </button>
            {!state.selection ? <span className="pt-hint pt-hint--canvas">{t('canvas.keyboardHint')}</span> : null}
          </div>

          <ContextualActions />

          {composition === 'M1' && detailVisible ? (
            <aside className="pt-inset pt-inset--detail" style={{ width: verdict.detailWidth ?? 300 }}>
              <DetailSurface />
            </aside>
          ) : null}

          {composition !== 'K0' && viewOpen ? (
            <aside className="pt-inset pt-inset--view">
              <ViewSurface />
            </aside>
          ) : null}

          {composition === 'K0' && detailVisible ? (
            <aside className="pt-sheet" data-side={sheetSide}>
              <DetailSurface />
            </aside>
          ) : null}

          {composition === 'K0' && viewOpen ? (
            <aside className="pt-sheet" data-side={sheetSide}>
              <ViewSurface />
            </aside>
          ) : null}

          {composition === 'K0' ? <ToolRail /> : null}
        </div>

        {composition === 'X2' && detailVisible ? (
          <aside className="pt-dock" style={{ width: verdict.detailWidth ?? 320 }}>
            <DetailSurface />
          </aside>
        ) : null}
      </div>

      {denseOpen ? (
        <div className={composition === 'K0' ? 'pt-fullscreen' : 'pt-drawer'}>
          <DenseSurface />
        </div>
      ) : null}

      {state.broker.peek === 'dense' ? (
        <div className="pt-peek">
          <span className="pt-peek__label">
            {t('surface.dense')} · {t('surface.peek')}
          </span>
          <button type="button" className="sc-button sc-button--secondary sc-button--sm" onClick={restoreSurface}>
            <span className="sc-button__label">{t('surface.peekReturn')}</span>
          </button>
        </div>
      ) : null}

      <StatusChannel />

      <footer className="pt-footer">
        <span data-fixture="true">{t('canvas.fixtureFull')}</span>
      </footer>
    </div>
  );
};
