import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { alfa, brand, superficie, tecnica, type Mode } from '../lib/theme';
import { flotar } from '../lib/motion';

interface Props {
  mode: Mode;
  /** Paso de la retícula en px. El brandbook la fija en múltiplos de 8. */
  paso?: number;
  /** Manchas de color de fondo. Se mantienen muy por debajo del contenido. */
  manchas?: string[];
  children?: React.ReactNode;
}

/**
 * Fondo común de todas las piezas: marfil (o pizarra en Noche), la retícula de
 * 8px que sostiene la arcilla y dos manchas de color que respiran despacio.
 * Nada de esto debe competir con el contenido, así que todo va a opacidad baja.
 */
export const Escenario: React.FC<Props> = ({
  mode,
  paso = 48,
  manchas = [brand.base, tecnica.axial],
  children,
}) => {
  const frame = useCurrentFrame();
  const s = superficie(mode);
  const tinta = mode === 'noche' ? alfa('#7fa6b4', 0.16) : alfa('#8d8271', 0.13);

  return (
    <AbsoluteFill style={{ backgroundColor: s.base }}>
      {/* Manchas de color: derivan lentamente para que el cuadro nunca esté quieto. */}
      {manchas.map((color, i) => {
        const x = 22 + i * 56 + flotar(frame, 320 + i * 90, 6, i);
        const y = 30 + i * 34 + flotar(frame, 260 + i * 70, 7, i * 1.7);
        return (
          <AbsoluteFill
            key={color + i}
            style={{
              background: `radial-gradient(46% 46% at ${x}% ${y}%, ${alfa(
                color,
                mode === 'noche' ? 0.2 : 0.16,
              )} 0%, ${alfa(color, 0)} 70%)`,
            }}
          />
        );
      })}

      {/* Retícula de 8px agrupada: sólo se insinúa. */}
      <AbsoluteFill
        style={{
          backgroundImage: `linear-gradient(${tinta} 1px, transparent 1px), linear-gradient(90deg, ${tinta} 1px, transparent 1px)`,
          backgroundSize: `${paso}px ${paso}px`,
          maskImage:
            'radial-gradient(72% 66% at 50% 46%, rgba(0,0,0,.85) 0%, rgba(0,0,0,0) 100%)',
          WebkitMaskImage:
            'radial-gradient(72% 66% at 50% 46%, rgba(0,0,0,.85) 0%, rgba(0,0,0,0) 100%)',
          opacity: 0.55,
        }}
      />

      {children}

      {/* Viñeta: hunde los bordes para que la arcilla del centro flote. */}
      <AbsoluteFill
        style={{
          pointerEvents: 'none',
          background: `radial-gradient(120% 100% at 50% 42%, rgba(0,0,0,0) 52%, ${alfa(
            mode === 'noche' ? '#000000' : '#5a5142',
            mode === 'noche' ? 0.45 : 0.14,
          )} 100%)`,
        }}
      />
    </AbsoluteFill>
  );
};
