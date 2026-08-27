import React from 'react';
import { clay, lustre } from '../lib/clay';
import { alfa, fuente, radio, superficie, type Mode } from '../lib/theme';

interface TarjetaProps {
  mode: Mode;
  escala?: number;
  radioPx?: number;
  nivel?: 'raised' | 'raisedSm' | 'inset' | 'pressed';
  sombra?: string;
  color?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
}

/**
 * Bloque de arcilla. Una sola receta de sombra por pieza — el brandbook prohíbe
 * combinar salido y hundido — más el lustre superior que le da el material.
 */
export const Tarjeta: React.FC<TarjetaProps> = ({
  mode,
  escala = 2,
  radioPx = radio.lg * 2,
  nivel = 'raised',
  sombra,
  color,
  style,
  children,
}) => {
  const s = superficie(mode);
  return (
    <div
      style={{
        backgroundColor: color ?? s.surface,
        backgroundImage: lustre(mode),
        borderRadius: radioPx,
        boxShadow: sombra ?? clay(mode, nivel, escala),
        color: s.ink,
        fontFamily: fuente.sans,
        ...style,
      }}
    >
      {children}
    </div>
  );
};

interface PildoraProps {
  mode: Mode;
  color: string;
  etiqueta: string;
  valor?: string;
  escala?: number;
  style?: React.CSSProperties;
}

/**
 * Píldora técnica: punto de color + nombre de la magnitud. Es la forma en que
 * el brandbook deja entrar los colores técnicos a la interfaz —siempre
 * nombrados, nunca como decoración suelta.
 */
export const Pildora: React.FC<PildoraProps> = ({
  mode,
  color,
  etiqueta,
  valor,
  escala = 2,
  style,
}) => {
  const s = superficie(mode);
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 14 * (escala / 2),
        padding: `${13 * (escala / 2)}px ${26 * (escala / 2)}px`,
        borderRadius: radio.pill,
        backgroundColor: s.surface,
        backgroundImage: lustre(mode),
        boxShadow: clay(mode, 'raisedSm', escala),
        fontFamily: fuente.sans,
        fontWeight: 600,
        fontSize: 26 * (escala / 2),
        color: s.ink,
        letterSpacing: '-0.01em',
        whiteSpace: 'nowrap',
        ...style,
      }}
    >
      <span
        style={{
          width: 20 * (escala / 2),
          height: 20 * (escala / 2),
          borderRadius: '50%',
          backgroundColor: color,
          boxShadow: `0 0 0 ${5 * (escala / 2)}px ${alfa(color, 0.18)}, inset 0 ${
            2 * (escala / 2)
          }px ${3 * (escala / 2)}px rgba(255,255,255,.55)`,
          flexShrink: 0,
        }}
      />
      <span>{etiqueta}</span>
      {valor ? (
        <span style={{ fontFamily: fuente.mono, fontWeight: 500, color: s.muted }}>{valor}</span>
      ) : null}
    </div>
  );
};

interface BotonProps {
  mode: Mode;
  texto: string;
  color?: string;
  tinta?: string;
  escala?: number;
  sombra?: string;
  style?: React.CSSProperties;
}

/** Botón primario: lima de marca con borde inferior más oscuro (el «canto»). */
export const Boton: React.FC<BotonProps> = ({
  mode,
  texto,
  color = '#89d448',
  tinta = '#16250d',
  escala = 2,
  sombra,
  style,
}) => (
  <div
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: `${20 * (escala / 2)}px ${44 * (escala / 2)}px`,
      borderRadius: radio.pill,
      backgroundColor: color,
      backgroundImage: `linear-gradient(180deg, rgba(255,255,255,.45) 0%, rgba(255,255,255,0) 55%)`,
      boxShadow:
        sombra ??
        `${clay(mode, 'raisedSm', escala)}, inset 0 -${4 * (escala / 2)}px 0 ${alfa('#468c09', 0.55)}`,
      color: tinta,
      fontFamily: fuente.sans,
      fontWeight: 700,
      fontSize: 30 * (escala / 2),
      letterSpacing: '-0.01em',
      ...style,
    }}
  >
    {texto}
  </div>
);
