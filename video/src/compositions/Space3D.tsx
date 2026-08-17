import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import { Escenario } from '../components/Escenario';
import { Logo } from '../components/Logo';
import { Bajada, Kicker, Titular } from '../components/Texto';
import { Pildora, Tarjeta } from '../components/Clay';
import { clay } from '../lib/clay';
import { entrada, flotar, muelleChip, tramo } from '../lib/motion';
import { alfa, brand, fuente, radio, semantica, superficie, tecnica } from '../lib/theme';

const MODE = 'noche' as const;

export const SPACE3D_DURACION = 450;

/**
 * Space 3D, el dominio espacial del producto.
 *
 * La pieza es deliberadamente honesta: S3D-1 está declarado como experimental
 * funcional y la propia composición lo dice en pantalla, con sus límites. Un
 * video que prometiera más que el README sería el peor de los bugs.
 */

/** Marco espacial de dos vanos: sólo geometría, para la vista en alambre. */
const NODOS_3D: Array<readonly [number, number, number]> = [
  // base
  [-3, 0, -2],
  [3, 0, -2],
  [3, 0, 2],
  [-3, 0, 2],
  // nivel 1
  [-3, 2.6, -2],
  [3, 2.6, -2],
  [3, 2.6, 2],
  [-3, 2.6, 2],
  // nivel 2
  [-3, 5.2, -2],
  [3, 5.2, -2],
  [3, 5.2, 2],
  [-3, 5.2, 2],
];

const BARRAS_3D: Array<readonly [number, number]> = [
  // columnas
  [0, 4], [1, 5], [2, 6], [3, 7],
  [4, 8], [5, 9], [6, 10], [7, 11],
  // vigas nivel 1
  [4, 5], [5, 6], [6, 7], [7, 4],
  // vigas nivel 2
  [8, 9], [9, 10], [10, 11], [11, 8],
];

const LIMITES = [
  'Sin cargas en barra',
  'Sin liberaciones',
  'Sin muelles',
  'Sin dinámica',
  'Sin no linealidad',
];

export const Space3D: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = superficie(MODE);

  const giro = (frame / SPACE3D_DURACION) * Math.PI * 1.15 - 0.5;
  const inclinacion = 0.42 + flotar(frame, 260, 0.05);
  const aparicion = tramo(frame, 20, 110);

  /** Proyección en perspectiva sencilla, suficiente para una vista en alambre. */
  const proyectar = ([x, y, z]: readonly [number, number, number]) => {
    const cx = Math.cos(giro);
    const sx = Math.sin(giro);
    const xr = x * cx - z * sx;
    const zr = x * sx + z * cx;
    const ci = Math.cos(inclinacion);
    const si = Math.sin(inclinacion);
    const yr = y * ci - zr * si;
    const zz = y * si + zr * ci;
    const d = 26;
    const k = d / (d - zz);
    return { x: 1372 + xr * 80 * k, y: 686 - yr * 80 * k, k };
  };

  const puntos = NODOS_3D.map(proyectar);

  const tTarjeta = entrada({ frame, fps, retraso: 150 });

  return (
    <AbsoluteFill style={{ backgroundColor: s.base }}>
      <Escenario mode={MODE} paso={52} manchas={[tecnica.axial, tecnica.seleccion]}>
        {/* ── Columna izquierda: discurso ───────────────────────────── */}
        <div style={{ position: 'absolute', top: 100, left: 112, width: 830 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 22, marginBottom: 38 }}>
            <Logo mode={MODE} tam={74} materia={entrada({ frame, fps, retraso: 2 })} />
            <div
              style={{
                fontFamily: fuente.display,
                fontSize: 44,
                fontWeight: 700,
                letterSpacing: '-0.03em',
                color: s.ink,
              }}
            >
              structureCo
            </div>
          </div>

          <Kicker mode={MODE} texto="Space 3D · S3D-1" tam={26} retraso={10} color={tecnica.axial} />
          <Titular
            mode={MODE}
            texto="Un dominio espacial, separado a propósito."
            destacadas={[1]}
            colorDestacado={tecnica.axial}
            tam={64}
            retraso={16}
            cadencia={2.6}
            style={{ marginTop: 22 }}
          />
          <Bajada
            mode={MODE}
            texto="Marco espacial elástico lineal con 6 grados de libertad por nudo. El puente desde 2D es explícito y de una sola dirección: no inventa propiedades que el modelo plano no tenía."
            tam={30}
            retraso={54}
            ancho={760}
            style={{ marginTop: 28 }}
          />

          <div style={{ display: 'flex', gap: 18, marginTop: 34, flexWrap: 'wrap' }}>
            {(() => {
              const t = entrada({ frame, fps, retraso: 84, config: muelleChip });
              return (
                <div style={{ opacity: t, transform: `translateY(${(1 - t) * 22}px)` }}>
                  <Pildora
                    mode={MODE}
                    color={semantica.canario}
                    etiqueta="Experimental funcional"
                    escala={2.05}
                  />
                </div>
              );
            })()}
            {(() => {
              const t = entrada({ frame, fps, retraso: 92, config: muelleChip });
              return (
                <div style={{ opacity: t, transform: `translateY(${(1 - t) * 22}px)` }}>
                  <Pildora mode={MODE} color={tecnica.axial} etiqueta="6 GDL / nudo" escala={2.05} />
                </div>
              );
            })()}
          </div>

          {/* Los límites declarados, en la misma pieza que la promesa. */}
          <Tarjeta
            mode={MODE}
            escala={2.2}
            radioPx={44}
            style={{
              marginTop: 36,
              padding: '30px 34px',
              opacity: tTarjeta,
              transform: `translateY(${(1 - tTarjeta) * 40}px)`,
            }}
          >
            <div
              style={{
                fontFamily: fuente.mono,
                fontSize: 23,
                letterSpacing: '0.16em',
                textTransform: 'uppercase',
                color: s.muted,
                marginBottom: 20,
              }}
            >
              Límites de S3D-1
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14 }}>
              {LIMITES.map((limite, i) => {
                const t = entrada({ frame, fps, retraso: 160 + i * 6, config: muelleChip });
                return (
                  <span
                    key={limite}
                    style={{
                      opacity: t,
                      transform: `translateY(${(1 - t) * 16}px)`,
                      padding: '12px 22px',
                      borderRadius: radio.pill,
                      backgroundColor: s.base,
                      boxShadow: clay(MODE, 'inset', 1.4),
                      fontFamily: fuente.sans,
                      fontSize: 25,
                      color: s.muted,
                    }}
                  >
                    {limite}
                  </span>
                );
              })}
            </div>
          </Tarjeta>
        </div>

        {/* ── Marco espacial en alambre ─────────────────────────────── */}
        <svg
          width={1920}
          height={1080}
          viewBox="0 0 1920 1080"
          style={{ position: 'absolute', inset: 0 }}
        >
          <defs>
            <filter id="s3d-glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="9" result="b" />
              <feMerge>
                <feMergeNode in="b" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Piso de referencia */}
          <g opacity={0.32 * aparicion}>
            {[-3, -1, 1, 3].map((x) => {
              const a = proyectar([x, 0, -2]);
              const b = proyectar([x, 0, 2]);
              return (
                <line
                  key={`gx-${x}`}
                  x1={a.x}
                  y1={a.y}
                  x2={b.x}
                  y2={b.y}
                  stroke={alfa(tecnica.axial, 0.5)}
                  strokeWidth={2}
                />
              );
            })}
            {[-2, 0, 2].map((z) => {
              const a = proyectar([-3, 0, z]);
              const b = proyectar([3, 0, z]);
              return (
                <line
                  key={`gz-${z}`}
                  x1={a.x}
                  y1={a.y}
                  x2={b.x}
                  y2={b.y}
                  stroke={alfa(tecnica.axial, 0.5)}
                  strokeWidth={2}
                />
              );
            })}
          </g>

          {/* Barras: crecen desde la base hacia arriba. */}
          {BARRAS_3D.map(([i, j], k) => {
            const t = tramo(frame, 24 + k * 3.4, 24 + k * 3.4 + 26);
            if (t <= 0) return null;
            const a = puntos[i];
            const b = puntos[j];
            const profundidad = (a.k + b.k) / 2;
            return (
              <line
                key={`b-${k}`}
                x1={a.x}
                y1={a.y}
                x2={a.x + (b.x - a.x) * t}
                y2={a.y + (b.y - a.y) * t}
                stroke={brand.base}
                strokeWidth={9 * profundidad}
                strokeLinecap="round"
                opacity={0.35 + profundidad * 0.6}
                filter="url(#s3d-glow)"
              />
            );
          })}

          {/* Nudos: seis grados de libertad, insinuados con un halo. */}
          {puntos.map((p, i) => {
            const t = tramo(frame, 40 + i * 3.2, 40 + i * 3.2 + 22);
            if (t <= 0) return null;
            return (
              <g key={`n-${i}`}>
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={16 * p.k * t}
                  fill={alfa(brand.hover, 0.16)}
                  filter="url(#s3d-glow)"
                />
                <circle cx={p.x} cy={p.y} r={7.5 * p.k * t} fill={brand.hover} />
              </g>
            );
          })}
        </svg>

        <Bajada
          mode={MODE}
          texto="structureCo es ayuda de modelado y cálculo. No sustituye revisión, criterio ni certificación profesional."
          tam={26}
          retraso={380}
          align="center"
          style={{ position: 'absolute', bottom: 62, left: 118, right: 118 }}
        />
      </Escenario>
    </AbsoluteFill>
  );
};
