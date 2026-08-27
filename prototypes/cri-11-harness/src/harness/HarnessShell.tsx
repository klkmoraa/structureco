/**
 * El harness · el instrumento, no el producto.
 *
 * Todo lo que hay en este archivo es laboratorio: el panel de ejes, el marco
 * del dispositivo y la lectura del resolutor. Está deliberadamente estilizado
 * como aparato de medición —monoespaciado, bordes discontinuos, etiquetas en
 * mayúsculas— para que nunca se confunda con la interfaz que se está juzgando.
 *
 * Su regla de oro: **ningún eje puede requerir reescribir el escenario.** Ése
 * es el gate de la Fase A. Escenario, viewport, orientación, input, tema,
 * idioma, modo, estado, motion y voz se cambian en caliente, sobre el mismo
 * estado, sin recargar y sin perder la tarea en curso.
 */

import { useEffect, useState, type ReactNode } from 'react';
import { HARNESS_STATES } from '../core/analysis';
import { SCENARIOS } from '../core/fixtures';
import { VOICES } from '../core/i18n';
import { VIEWPORT_PRESETS } from '../core/resolver';
import { download, reset, snapshot, subscribe } from '../core/telemetry';
import { surfacesInPhase } from '../core/surfaces';
import { presetViewport, usePrototype, type HarnessAxes } from '../state/PrototypeStore';

const SCENARIO_LABEL: Record<string, string> = {
  'portal-basic': 'Pórtico de un vano · recorrido mínimo',
  'dense-selection': 'Nudo con candidatos solapados · Fase B',
  'datasheet-2000': 'Retícula de estrés · 2 000+ entidades',
};

const STATE_LABEL: Record<string, string> = {
  current: 'current · resultados vigentes',
  stale: 'stale · el modelo cambió',
  limited: 'limited · precisión limitada',
  unreliable: 'unreliable · requiere revisión',
  failed: 'failed · sin resultados utilizables',
  offline: 'offline · conectividad',
  recovery: 'recovery · conflicto de persistencia',
};

const Row = ({ label, children }: { label: string; children: ReactNode }) => (
  <label className="lab-row">
    <span className="lab-row__label">{label}</span>
    {children}
  </label>
);

const Segmented = <T extends string>({
  value,
  options,
  onChange,
  name,
}: {
  value: T;
  options: { id: T; label: string }[];
  onChange: (value: T) => void;
  name: string;
}) => (
  <div className="lab-segmented" role="group" aria-label={name}>
    {options.map((option) => (
      <button
        key={option.id}
        type="button"
        data-active={value === option.id || undefined}
        aria-pressed={value === option.id}
        onClick={() => onChange(option.id)}
      >
        {option.label}
      </button>
    ))}
  </div>
);

export const HarnessShell = ({ children }: { children: ReactNode }) => {
  const { state, derived, dispatch, setFrame } = usePrototype();
  const [events, setEvents] = useState(0);
  const [fit, setFit] = useState(true);
  const [available, setAvailable] = useState({ width: 1200, height: 800 });
  const [stageBox, setStageBox] = useState<HTMLElement | null>(null);
  const { verdict, viewport } = derived;

  useEffect(() => subscribe(() => setEvents(snapshot().length)), []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', state.axes.theme);
  }, [state.axes.theme]);

  useEffect(() => {
    document.documentElement.lang = state.axes.locale === 'es-MX' ? 'es' : 'en';
  }, [state.axes.locale]);

  /**
   * El espacio disponible para el marco simulado se MIDE del propio
   * `.lab-stage`, no se calcula restando el ancho del panel lateral. Restar un
   * 340px fijo asumía el layout de escritorio: por debajo de 900px el panel se
   * apila arriba (`harness.css`, `@media (max-width: 900px)`) y deja de robar
   * ancho, así que restarlo igualmente encogía el marco a unos pocos píxeles
   * en un navegador móvil real — el propio harness quedaba inutilizable en el
   * dispositivo que se supone que debe simular. Medir el contenedor real
   * respeta cualquier punto de quiebre sin tener que duplicarlo aquí.
   */
  useEffect(() => {
    if (!stageBox) return;
    const update = () => {
      const box = stageBox.getBoundingClientRect();
      setAvailable({ width: Math.max(160, box.width - 48), height: Math.max(160, box.height - 64) });
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(stageBox);
    return () => observer.disconnect();
  }, [stageBox]);

  const set = (patch: Partial<HarnessAxes>) => dispatch({ type: 'axis/set', patch });
  const frameSize = presetViewport(state.axes);
  const scale = state.axes.realWindow || !fit
    ? 1
    : Math.min(1, available.width / frameSize.width, available.height / frameSize.height);

  return (
    <div className="lab" data-real-window={state.axes.realWindow || undefined}>
      <aside className="lab-panel" aria-label="Panel del harness CRI-11">
        <header className="lab-panel__head">
          <p className="lab-panel__kicker">CRI-11 · Fase A</p>
          <h1 className="lab-panel__title">Harness de prototipado</h1>
          <p className="lab-panel__note">
            Prototipo aislado. No es producción, no ejecuta el solver y todos los datos son fixture.
          </p>
        </header>

        <div className="lab-group">
          <h2 className="lab-group__title">Escenario</h2>
          <Row label="Fixture">
            <select value={state.axes.scenario} onChange={(event) => set({ scenario: event.target.value as HarnessAxes['scenario'] })}>
              {SCENARIOS.map((scenario) => (
                <option key={scenario} value={scenario}>
                  {SCENARIO_LABEL[scenario]}
                </option>
              ))}
            </select>
          </Row>
          <p className="lab-meta">
            {derived.fixture.nodes.length} nodos · {derived.fixture.members.length} miembros ·{' '}
            {derived.fixture.entityCount.toLocaleString('es-MX')} entidades
          </p>
        </div>

        <div className="lab-group">
          <h2 className="lab-group__title">Espacio</h2>
          <Row label="Viewport">
            <select
              value={state.axes.viewportPreset}
              disabled={state.axes.realWindow}
              onChange={(event) => set({ viewportPreset: event.target.value })}
            >
              {VIEWPORT_PRESETS.map((preset) => (
                <option key={preset.id} value={preset.id}>
                  {preset.label}
                </option>
              ))}
            </select>
          </Row>
          <Row label="Orientación">
            <Segmented
              name="Orientación"
              value={state.axes.landscape ? 'landscape' : 'portrait'}
              options={[
                { id: 'portrait', label: 'Retrato' },
                { id: 'landscape', label: 'Apaisado' },
              ]}
              onChange={(value) => set({ landscape: value === 'landscape' })}
            />
          </Row>
          <Row label="Marco">
            <Segmented
              name="Marco"
              value={state.axes.realWindow ? 'window' : 'frame'}
              options={[
                { id: 'frame', label: 'Simulado' },
                { id: 'window', label: 'Ventana real' },
              ]}
              onChange={(value) => set({ realWindow: value === 'window' })}
            />
          </Row>
          {!state.axes.realWindow ? (
            <Row label="Escala visual">
              <Segmented
                name="Escala"
                value={fit ? 'fit' : 'full'}
                options={[
                  { id: 'fit', label: `Ajustar (${Math.round(scale * 100)}%)` },
                  { id: 'full', label: '100%' },
                ]}
                onChange={(value) => setFit(value === 'fit')}
              />
            </Row>
          ) : null}
          <Row label={`Histéresis · U-13 (${state.axes.hysteresisPx} px)`}>
            <input
              type="range"
              min={0}
              max={120}
              step={4}
              value={state.axes.hysteresisPx}
              onChange={(event) => set({ hysteresisPx: Number(event.target.value) })}
            />
          </Row>
        </div>

        <div className="lab-group">
          <h2 className="lab-group__title">Presentación</h2>
          <Row label="Tema">
            <Segmented
              name="Tema"
              value={state.axes.theme}
              options={[
                { id: 'light', label: 'Día' },
                { id: 'dark', label: 'Noche' },
              ]}
              onChange={(theme) => set({ theme })}
            />
          </Row>
          <Row label="Idioma">
            <Segmented
              name="Idioma"
              value={state.axes.locale}
              options={[
                { id: 'es-MX', label: 'es-MX' },
                { id: 'en-US', label: 'en-US' },
              ]}
              onChange={(locale) => set({ locale })}
            />
          </Row>
          <Row label="Modo">
            <Segmented
              name="Modo"
              value={state.axes.mode}
              options={[
                { id: 'essential', label: 'Esencial' },
                { id: 'complete', label: 'Completa' },
              ]}
              onChange={(mode) => set({ mode })}
            />
          </Row>
          <Row label="Input">
            <Segmented
              name="Input"
              value={state.axes.input}
              options={[
                { id: 'mouse', label: 'Ratón' },
                { id: 'touch', label: 'Táctil' },
                { id: 'mixed', label: 'Mixto' },
              ]}
              onChange={(input) => set({ input })}
            />
          </Row>
          <Row label="Motion">
            <Segmented
              name="Motion"
              value={state.axes.motion}
              options={[
                { id: 'normal', label: 'Normal' },
                { id: 'reduced', label: 'Reducido' },
              ]}
              onChange={(motion) => set({ motion })}
            />
          </Row>
          <Row label="Voz de marca">
            <select value={state.axes.voice} onChange={(event) => set({ voice: event.target.value as HarnessAxes['voice'] })}>
              {VOICES.map((voice) => (
                <option key={voice.id} value={voice.id}>
                  {voice.id} · {voice.note}
                </option>
              ))}
            </select>
          </Row>
        </div>

        <div className="lab-group">
          <h2 className="lab-group__title">Estado</h2>
          <Row label="Análisis · conectividad · persistencia">
            <select value={state.axes.state} onChange={(event) => set({ state: event.target.value as HarnessAxes['state'] })}>
              {HARNESS_STATES.map((id) => (
                <option key={id} value={id}>
                  {STATE_LABEL[id]}
                </option>
              ))}
            </select>
          </Row>
          <p className="lab-meta">
            Fase derivada: <strong>{derived.phase}</strong> · evidencia {derived.paintsEvidence ? 'pintada' : 'bloqueada'}
          </p>
        </div>

        <div className="lab-group lab-group--readout">
          <h2 className="lab-group__title">Resolutor</h2>
          <dl className="lab-readout">
            <div>
              <dt>Composición</dt>
              <dd>
                <strong>{verdict.composition}</strong> {verdict.heldByHysteresis ? '· retenida' : ''}
              </dd>
            </div>
            <div>
              <dt>Viewport medido</dt>
              <dd>
                {viewport.width} × {viewport.height}
              </dd>
            </div>
            <div>
              <dt>Lienzo en reposo</dt>
              <dd>{(verdict.restShare * 100).toFixed(1)}%</dd>
            </div>
            <div>
              <dt>Con detalle</dt>
              <dd>{(verdict.detailShare * 100).toFixed(1)}%</dd>
            </div>
            <div>
              <dt>Reglas CB</dt>
              <dd>
                {(['cb1', 'cb2', 'cb4', 'cb6'] as const).map((rule) => (
                  <span key={rule} className="lab-flag" data-pass={verdict[rule] || undefined}>
                    {rule.toUpperCase()}
                  </span>
                ))}
              </dd>
            </div>
            <div>
              <dt>Rail · detalle · densos</dt>
              <dd>
                {verdict.railMode} {verdict.railWidth}px · {verdict.detailMode} · {verdict.denseMode}
              </dd>
            </div>
            {verdict.sheetSide ? (
              <div>
                <dt>Hoja llega por</dt>
                <dd>{verdict.sheetSide === 'side' ? 'el lado (apaisado)' : 'abajo (retrato)'}</dd>
              </div>
            ) : null}
          </dl>
        </div>

        <div className="lab-group">
          <h2 className="lab-group__title">Telemetría local</h2>
          <p className="lab-meta">{events} eventos · sin red, sin PII, sin modelo de usuario</p>
          <div className="lab-actions">
            <button type="button" onClick={download}>
              Descargar JSON
            </button>
            <button type="button" onClick={reset}>
              Vaciar
            </button>
          </div>
        </div>

        <div className="lab-group">
          <h2 className="lab-group__title">Superficies de Fase A</h2>
          <ul className="lab-list">
            {surfacesInPhase('A').map((surface) => (
              <li key={surface.id}>
                <code>{surface.id}</code> <span>{surface.capability}</span>
              </li>
            ))}
          </ul>
          <p className="lab-meta">
            Fase B declarada: {surfacesInPhase('B').map((surface) => surface.id).join(', ')}.
          </p>
        </div>
      </aside>

      <main className="lab-stage" ref={setStageBox}>
        {state.axes.realWindow ? (
          <div className="lab-frame lab-frame--window" ref={setFrame} data-theme-scope>
            <div className="lab-frame__viewport" data-input={state.axes.input} data-motion={state.axes.motion}>
              {children}
            </div>
          </div>
        ) : (
          <div
            className="lab-frame__outer"
            style={{ width: frameSize.width * scale, height: frameSize.height * scale }}
          >
            <div
              className="lab-frame"
              ref={setFrame}
              style={{ width: frameSize.width, height: frameSize.height, transform: `scale(${scale})` }}
            >
              <div className="lab-frame__viewport" data-input={state.axes.input} data-motion={state.axes.motion}>
                {children}
              </div>
            </div>
          </div>
        )}
        <p className="lab-stage__caption">
          {state.axes.realWindow
            ? 'Ventana real: el sensor de entorno mide `window`. Redimensiona el navegador para probar la frontera.'
            : `Marco simulado de ${frameSize.width}×${frameSize.height} px. El sensor mide el marco, no la ventana.`}
        </p>
      </main>
    </div>
  );
};
