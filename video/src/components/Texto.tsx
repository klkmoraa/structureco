import React from 'react';
import { useCurrentFrame, useVideoConfig } from 'remotion';
import { entrada, muelleChip } from '../lib/motion';
import { alfa, fuente, superficie, type Mode } from '../lib/theme';

interface TitularProps {
  mode: Mode;
  texto: string;
  /** Palabras que van en lima de marca, por índice (base 0). */
  destacadas?: number[];
  tam: number;
  peso?: number;
  retraso?: number;
  /** Frames entre la entrada de una palabra y la siguiente. */
  cadencia?: number;
  color?: string;
  colorDestacado?: string;
  interlineado?: number;
  align?: 'left' | 'center';
  style?: React.CSSProperties;
}

/**
 * Titular que entra palabra por palabra.
 *
 * Cada palabra sube con muelle y se asienta: es el mismo gesto que la arcilla
 * al posarse, no un desvanecido. La tipografía es IBM Plex Sans, que el
 * brandbook fija como única familia de display.
 */
export const Titular: React.FC<TitularProps> = ({
  mode,
  texto,
  destacadas = [],
  tam,
  peso = 700,
  retraso = 0,
  cadencia = 3.5,
  color,
  colorDestacado = '#89d448',
  interlineado = 1.06,
  align = 'left',
  style,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = superficie(mode);
  const palabras = texto.split(' ');

  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: `${tam * (interlineado - 1) + tam * 0.12}px ${tam * 0.27}px`,
        justifyContent: align === 'center' ? 'center' : 'flex-start',
        fontFamily: fuente.display,
        fontSize: tam,
        fontWeight: peso,
        letterSpacing: '-0.028em',
        lineHeight: interlineado,
        color: color ?? s.ink,
        ...style,
      }}
    >
      {palabras.map((palabra, i) => {
        const t = entrada({ frame, fps, retraso: retraso + i * cadencia, config: muelleChip });
        const esDestacada = destacadas.includes(i);
        return (
          <span
            key={`${palabra}-${i}`}
            style={{
              display: 'inline-block',
              opacity: t,
              transform: `translateY(${(1 - t) * tam * 0.42}px) scale(${0.94 + t * 0.06})`,
              color: esDestacada ? colorDestacado : undefined,
              textShadow: esDestacada
                ? `0 ${tam * 0.03}px ${tam * 0.09}px ${alfa(colorDestacado, 0.35)}`
                : `0 ${tam * 0.02}px ${tam * 0.05}px ${alfa(s.ink, mode === 'noche' ? 0.5 : 0.1)}`,
            }}
          >
            {palabra}
          </span>
        );
      })}
    </div>
  );
};

interface BajadaProps {
  mode: Mode;
  texto: string;
  tam: number;
  retraso?: number;
  color?: string;
  align?: 'left' | 'center';
  ancho?: number;
  style?: React.CSSProperties;
}

/** Párrafo de apoyo: entra entero, un escalón por debajo del titular. */
export const Bajada: React.FC<BajadaProps> = ({
  mode,
  texto,
  tam,
  retraso = 0,
  color,
  align = 'left',
  ancho,
  style,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = superficie(mode);
  const t = entrada({ frame, fps, retraso });

  return (
    <p
      style={{
        margin: 0,
        maxWidth: ancho,
        fontFamily: fuente.sans,
        fontSize: tam,
        fontWeight: 400,
        lineHeight: 1.42,
        letterSpacing: '-0.008em',
        color: color ?? s.muted,
        textAlign: align,
        opacity: t,
        transform: `translateY(${(1 - t) * tam * 0.55}px)`,
        ...style,
      }}
    >
      {texto}
    </p>
  );
};

interface KickerProps {
  mode: Mode;
  texto: string;
  tam: number;
  color?: string;
  retraso?: number;
  style?: React.CSSProperties;
}

/** Antetítulo en mono y versalitas: marca de sección, siempre discreta. */
export const Kicker: React.FC<KickerProps> = ({ mode, texto, tam, color, retraso = 0, style }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = superficie(mode);
  const t = entrada({ frame, fps, retraso, config: muelleChip });

  return (
    <div
      style={{
        fontFamily: fuente.mono,
        fontSize: tam,
        fontWeight: 500,
        letterSpacing: '0.2em',
        textTransform: 'uppercase',
        color: color ?? s.muted,
        opacity: t,
        transform: `translateY(${(1 - t) * tam * 0.6}px)`,
        ...style,
      }}
    >
      {texto}
    </div>
  );
};
