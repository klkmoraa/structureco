import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import { Escenario } from '../components/Escenario';
import { Bajada, Kicker, Titular } from '../components/Texto';
import { Tarjeta } from '../components/Clay';
import { clay, clayPulsado, lustre } from '../lib/clay';
import { easeEstandar, entrada, muelleChip, tramo } from '../lib/motion';
import { ESCENA } from '../lib/portico';
import { alfa, brand, fuente, radio, semantica, superficie, tecnica } from '../lib/theme';

const MODE = 'dia' as const;

export const AULA_DURACION = 480;

/**
 * Aula: el modo pedagógico. La regla del producto es «predice antes de
 * calcular», así que la pieza muestra exactamente eso — una predicción, una
 * pulsación y una explicación con el número real del modelo.
 *
 * La pregunta y su respuesta se derivan de `escena-portico.json`: el momento
 * mayor del pórtico está en el nudo viga–columna derecho, no en el centro del
 * vano, que es justo el error de intuición que el Aula busca corregir.
 */
export const Aula: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = superficie(MODE);

  const viga = ESCENA.resultadosBarras.find((b) => b.id === 'M2');
  const columnaDerecha = ESCENA.resultadosBarras.find((b) => b.id === 'M3');
  if (!viga || !columnaDerecha) throw new Error('La escena no trae la viga o la columna derecha.');

  const mCentro = Math.abs(viga.maxMomento);
  const mNudo = Math.abs(columnaDerecha.maxMomento);

  const opciones = [
    { texto: 'En el centro de la viga', correcta: false },
    { texto: 'En el nudo viga–columna derecho', correcta: true },
    { texto: 'En la base izquierda', correcta: false },
  ];

  const ELEGIDA = 1;
  const pulsacion = interpolate(frame, [214, 232, 250], [0, 1, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: easeEstandar,
  });
  const revelado = tramo(frame, 250, 286);
  const tProgreso = tramo(frame, 300, 372);

  const tTarjeta = entrada({ frame, fps, retraso: 44 });

  return (
    <AbsoluteFill style={{ backgroundColor: s.base }}>
      <Escenario mode={MODE} paso={54} manchas={[semantica.aula, brand.base]}>
        <AbsoluteFill style={{ padding: 76, flexDirection: 'column' }}>
          <Kicker mode={MODE} texto="Aula" tam={27} color={semantica.aulaSolid} retraso={2} />
          <Titular
            mode={MODE}
            texto="Predice antes de calcular."
            destacadas={[0]}
            colorDestacado={semantica.aulaSolid}
            tam={66}
            retraso={8}
            cadencia={3}
            style={{ marginTop: 22 }}
          />

          <Tarjeta
            mode={MODE}
            escala={2.4}
            radioPx={56}
            style={{
              marginTop: 38,
              padding: '44px 46px 48px',
              opacity: tTarjeta,
              transform: `translateY(${(1 - tTarjeta) * 56}px)`,
            }}
          >
            <div
              style={{
                fontFamily: fuente.sans,
                fontSize: 38,
                fontWeight: 600,
                lineHeight: 1.3,
                letterSpacing: '-0.02em',
                color: s.ink,
              }}
            >
              En este pórtico, ¿dónde aparece el momento flector mayor?
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 36 }}>
              {opciones.map((opcion, i) => {
                const t = entrada({ frame, fps, retraso: 62 + i * 8, config: muelleChip });
                const esElegida = i === ELEGIDA;
                const p = esElegida ? pulsacion : 0;

                // Al revelarse, la correcta se tiñe de éxito y las demás bajan
                // de peso. Nunca se marca en rojo lo que no se eligió.
                const acierto = revelado > 0 && opcion.correcta;
                const apagada = revelado > 0 && !opcion.correcta;

                return (
                  <div
                    key={opcion.texto}
                    style={{
                      opacity: t * (apagada ? 1 - revelado * 0.55 : 1),
                      transform: `translateY(${(1 - t) * 26}px) scale(${1 - p * 0.012})`,
                      padding: '30px 36px',
                      borderRadius: radio.lg * 1.7,
                      backgroundColor: acierto
                        ? alfa(semantica.exito, 0.12 + revelado * 0.06)
                        : s.surface,
                      backgroundImage: lustre(MODE),
                      boxShadow: esElegida
                        ? clayPulsado(MODE, p, 2.1)
                        : clay(MODE, 'raisedSm', 2.1),
                      display: 'flex',
                      alignItems: 'center',
                      gap: 24,
                      fontFamily: fuente.sans,
                      fontSize: 34,
                      fontWeight: 500,
                      color: acierto ? '#1c6b19' : s.ink,
                    }}
                  >
                    <span
                      style={{
                        width: 46,
                        height: 46,
                        flexShrink: 0,
                        borderRadius: '50%',
                        display: 'grid',
                        placeItems: 'center',
                        backgroundColor: acierto ? semantica.exito : s.base,
                        boxShadow: acierto ? 'none' : clay(MODE, 'inset', 1.2),
                        color: '#ffffff',
                        fontFamily: fuente.mono,
                        fontSize: 24,
                        fontWeight: 500,
                      }}
                    >
                      {acierto ? '✓' : ''}
                    </span>
                    {opcion.texto}
                  </div>
                );
              })}
            </div>

            {/* Explicación con los números del modelo resuelto. */}
            <div
              style={{
                marginTop: 26,
                padding: '26px 30px',
                borderRadius: radio.md * 1.7,
                backgroundColor: s.base,
                boxShadow: clay(MODE, 'inset', 1.9),
                opacity: revelado,
                transform: `translateY(${(1 - revelado) * 22}px)`,
              }}
            >
              <div
                style={{
                  fontFamily: fuente.sans,
                  fontSize: 29,
                  lineHeight: 1.45,
                  color: s.muted,
                }}
              >
                El empuje horizontal desequilibra el pórtico: el nudo derecho concentra{' '}
                <strong style={{ color: tecnica.momento, fontWeight: 600 }}>
                  {mNudo.toFixed(2)} kN·m
                </strong>
                , más que el centro del vano, con {mCentro.toFixed(2)} kN·m.
              </div>
            </div>
          </Tarjeta>

          {/* Progreso local del proyecto. */}
          <div style={{ marginTop: 'auto', paddingTop: 36 }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontFamily: fuente.mono,
                fontSize: 26,
                color: s.muted,
                marginBottom: 16,
              }}
            >
              <span>Nivel 2 · Pórticos</span>
              <span>{Math.round(tProgreso * 68)} %</span>
            </div>
            <div
              style={{
                height: 30,
                borderRadius: radio.pill,
                backgroundColor: s.base,
                boxShadow: clay(MODE, 'inset', 1.6),
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  width: `${tProgreso * 68}%`,
                  height: '100%',
                  borderRadius: radio.pill,
                  background: `linear-gradient(90deg, ${semantica.aula}, ${semantica.aulaSolid})`,
                  boxShadow: `inset 0 3px 0 ${alfa('#ffffff', 0.4)}`,
                }}
              />
            </div>
            <Bajada
              mode={MODE}
              texto="El progreso vive en el proyecto, en tu equipo. No sale del navegador."
              tam={27}
              retraso={330}
              style={{ marginTop: 24 }}
            />
          </div>
        </AbsoluteFill>
      </Escenario>
    </AbsoluteFill>
  );
};
