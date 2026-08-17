import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import { Escenario } from '../components/Escenario';
import { Bloque } from '../components/Bloque';
import { Logo } from '../components/Logo';
import { Bajada, Kicker, Titular } from '../components/Texto';
import { Boton, Pildora, Tarjeta } from '../components/Clay';
import { clay } from '../lib/clay';
import { entrada, flotar, muelleChip, tramo } from '../lib/motion';
import { alfa, brand, fuente, radio, semantica, superficie, tecnica } from '../lib/theme';

const MODE = 'dia' as const;

/** Marcas de tiempo de la pieza, en frames a 30 fps. */
export const MANIFIESTO_DURACION = 750;

const T = {
  apertura: { desde: 0, dura: 160 },
  promesa: { desde: 150, dura: 175 },
  pilares: { desde: 315, dura: 195 },
  paleta: { desde: 500, dura: 150 },
  cierre: { desde: 640, dura: 110 },
};

const PILARES = [
  {
    titulo: 'Modelar',
    detalle: 'Nodos, barras, apoyos y cargas con la retícula siempre visible.',
    color: brand.base,
    icono: 'geometria' as const,
  },
  {
    titulo: 'Analizar',
    detalle: 'Análisis lineal, P-Delta, líneas de influencia y envolventes.',
    color: tecnica.momento,
    icono: 'diagrama' as const,
  },
  {
    titulo: 'Explicar',
    detalle: 'Cada resultado trae su traza: de dónde sale y con qué supuestos.',
    color: tecnica.axial,
    icono: 'traza' as const,
  },
];

const IconoPilar: React.FC<{ tipo: 'geometria' | 'diagrama' | 'traza'; color: string; t: number }> = ({
  tipo,
  color,
  t,
}) => {
  const trazo = 7;
  return (
    <svg width={92} height={92} viewBox="0 0 92 92" style={{ overflow: 'visible' }}>
      {tipo === 'geometria' ? (
        <g stroke={color} strokeWidth={trazo} strokeLinecap="round" fill="none">
          <path d={`M18,74 L18,${74 - 46 * t}`} />
          <path d={`M74,74 L74,${74 - 46 * t}`} />
          <path d={`M18,28 L${18 + 56 * t},28`} />
          {[18, 74].map((x) => (
            <circle key={x} cx={x} cy={28} r={7 * t} fill={color} stroke="none" />
          ))}
        </g>
      ) : null}
      {tipo === 'diagrama' ? (
        <g fill="none" strokeLinecap="round">
          <path d="M14,70 L78,70" stroke={color} strokeWidth={trazo} opacity={0.35} />
          <path
            d={`M14,70 Q46,${70 - 56 * t} 78,70`}
            stroke={color}
            strokeWidth={trazo}
            fill={alfa(color, 0.22 * t)}
          />
        </g>
      ) : null}
      {tipo === 'traza' ? (
        <g stroke={color} strokeWidth={trazo} strokeLinecap="round" fill="none">
          <path d={`M16,24 L${16 + 60 * t},24`} />
          <path d={`M16,46 L${16 + 42 * t},46`} opacity={0.75} />
          <path d={`M16,68 L${16 + 52 * t},68`} opacity={0.5} />
        </g>
      ) : null}
    </svg>
  );
};

export const Manifiesto: React.FC = () => {
  const s = superficie(MODE);

  return (
    <AbsoluteFill style={{ backgroundColor: s.base }}>
      <Escenario mode={MODE} manchas={[brand.base, tecnica.axial]}>
        {/* ── 1. Apertura ───────────────────────────────────────────── */}
        <Bloque desde={T.apertura.desde} duracion={T.apertura.dura} nombre="Apertura" fundido={16}>
          <Apertura />
        </Bloque>

        {/* ── 2. Promesa ────────────────────────────────────────────── */}
        <Bloque desde={T.promesa.desde} duracion={T.promesa.dura} nombre="Promesa">
          <Promesa />
        </Bloque>

        {/* ── 3. Pilares ────────────────────────────────────────────── */}
        <Bloque desde={T.pilares.desde} duracion={T.pilares.dura} nombre="Pilares">
          <Pilares />
        </Bloque>

        {/* ── 4. Paleta técnica ─────────────────────────────────────── */}
        <Bloque desde={T.paleta.desde} duracion={T.paleta.dura} nombre="Paleta">
          <Paleta />
        </Bloque>

        {/* ── 5. Cierre ─────────────────────────────────────────────── */}
        <Bloque desde={T.cierre.desde} duracion={T.cierre.dura} nombre="Cierre" fundido={16}>
          <Cierre />
        </Bloque>
      </Escenario>
    </AbsoluteFill>
  );
};

const Apertura: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = superficie(MODE);

  const materia = entrada({ frame, fps, retraso: 4 });
  const brillo = tramo(frame, 34, 76);
  const giro = (1 - materia) * -16 + flotar(frame, 210, 1.4);

  return (
    <AbsoluteFill
      style={{
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: 42,
      }}
    >
      <div
        style={{
          transform: `translateY(${(1 - materia) * 70}px) scale(${0.72 + materia * 0.28}) rotate(${giro}deg)`,
        }}
      >
        <Logo mode={MODE} tam={300} materia={materia} brillo={brillo} />
      </div>

      <Titular
        mode={MODE}
        texto="structureCo"
        tam={116}
        retraso={16}
        cadencia={0}
        align="center"
        style={{ marginTop: 8 }}
      />

      <div style={{ display: 'flex', gap: 20, marginTop: 6 }}>
        {['Modela', 'Analiza', 'Explica'].map((palabra, i) => {
          const t = entrada({ frame, fps, retraso: 34 + i * 7, config: muelleChip });
          return (
            <div
              key={palabra}
              style={{
                opacity: t,
                transform: `translateY(${(1 - t) * 26}px)`,
                padding: '16px 34px',
                borderRadius: radio.pill,
                backgroundColor: s.surface,
                boxShadow: clay(MODE, 'raisedSm', 1.7),
                fontFamily: fuente.sans,
                fontSize: 34,
                fontWeight: 600,
                color: s.ink,
                letterSpacing: '-0.01em',
              }}
            >
              {palabra}
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

const Promesa: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = superficie(MODE);
  const tTarjeta = entrada({ frame, fps, retraso: 2 });

  return (
    <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center' }}>
      <Tarjeta
        mode={MODE}
        escala={2.4}
        radioPx={64}
        style={{
          width: 1320,
          padding: '92px 104px',
          opacity: tTarjeta,
          transform: `translateY(${(1 - tTarjeta) * 44}px) scale(${0.96 + tTarjeta * 0.04})`,
        }}
      >
        <Kicker mode={MODE} texto="Identidad Clay" tam={26} retraso={6} color={brand.edge} />
        <Titular
          mode={MODE}
          texto="Una interfaz que se siente cálida, sin perder precisión."
          destacadas={[5]}
          tam={92}
          retraso={12}
          cadencia={3}
          style={{ marginTop: 30 }}
        />
        <Bajada
          mode={MODE}
          texto="La arcilla se usa donde ayuda a entender y operar: bordes blandos para lo que se toca, precisión sin adorno para lo que se calcula."
          tam={38}
          retraso={44}
          ancho={1040}
          style={{ marginTop: 34 }}
        />

        <div style={{ display: 'flex', gap: 22, marginTop: 52, alignItems: 'center' }}>
          {(() => {
            const t = entrada({ frame, fps, retraso: 62, config: muelleChip });
            return (
              <div style={{ opacity: t, transform: `translateY(${(1 - t) * 22}px)` }}>
                <Boton mode={MODE} texto="Analizar" escala={2.1} />
              </div>
            );
          })()}
          {['Local-first', 'Sin backend', 'IndexedDB'].map((texto, i) => {
            const t = entrada({ frame, fps, retraso: 68 + i * 6, config: muelleChip });
            return (
              <div
                key={texto}
                style={{
                  opacity: t,
                  transform: `translateY(${(1 - t) * 20}px)`,
                  padding: '18px 30px',
                  borderRadius: radio.pill,
                  boxShadow: clay(MODE, 'inset', 1.7),
                  backgroundColor: s.base,
                  fontFamily: fuente.mono,
                  fontSize: 26,
                  color: s.muted,
                }}
              >
                {texto}
              </div>
            );
          })}
        </div>
      </Tarjeta>
    </AbsoluteFill>
  );
};

const Pilares: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = superficie(MODE);

  return (
    <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
      <Titular
        mode={MODE}
        texto="Tres gestos, un mismo motor."
        destacadas={[4]}
        tam={78}
        retraso={2}
        cadencia={2.6}
        align="center"
        style={{ justifyContent: 'center', marginBottom: 66 }}
      />

      <div style={{ display: 'flex', gap: 46 }}>
        {PILARES.map((pilar, i) => {
          const t = entrada({ frame, fps, retraso: 24 + i * 9 });
          const tIcono = tramo(frame, 40 + i * 9, 86 + i * 9);
          return (
            <Tarjeta
              key={pilar.titulo}
              mode={MODE}
              escala={2.2}
              radioPx={54}
              style={{
                width: 452,
                padding: '58px 52px 62px',
                opacity: t,
                transform: `translateY(${(1 - t) * 80}px) scale(${0.93 + t * 0.07})`,
              }}
            >
              <div
                style={{
                  width: 132,
                  height: 132,
                  borderRadius: 40,
                  display: 'grid',
                  placeItems: 'center',
                  backgroundColor: s.base,
                  boxShadow: clay(MODE, 'inset', 1.9),
                  marginBottom: 38,
                }}
              >
                <IconoPilar tipo={pilar.icono} color={pilar.color} t={tIcono} />
              </div>
              <div
                style={{
                  fontFamily: fuente.display,
                  fontSize: 58,
                  fontWeight: 700,
                  letterSpacing: '-0.03em',
                  color: s.ink,
                }}
              >
                {pilar.titulo}
              </div>
              <div
                style={{
                  marginTop: 18,
                  fontFamily: fuente.sans,
                  fontSize: 31,
                  lineHeight: 1.4,
                  color: s.muted,
                }}
              >
                {pilar.detalle}
              </div>
            </Tarjeta>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

const MAGNITUDES = [
  { etiqueta: 'Axial', color: tecnica.axial },
  { etiqueta: 'Cortante', color: tecnica.cortante },
  { etiqueta: 'Momento', color: tecnica.momento },
  { etiqueta: 'Deformada', color: tecnica.deformada },
  { etiqueta: 'Reacción', color: tecnica.reaccion },
  { etiqueta: 'Eje local', color: tecnica.eje },
  { etiqueta: 'Selección', color: tecnica.seleccion },
  { etiqueta: 'Aula', color: semantica.aula },
];

const Paleta: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
      <Kicker mode={MODE} texto="Color" tam={28} color={brand.edge} />
      <Titular
        mode={MODE}
        texto="Un color, un significado técnico."
        destacadas={[1]}
        tam={86}
        retraso={8}
        cadencia={2.8}
        align="center"
        style={{ justifyContent: 'center', marginTop: 26 }}
      />

      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 26,
          justifyContent: 'center',
          maxWidth: 1420,
          marginTop: 62,
        }}
      >
        {MAGNITUDES.map((m, i) => {
          const t = entrada({ frame, fps, retraso: 30 + i * 5, config: muelleChip });
          return (
            <div
              key={m.etiqueta}
              style={{
                opacity: t,
                transform: `translateY(${(1 - t) * 40}px) rotate(${(1 - t) * (i % 2 ? 4 : -4)}deg)`,
              }}
            >
              <Pildora mode={MODE} color={m.color} etiqueta={m.etiqueta} escala={2.6} />
            </div>
          );
        })}
      </div>

      <Bajada
        mode={MODE}
        texto="Ningún color entra a la interfaz sin una magnitud detrás."
        tam={34}
        retraso={78}
        align="center"
        style={{ marginTop: 54 }}
      />
    </AbsoluteFill>
  );
};

const Cierre: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const materia = entrada({ frame, fps, retraso: 0 });
  const brillo = tramo(frame, 18, 62);

  return (
    <AbsoluteFill
      style={{ alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 40 }}
    >
      <div style={{ transform: `scale(${0.86 + materia * 0.14})` }}>
        <Logo mode={MODE} tam={216} materia={materia} brillo={brillo} />
      </div>
      <Titular mode={MODE} texto="structureCo" tam={96} retraso={8} cadencia={0} align="center" />
      <Bajada
        mode={MODE}
        texto="Modelar, analizar y explicar estructuras. En el navegador, sin backend obligatorio."
        tam={36}
        retraso={20}
        align="center"
      />
    </AbsoluteFill>
  );
};
