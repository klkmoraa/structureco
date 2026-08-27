import React from 'react';
import { AbsoluteFill, Sequence, interpolate, useCurrentFrame } from 'remotion';
import { easeEstandar } from '../lib/motion';

interface Props {
  desde: number;
  duracion: number;
  /** Frames de entrada y salida del fundido. */
  fundido?: number;
  /** Desplazamiento vertical del bloque al entrar y salir, en px. */
  deriva?: number;
  nombre?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
}

const Contenido: React.FC<Omit<Props, 'desde' | 'nombre'>> = ({
  duracion,
  fundido = 12,
  deriva = 34,
  style,
  children,
}) => {
  const frame = useCurrentFrame();
  const opacidad = interpolate(
    frame,
    [0, fundido, duracion - fundido, duracion],
    [0, 1, 1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: easeEstandar },
  );
  const y = interpolate(
    frame,
    [0, fundido, duracion - fundido, duracion],
    [deriva, 0, 0, -deriva],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: easeEstandar },
  );

  return (
    <AbsoluteFill style={{ opacity: opacidad, transform: `translateY(${y}px)`, ...style }}>
      {children}
    </AbsoluteFill>
  );
};

/**
 * Escena de una composición: entra y sale con la curva estándar del brandbook
 * y reinicia el reloj para sus hijos, de modo que cada bloque se escribe con
 * tiempos locales (frame 0 = su propio comienzo).
 */
export const Bloque: React.FC<Props> = ({ desde, duracion, nombre, ...resto }) => (
  <Sequence from={desde} durationInFrames={duracion} name={nombre} layout="none">
    <Contenido duracion={duracion} {...resto} />
  </Sequence>
);
