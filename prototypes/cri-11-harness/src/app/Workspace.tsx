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
 *
 * Fase B monta las seis superficies que Fase A dejó declaradas y sin
 * construir (Doctor, Palette, Preferences, Output, Recovery, Analysis-setup)
 * y añade los atajos de teclado globales que CRI-8 cataloga como SHL-03/04/05.
 */

import { useEffect, useRef, useState } from 'react';
import { AnalysisSetup } from './AnalysisSetup';
import { FIXTURE_SOLVE_MS } from '../core/analysis';
import { useObservedSize } from '../core/environment';
import { record } from '../core/telemetry';
import { useActions, usePrototype } from '../state/PrototypeStore';
import { CommandPalette } from './CommandPalette';
import { ContextualActions } from './ContextualActions';
import { DenseSurface } from './DenseSurface';
import { DetailSurface } from './DetailSurface';
import { ModelDoctor } from './ModelDoctor';
import { Output } from './Output';
import { Preferences } from './Preferences';
import { Recovery } from './Recovery';
import { StatusChannel } from './StatusChannel';
import { StructuralCanvas } from './StructuralCanvas';
import { surfaceById } from '../core/surfaces';
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

const isEditableTarget = (target: EventTarget | null) => {
  const el = target as HTMLElement | null;
  if (!el) return false;
  return el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable;
};

export const Workspace = () => {
  const { state, derived, dispatch } = usePrototype();
  const { selectOne, openSurface, closeSurface, restoreSurface, finishSolve, invoke, undo, redo, deleteSelected } = useActions();
  const { t, composition, verdict } = derived;
  const spanish = state.axes.locale === 'es-MX';
  const [canvasBox, setCanvasBox] = useState<HTMLDivElement | null>(null);
  const canvasSize = useObservedSize(canvasBox, { width: 640, height: 420 });
  const solveTimer = useRef<number | null>(null);

  const open = state.broker.open;
  const detailVisible = derived.detailPresent;
  const viewOpen = open.includes('view');
  const denseOpen = open.includes('dense');
  const doctorOpen = open.includes('doctor');
  const paletteOpen = open.includes('palette');
  const preferencesOpen = open.includes('preferences');
  const outputOpen = open.includes('output');
  const recoveryOpen = open.includes('recovery');
  const analysisSetupOpen = open.includes('analysis-setup');
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
  // más reciente, y sólo entonces la selección (D-06). Se registra en fase de
  // captura para que `StructuralCanvas` pueda interceptarlo antes si hay un
  // gesto local en curso (picker, precisión, marco).
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (state.draft) {
          dispatch({ type: 'draft/cancel' });
          return;
        }
        const top = open[open.length - 1];
        if (top) {
          closeSurface(top);
          return;
        }
        if (state.selection.length > 0) selectOne(null);
        return;
      }

      const meta = event.metaKey || event.ctrlKey;
      if (meta && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        invoke('surface.palette.toggle', 'shortcut');
        paletteOpen ? closeSurface('palette') : openSurface('palette');
        return;
      }
      if (isEditableTarget(event.target)) return;
      if (meta && event.key.toLowerCase() === 'z') {
        event.preventDefault();
        event.shiftKey ? redo() : undo();
        return;
      }
      if (meta && event.key.toLowerCase() === 'y') {
        event.preventDefault();
        redo();
        return;
      }
      if ((event.key === 'Delete' || event.key === 'Backspace') && state.selection.length > 0) {
        event.preventDefault();
        deleteSelected();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [state.draft, state.selection, open, paletteOpen, closeSurface, openSurface, dispatch, selectOne, invoke, undo, redo, deleteSelected]);

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

  const peekedSurface = state.broker.peek ? surfaceById(state.broker.peek) : null;
  const zoomPct = Math.round(state.camera.zoom * 100);

  return (
    <div className="pt-shell" data-composition={composition} data-orientation={derived.orientation}>
      <TopBar />

      <div className="pt-stage">
        {composition !== 'K0' ? <ToolRail /> : null}

        <div className="pt-canvas-area" ref={setCanvasBox}>
          <StructuralCanvas width={canvasSize.width} height={canvasSize.height} insets={insets} />

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
                denseOpen ? closeSurface('dense') : openSurface('dense', 'canvas-chrome');
              }}
            >
              {t('surface.dense')}
            </button>
            <button
              type="button"
              className="pt-chip pt-chip--trigger"
              aria-expanded={analysisSetupOpen}
              onClick={() => {
                invoke('surface.analysisSetup.toggle', 'visible');
                analysisSetupOpen ? closeSurface('analysis-setup') : openSurface('analysis-setup', 'canvas-chrome');
              }}
            >
              {t('surface.analysisSetup')}
            </button>
            {state.selection.length === 0 ? <span className="pt-hint pt-hint--canvas">{t('canvas.keyboardHint')}</span> : null}
          </div>

          <div className="pt-zoom-controls" role="group" aria-label={t('command.zoomIn')}>
            <button type="button" className="sc-icon-button sc-icon-button--secondary sc-icon-button--sm" aria-label={t('command.zoomOut')} onClick={() => dispatch({ type: 'camera/zoomBy', factor: 1 / 1.2 })}>
              −
            </button>
            <button type="button" className="pt-zoom-controls__pct" aria-label={t('command.resetView')} onClick={() => dispatch({ type: 'camera/reset' })}>
              {zoomPct}%
            </button>
            <button type="button" className="sc-icon-button sc-icon-button--secondary sc-icon-button--sm" aria-label={t('command.zoomIn')} onClick={() => dispatch({ type: 'camera/zoomBy', factor: 1.2 })}>
              +
            </button>
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

          {composition !== 'K0' && analysisSetupOpen ? (
            <aside className="pt-inset pt-inset--analysis">
              <AnalysisSetup />
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

          {composition === 'K0' && analysisSetupOpen ? (
            <aside className="pt-sheet" data-side={sheetSide}>
              <AnalysisSetup />
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

      {doctorOpen ? (
        composition === 'K0' ? (
          <aside className="pt-sheet" data-side={sheetSide}>
            <ModelDoctor />
          </aside>
        ) : (
          <div className="pt-drawer pt-drawer--side">
            <ModelDoctor />
          </div>
        )
      ) : null}

      {preferencesOpen ? (
        composition === 'K0' ? (
          <aside className="pt-sheet" data-side={sheetSide}>
            <Preferences />
          </aside>
        ) : (
          <div className="pt-drawer pt-drawer--side">
            <Preferences />
          </div>
        )
      ) : null}

      {outputOpen ? (
        composition === 'K0' ? (
          <aside className="pt-sheet" data-side={sheetSide}>
            <Output />
          </aside>
        ) : (
          <div className="pt-drawer pt-drawer--side">
            <Output />
          </div>
        )
      ) : null}

      {recoveryOpen ? (
        composition === 'K0' ? (
          <aside className="pt-sheet" data-side={sheetSide}>
            <Recovery />
          </aside>
        ) : (
          <div className="pt-drawer pt-drawer--side">
            <Recovery />
          </div>
        )
      ) : null}

      {paletteOpen ? <CommandPalette /> : null}

      {peekedSurface ? (
        <div className="pt-peek">
          <span className="pt-peek__label">
            {spanish ? peekedSurface.name.es : peekedSurface.name.en} · {t('surface.peek')}
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
