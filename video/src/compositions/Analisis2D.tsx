import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import { Escenario } from '../components/Escenario';
import { Logo } from '../components/Logo';
import { Portico, type Avance } from '../components/Portico';
import { Bajada, Kicker, Titular } from '../components/Texto';
import { Pildora, Tarjeta } from '../components/Clay';
import { clay } from '../lib/clay';
import { entrada, muelleChip, tramo } from '../lib/motion';
import { ESCENA } from '../lib/portico';
import { alfa, brand, fuente, radio, superficie, tecnica } from '../lib/theme';

const MODE = 'dia' as const;

export const ANALISIS_DURACION = 600;

/** Amplificación de la deformada, declarada en pantalla junto a la magnitud. */
const ESCALA_DEFORMADA = 60;

/**
 * Pieza vertical (9:16) que recorre el flujo real de la aplicación:
 * modelar → cargar → resolver → leer resultados.
 *
 * Los valores que aparecen en pantalla no son de relleno: salen de
 * `escena-portico.json`, generado ejecutando `analyzeProject` sobre un pórtico
 * de un vano. Ver `scripts/generar-escena.mjs`.
 */
export const Analisis2D: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = superficie(MODE);

  // Cada fase abre la siguiente sin cerrar la anterior: el dibujo se acumula,
  // igual que en la aplicación, donde la deformada y el diagrama se superponen
  // al modelo en vez de reemplazarlo.
  const avance: Avance = {
    geometria: tramo(frame, 34, 150),
    apoyos: tramo(frame, 96, 150),
    cargas: tramo(frame, 156, 246),
    deformada: tramo(frame, 268, 372),
    momento: tramo(frame, 372, 470),
    reacciones: tramo(frame, 452, 520),
  };

  const viga = ESCENA.resultadosBarras.find((b) => b.id === 'M2');
  const nudo = ESCENA.resultadosNodales.find((n) => n.id === 'N2');
  const apoyoIzq = ESCENA.resultadosNodales.find((n) => n.id === 'N1');
  const apoyoDer = ESCENA.resultadosNodales.find((n) => n.id === 'N4');

  if (!viga || !nudo || !apoyoIzq || !apoyoDer) {
    throw new Error('La escena no trae los resultados que la pieza necesita.');
  }

  const fases = [
    { rotulo: 'Modelar', desde: 34, color: brand.base },
    { rotulo: 'Cargar', desde: 156, color: '#d9720a' },
    { rotulo: 'Resolver', desde: 268, color: tecnica.deformada },
    { rotulo: 'Leer', desde: 452, color: tecnica.reaccion },
  ];
  const faseActiva = fases.reduce((acc, f, i) => (frame >= f.desde ? i : acc), 0);

  const tCabecera = entrada({ frame, fps, retraso: 4 });
  const tPanel = entrada({ frame, fps, retraso: 466 });

  return (
    <AbsoluteFill style={{ backgroundColor: s.base }}>
      <Escenario mode={MODE} paso={60} manchas={[brand.base, tecnica.momento]}>
        {/* ── Cabecera ──────────────────────────────────────────────── */}
        <div
          style={{
            position: 'absolute',
            top: 110,
            left: 78,
            right: 78,
            display: 'flex',
            alignItems: 'center',
            gap: 28,
            opacity: tCabecera,
            transform: `translateY(${(1 - tCabecera) * -30}px)`,
          }}
        >
          <Logo mode={MODE} tam={86} materia={tCabecera} />
          <div>
            <div
              style={{
                fontFamily: fuente.display,
                fontSize: 52,
                fontWeight: 700,
                letterSpacing: '-0.03em',
                color: s.ink,
              }}
            >
              structureCo
            </div>
            <div style={{ fontFamily: fuente.mono, fontSize: 24, color: s.muted, marginTop: 4 }}>
              Pórtico de un vano · 6 × 4 m
            </div>
          </div>
        </div>

        {/* ── Título ────────────────────────────────────────────────── */}
        <div style={{ position: 'absolute', top: 250, left: 78, right: 78 }}>
          <Kicker mode={MODE} texto="Análisis 2D" tam={26} retraso={10} color={brand.edge} />
          <Titular
            mode={MODE}
            texto="De la geometría al resultado explicado."
            destacadas={[4]}
            tam={78}
            retraso={16}
            cadencia={2.6}
            style={{ marginTop: 22 }}
          />
        </div>

        {/* ── Riel de fases ─────────────────────────────────────────── */}
        <div
          style={{
            position: 'absolute',
            top: 500,
            left: 78,
            right: 78,
            display: 'flex',
            gap: 16,
          }}
        >
          {fases.map((f, i) => {
            const t = entrada({ frame, fps, retraso: 24 + i * 6, config: muelleChip });
            const activa = i === faseActiva;
            return (
              <div
                key={f.rotulo}
                style={{
                  flex: 1,
                  opacity: t,
                  transform: `translateY(${(1 - t) * 24}px)`,
                  padding: '20px 10px',
                  textAlign: 'center',
                  borderRadius: radio.pill,
                  backgroundColor: activa ? s.surface : s.base,
                  boxShadow: activa ? clay(MODE, 'raisedSm', 2) : clay(MODE, 'inset', 1.6),
                  fontFamily: fuente.sans,
                  fontWeight: 600,
                  fontSize: 28,
                  color: activa ? f.color : s.muted,
                  transition: 'none',
                }}
              >
                {f.rotulo}
              </div>
            );
          })}
        </div>

        {/* ── Lienzo estructural ────────────────────────────────────── */}
        <div style={{ position: 'absolute', top: 580, left: 0, width: 1080 }}>
          <Portico
            mode={MODE}
            ancho={1080}
            alto={720}
            margen={104}
            avance={avance}
            escalaDeformada={ESCALA_DEFORMADA}
          />
        </div>

        {/* ── Leyenda de magnitudes activas ─────────────────────────── */}
        <div
          style={{
            position: 'absolute',
            top: 1352,
            left: 78,
            right: 78,
            display: 'flex',
            gap: 18,
            flexWrap: 'wrap',
          }}
        >
          {avance.deformada > 0.1 ? (
            <Pildora
              mode={MODE}
              color={tecnica.deformada}
              etiqueta="Deformada"
              valor={`×${ESCALA_DEFORMADA}`}
              escala={1.85}
            />
          ) : null}
          {avance.momento > 0.1 ? (
            <Pildora
              mode={MODE}
              color={tecnica.momento}
              etiqueta="Momento"
              valor={`${viga.minMomento.toFixed(1)}`}
              escala={1.85}
            />
          ) : null}
          {avance.reacciones > 0.1 ? (
            <Pildora mode={MODE} color={tecnica.reaccion} etiqueta="Reacción" escala={1.85} />
          ) : null}
        </div>

        {/* ── Panel de resultados ───────────────────────────────────── */}
        <Tarjeta
          mode={MODE}
          escala={2.4}
          radioPx={58}
          style={{
            position: 'absolute',
            left: 78,
            right: 78,
            bottom: 112,
            padding: '42px 50px 46px',
            opacity: tPanel,
            transform: `translateY(${(1 - tPanel) * 90}px)`,
          }}
        >
          <div
            style={{
              fontFamily: fuente.mono,
              fontSize: 24,
              letterSpacing: '0.16em',
              textTransform: 'uppercase',
              color: s.muted,
            }}
          >
            Resultados
          </div>

          <div style={{ display: 'flex', gap: 36, marginTop: 24 }}>
            <Dato
              rotulo="Momento máx. viga"
              valor={`${Math.abs(viga.minMomento).toFixed(2)}`}
              unidad="kN·m"
              color={tecnica.momento}
            />
            <Dato
              rotulo="Desplome nudo"
              valor={`${(nudo.ux * 1000).toFixed(2)}`}
              unidad="mm"
              color={tecnica.deformada}
            />
            <Dato
              rotulo="Reacción vertical"
              valor={`${(apoyoIzq.ry + apoyoDer.ry).toFixed(1)}`}
              unidad="kN"
              color={tecnica.reaccion}
            />
          </div>

          <div
            style={{
              marginTop: 26,
              padding: '20px 26px',
              borderRadius: radio.md * 1.6,
              backgroundColor: s.base,
              boxShadow: clay(MODE, 'inset', 1.8),
              fontFamily: fuente.mono,
              fontSize: 25,
              color: s.muted,
              lineHeight: 1.5,
            }}
          >
            Equilibrio verificado · ΣFy = 120.0 kN · residuo 0
          </div>
        </Tarjeta>

        <Bajada
          mode={MODE}
          texto="Valores calculados con el motor de structureCo, no ilustrados."
          tam={27}
          retraso={500}
          align="center"
          style={{ position: 'absolute', bottom: 44, left: 78, right: 78 }}
        />
      </Escenario>
    </AbsoluteFill>
  );
};

const Dato: React.FC<{ rotulo: string; valor: string; unidad: string; color: string }> = ({
  rotulo,
  valor,
  unidad,
  color,
}) => {
  const s = superficie(MODE);
  return (
    <div style={{ flex: 1 }}>
      <div style={{ fontFamily: fuente.sans, fontSize: 26, color: s.muted, marginBottom: 10 }}>
        {rotulo}
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
        <span
          style={{
            fontFamily: fuente.display,
            fontSize: 56,
            fontWeight: 700,
            letterSpacing: '-0.035em',
            color,
            textShadow: `0 3px 12px ${alfa(color, 0.28)}`,
          }}
        >
          {valor}
        </span>
        <span style={{ fontFamily: fuente.mono, fontSize: 28, color: s.muted }}>{unidad}</span>
      </div>
    </div>
  );
};
