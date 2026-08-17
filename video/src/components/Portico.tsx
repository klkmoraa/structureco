import React from 'react';
import { interpolate } from 'remotion';
import {
  areaMomento,
  ejeDeBarra,
  ESCENA,
  nodo,
  proyeccion,
  resultadoNodal,
  trazoDeformada,
} from '../lib/portico';
import { alfa, brand, semantica, superficie, tecnica, fuente, type Mode } from '../lib/theme';

export interface Avance {
  /** 0→1: aparición de barras y nudos. */
  geometria: number;
  /** 0→1: apoyos empotrados. */
  apoyos: number;
  /** 0→1: cargas aplicadas. */
  cargas: number;
  /** 0→1: barrido de la deformada. */
  deformada: number;
  /** 0→1: despliegue del diagrama de momentos. */
  momento: number;
  /** 0→1: reacciones en los apoyos. */
  reacciones: number;
}

interface Props {
  mode: Mode;
  ancho: number;
  alto: number;
  margen?: number;
  avance: Avance;
  /** Amplificación de la deformada. El brandbook la muestra siempre declarada. */
  escalaDeformada?: number;
}

const ID = 'portico';

/**
 * El pórtico del video, dibujado como arcilla.
 *
 * Todo lo que se anima aquí —deformada, momentos, reacciones— sale de
 * `escena-portico.json`, que es salida literal del solver de la aplicación.
 * Este componente sólo decide cuándo y con qué material se ve cada cosa.
 */
export const Portico: React.FC<Props> = ({
  mode,
  ancho,
  alto,
  margen = 190,
  avance,
  escalaDeformada = 180,
}) => {
  const s = superficie(mode);
  const proy = proyeccion({ ancho, alto, margen });
  const grosorBarra = Math.max(16, proy.k * 0.12);

  return (
    <svg width={ancho} height={alto} viewBox={`0 0 ${ancho} ${alto}`} style={{ overflow: 'visible' }}>
      <defs>
        {/*
          `userSpaceOnUse` no es un detalle: con las unidades por defecto
          (objectBoundingBox) una columna o una viga —líneas perfectamente
          verticales u horizontales— tiene caja de altura o anchura cero, el
          degradado queda indefinido y la barra sencillamente no se pinta.
          Anclarlo al lienzo además da luz cenital coherente a todas las barras.
        */}
        <linearGradient
          id={`${ID}-barra`}
          gradientUnits="userSpaceOnUse"
          x1={0}
          y1={0}
          x2={ancho * 0.22}
          y2={alto}
        >
          <stop offset="0%" stopColor={mode === 'noche' ? '#3a5a68' : '#ffffff'} />
          <stop offset="55%" stopColor={mode === 'noche' ? '#26404c' : '#efe9de'} />
          <stop offset="100%" stopColor={mode === 'noche' ? '#1a2c35' : '#ddd6c7'} />
        </linearGradient>

        <linearGradient
          id={`${ID}-nudo`}
          gradientUnits="userSpaceOnUse"
          x1={0}
          y1={0}
          x2={ancho * 0.3}
          y2={alto}
        >
          <stop offset="0%" stopColor={brand.hover} />
          <stop offset="60%" stopColor={brand.base} />
          <stop offset="100%" stopColor={brand.pressed} />
        </linearGradient>

        <filter id={`${ID}-relieve`} x="-45%" y="-45%" width="190%" height="190%">
          <feDropShadow
            dx={grosorBarra * 0.42}
            dy={grosorBarra * 0.5}
            stdDeviation={grosorBarra * 0.7}
            floodColor={mode === 'noche' ? '#000000' : '#534837'}
            floodOpacity={mode === 'noche' ? 0.55 : 0.24}
          />
          <feDropShadow
            dx={-grosorBarra * 0.3}
            dy={-grosorBarra * 0.32}
            stdDeviation={grosorBarra * 0.5}
            floodColor={mode === 'noche' ? '#3e5c66' : '#ffffff'}
            floodOpacity={mode === 'noche' ? 0.28 : 0.95}
          />
        </filter>

        <marker
          id={`${ID}-punta-carga`}
          viewBox="0 0 12 12"
          refX="10"
          refY="6"
          markerWidth="7"
          markerHeight="7"
          orient="auto-start-reverse"
        >
          <path d="M1,1 L11,6 L1,11 Z" fill={semantica.aviso} />
        </marker>

        <marker
          id={`${ID}-punta-reaccion`}
          viewBox="0 0 12 12"
          refX="10"
          refY="6"
          markerWidth="7"
          markerHeight="7"
          orient="auto-start-reverse"
        >
          <path d="M1,1 L11,6 L1,11 Z" fill={tecnica.reaccion} />
        </marker>
      </defs>

      {/* ── Apoyos empotrados ─────────────────────────────────────────── */}
      {ESCENA.nodos
        .filter((n) => n.apoyo === 'fixed')
        .map((n) => {
          const [x, y] = proy.aPantalla(n.x, n.y);
          const w = grosorBarra * 4.2;
          const h = grosorBarra * 1.5;
          const t = interpolate(avance.apoyos, [0, 1], [0, 1], { extrapolateRight: 'clamp' });
          return (
            <g key={`apoyo-${n.id}`} opacity={t} transform={`translate(${x}, ${y})`}>
              <rect
                x={-w / 2}
                y={0}
                width={w}
                height={h * t}
                rx={h * 0.42}
                fill={mode === 'noche' ? '#22333c' : '#e8e2d6'}
                filter={`url(#${ID}-relieve)`}
              />
              {[-0.34, 0, 0.34].map((f) => (
                <line
                  key={f}
                  x1={f * w}
                  y1={h}
                  x2={f * w - grosorBarra * 0.7}
                  y2={h + grosorBarra * 1.1}
                  stroke={alfa(s.ink, 0.42)}
                  strokeWidth={grosorBarra * 0.22}
                  strokeLinecap="round"
                />
              ))}
            </g>
          );
        })}

      {/* ── Barras ────────────────────────────────────────────────────── */}
      <g filter={`url(#${ID}-relieve)`}>
        {ESCENA.barras.map((barra, i) => {
          const eje = ejeDeBarra(barra.id);
          const [x1, y1] = proy.aPantalla(eje.xi, eje.yi);
          const [x2, y2] = proy.aPantalla(eje.xj, eje.yj);
          // Las barras crecen en secuencia: primero las columnas, luego la viga.
          const t = interpolate(
            avance.geometria,
            [i * 0.22, i * 0.22 + 0.5],
            [0, 1],
            { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
          );
          return (
            <line
              key={barra.id}
              x1={x1}
              y1={y1}
              x2={x1 + (x2 - x1) * t}
              y2={y1 + (y2 - y1) * t}
              stroke={`url(#${ID}-barra)`}
              strokeWidth={grosorBarra}
              strokeLinecap="round"
              opacity={t > 0 ? 1 : 0}
            />
          );
        })}
      </g>

      {/* ── Diagrama de momentos ──────────────────────────────────────── */}
      {avance.momento > 0
        ? ESCENA.barras.map((barra, i) => {
            const t = interpolate(
              avance.momento,
              [i * 0.16, i * 0.16 + 0.62],
              [0, 1],
              { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
            );
            if (t <= 0) return null;
            return (
              <path
                key={`m-${barra.id}`}
                d={areaMomento(barra.id, proy.k * 0.42, proy, t)}
                fill={alfa(tecnica.momento, 0.26)}
                stroke={tecnica.momento}
                strokeWidth={grosorBarra * 0.2}
                strokeLinejoin="round"
              />
            );
          })
        : null}

      {/* ── Deformada ─────────────────────────────────────────────────── */}
      {avance.deformada > 0
        ? ESCENA.barras.map((barra, i) => {
            const t = interpolate(
              avance.deformada,
              [i * 0.18, i * 0.18 + 0.64],
              [0, 1],
              { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
            );
            if (t <= 0) return null;
            return (
              <path
                key={`d-${barra.id}`}
                d={trazoDeformada(barra.id, escalaDeformada, proy, t)}
                fill="none"
                stroke={tecnica.deformada}
                strokeWidth={grosorBarra * 0.42}
                strokeLinecap="round"
                strokeDasharray={`${grosorBarra * 1.4} ${grosorBarra * 0.9}`}
              />
            );
          })
        : null}

      {/* ── Nudos ─────────────────────────────────────────────────────── */}
      {ESCENA.nodos.map((n, i) => {
        const [x, y] = proy.aPantalla(n.x, n.y);
        const t = interpolate(
          avance.geometria,
          [0.15 + i * 0.11, 0.15 + i * 0.11 + 0.35],
          [0, 1],
          { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
        );
        const r = grosorBarra * 0.82 * t;
        return (
          <g key={`n-${n.id}`}>
            <circle cx={x} cy={y} r={r} fill={`url(#${ID}-nudo)`} filter={`url(#${ID}-relieve)`} />
            <circle
              cx={x - r * 0.25}
              cy={y - r * 0.3}
              r={r * 0.34}
              fill={alfa('#ffffff', 0.55 * t)}
            />
          </g>
        );
      })}

      {/* ── Cargas ────────────────────────────────────────────────────── */}
      {avance.cargas > 0 ? (
        <g>
          {/* Repartida de 20 kN/m sobre la viga */}
          {Array.from({ length: 9 }, (_, k) => {
            const f = k / 8;
            const eje = ejeDeBarra('M2');
            const [x, y] = proy.aPantalla(eje.xi + (eje.xj - eje.xi) * f, eje.yi);
            const t = interpolate(
              avance.cargas,
              [k * 0.05, k * 0.05 + 0.4],
              [0, 1],
              { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
            );
            const largo = grosorBarra * 3.1;
            return (
              <line
                key={`q-${k}`}
                x1={x}
                y1={y - largo - grosorBarra * 0.6}
                x2={x}
                y2={y - grosorBarra * 0.6 - largo * (1 - t)}
                stroke={semantica.aviso}
                strokeWidth={grosorBarra * 0.22}
                strokeLinecap="round"
                markerEnd={`url(#${ID}-punta-carga)`}
                opacity={t}
              />
            );
          })}
          {/* Línea de referencia de la repartida */}
          {(() => {
            const eje = ejeDeBarra('M2');
            const [x1, y1] = proy.aPantalla(eje.xi, eje.yi);
            const [x2] = proy.aPantalla(eje.xj, eje.yj);
            const t = interpolate(avance.cargas, [0, 0.5], [0, 1], { extrapolateRight: 'clamp' });
            return (
              <line
                x1={x1}
                y1={y1 - grosorBarra * 3.7}
                x2={x1 + (x2 - x1) * t}
                y2={y1 - grosorBarra * 3.7}
                stroke={semantica.aviso}
                strokeWidth={grosorBarra * 0.26}
                strokeLinecap="round"
              />
            );
          })()}
          {/* Empuje horizontal en el nudo superior izquierdo */}
          {(() => {
            const n = nodo('N2');
            const [x, y] = proy.aPantalla(n.x, n.y);
            const t = interpolate(avance.cargas, [0.4, 0.95], [0, 1], {
              extrapolateLeft: 'clamp',
              extrapolateRight: 'clamp',
            });
            const largo = grosorBarra * 5;
            return (
              <line
                x1={x - largo - grosorBarra}
                y1={y}
                x2={x - grosorBarra - largo * (1 - t)}
                y2={y}
                stroke={semantica.aviso}
                strokeWidth={grosorBarra * 0.28}
                strokeLinecap="round"
                markerEnd={`url(#${ID}-punta-carga)`}
                opacity={t}
              />
            );
          })()}
        </g>
      ) : null}

      {/* ── Reacciones ────────────────────────────────────────────────── */}
      {avance.reacciones > 0
        ? ESCENA.nodos
            .filter((n) => n.apoyo === 'fixed')
            .map((n, i) => {
              const r = resultadoNodal(n.id);
              const [x, y] = proy.aPantalla(n.x, n.y);
              const t = interpolate(
                avance.reacciones,
                [i * 0.2, i * 0.2 + 0.6],
                [0, 1],
                { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
              );
              const largo = grosorBarra * 4.4 * t;
              return (
                <g key={`r-${n.id}`} opacity={t}>
                  {/* Arranca por debajo del apoyo para no pisar el rayado. */}
                  <line
                    x1={x}
                    y1={y + grosorBarra * 6.6}
                    x2={x}
                    y2={y + grosorBarra * 6.6 - largo}
                    stroke={tecnica.reaccion}
                    strokeWidth={grosorBarra * 0.3}
                    strokeLinecap="round"
                    markerEnd={`url(#${ID}-punta-reaccion)`}
                  />
                  <text
                    x={x}
                    y={y + grosorBarra * 8.4}
                    textAnchor="middle"
                    fill={tecnica.reaccion}
                    fontFamily={fuente.mono}
                    fontSize={grosorBarra * 1.15}
                    fontWeight={500}
                  >
                    {r.ry.toFixed(2)} kN
                  </text>
                </g>
              );
            })
        : null}
    </svg>
  );
};
