import React from 'react';
import { useCurrentFrame } from 'remotion';
import { LOGO_PATH, LOGO_TRANSFORM, LOGO_VIEW_BOX } from './logoPath';
import { alfa, brand, superficie, type Mode } from '../lib/theme';

interface Props {
  mode: Mode;
  tam: number;
  /** 0 → plano y sin sombra, 1 → arcilla completa. Para animar la aparición. */
  materia?: number;
  /** Barrido especular que cruza la marca. Fuera de [0,1] no se dibuja. */
  brillo?: number;
  style?: React.CSSProperties;
}

/**
 * Logotipo oficial pintado como arcilla: hexágono con la «S» de dos trazos,
 * relleno con la lima de marca y dos sombras (oscura abajo-derecha, luz
 * arriba-izquierda) que replican la receta `raised` del brandbook.
 *
 * La geometría viene de `brand/logo.svg` vía `logoPath.ts` y no se retoca.
 */
export const Logo: React.FC<Props> = ({ mode, tam, materia = 1, brillo = -1, style }) => {
  const frame = useCurrentFrame();
  const s = superficie(mode);
  const id = React.useId().replace(/:/g, '');

  const desplazamiento = 26 * materia;
  const desenfoque = 34 * materia;

  return (
    <svg
      width={tam}
      height={tam}
      viewBox={LOGO_VIEW_BOX}
      style={{ overflow: 'visible', display: 'block', ...style }}
    >
      <defs>
        <linearGradient id={`lima-${id}`} x1="0" y1="0" x2="0.35" y2="1">
          <stop offset="0%" stopColor={brand.hover} />
          <stop offset="52%" stopColor={brand.base} />
          <stop offset="100%" stopColor={brand.pressed} />
        </linearGradient>

        <filter id={`arcilla-${id}`} x="-35%" y="-35%" width="170%" height="170%">
          <feDropShadow
            dx={desplazamiento * 0.5}
            dy={desplazamiento * 0.6}
            stdDeviation={desenfoque}
            floodColor={mode === 'noche' ? '#000000' : '#534837'}
            floodOpacity={mode === 'noche' ? 0.55 : 0.22}
          />
          <feDropShadow
            dx={-desplazamiento * 0.4}
            dy={-desplazamiento * 0.4}
            stdDeviation={desenfoque * 0.7}
            floodColor={mode === 'noche' ? '#3e5c66' : '#ffffff'}
            floodOpacity={mode === 'noche' ? 0.3 : 0.95}
          />
        </filter>

        {/* Franja de luz que recorre la marca de izquierda a derecha. */}
        <linearGradient id={`barrido-${id}`} x1="0" y1="0" x2="1" y2="0.25">
          <stop offset={`${Math.max(0, brillo * 140 - 30)}%`} stopColor={alfa('#ffffff', 0)} />
          <stop offset={`${Math.max(0, brillo * 140 - 8)}%`} stopColor={alfa('#ffffff', 0.75)} />
          <stop offset={`${Math.max(0, brillo * 140 + 14)}%`} stopColor={alfa('#ffffff', 0)} />
        </linearGradient>

        <clipPath id={`recorte-${id}`}>
          <g transform={LOGO_TRANSFORM}>
            <path d={LOGO_PATH} />
          </g>
        </clipPath>
      </defs>

      {/* Cuerpo de arcilla */}
      <g transform={LOGO_TRANSFORM} filter={`url(#arcilla-${id})`}>
        <path d={LOGO_PATH} fill={`url(#lima-${id})`} />
      </g>

      {/* Lustre superior: la lengua de luz obligatoria del material. */}
      <g transform={LOGO_TRANSFORM} opacity={0.5 * materia}>
        <path d={LOGO_PATH} fill={`url(#lustre-${id})`} />
      </g>
      <defs>
        <linearGradient id={`lustre-${id}`} x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor={alfa('#ffffff', 0.85)} />
          <stop offset="46%" stopColor={alfa('#ffffff', 0)} />
        </linearGradient>
      </defs>

      {brillo >= 0 && brillo <= 1 ? (
        <rect
          x="0"
          y="0"
          width="1254"
          height="1254"
          fill={`url(#barrido-${id})`}
          clipPath={`url(#recorte-${id})`}
          opacity={0.9}
        />
      ) : null}

      {/* Sombra de contacto en la superficie, sutil y siempre bajo la marca. */}
      <ellipse
        cx="627"
        cy={1215 + Math.sin(frame / 40) * 4}
        rx={330 * materia}
        ry={26 * materia}
        fill={alfa(s.ink, mode === 'noche' ? 0.35 : 0.1)}
        style={{ filter: 'blur(22px)' }}
      />
    </svg>
  );
};
