import { useMemo, type CSSProperties } from 'react';
import { buildPortal, type Face, type MaterialId } from '../../graphics/isometricPortal';
import { formatFixed } from '../../utils/numberFormat';

/**
 * Pórtico clay de la bienvenida.
 *
 * Pinta la geometría que `isometricPortal.ts` deriva. No hay WebGL: la escena
 * de la referencia es estática —cámara ortográfica fija, sin órbita, materiales
 * mate sin reflejos— así que un motor 3D costaría ~200 KB gzip y una segunda
 * implementación del mismo dibujo para producir el mismo fotograma. Aquí no
 * hay nada que pueda fallar, y por eso tampoco hay fallback que mantener.
 *
 * El color sale de tokens, nunca de literales: los mismos `<path>` dan marfil
 * y verde menta en Día, y gris cálido y verde luminoso en Noche, sin una sola
 * rama condicional.
 *
 * Decorativo a efectos de accesibilidad. Todo lo que comunica está en el texto
 * del hero y en los tres chips de confianza.
 *
 * `viewBox` y rejilla de suelo: calculados a partir del bounding box real de
 * `buildPortal()`, no copiados de un boceto. `buildPortal()` proyecta con
 * `+x` hacia la derecha de pantalla y `+z` hacia la izquierda (fijado en la
 * tarea 4); un encuadre calculado a mano para la orientación previa habría
 * dejado la figura descentrada o cortada.
 */

/** Token base de cada material. El sombreado modula su luminosidad en CSS. */
const MATERIAL_TOKEN: Record<MaterialId, string> = {
  column: 'var(--sc-color-clay-ivory)',
  beam: 'var(--sc-color-clay-mint)',
  base: 'var(--sc-color-clay-mint-deep)',
  capital: 'var(--sc-color-clay-ivory-deep)',
};

/* `formatFixed`, no `toFixed` crudo: la política numérica única (ver
   `numberFormat.ts`) la impone `numericPolicy.test.ts` sobre todo `features/**`,
   coordenadas de un `<path>` decorativo incluidas. */
const toPath = (face: Face) =>
  `${face.points
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${formatFixed(p.x, 2, 'canvas')} ${formatFixed(p.y, 2, 'canvas')}`)
    .join(' ')} Z`;

/**
 * Rejilla del suelo: 9 líneas por eje (i de -4 a 4), igual que el boceto
 * original, pero con las coordenadas recalculadas proyectando con
 * `projectIso` un rectángulo de mundo que rodea la huella real de las bases
 * (`x: [-9, 159]`, `z: [-9, 31]` con `DEFAULT_PORTAL`) más un margen de 20
 * unidades. Los coeficientes son literales (no llaman a `projectIso` en
 * tiempo de ejecución) porque la rejilla es decorativa y fija: no depende de
 * `dims`, así que no hace falta recalcularla por render.
 */
const GRID_INDICES = [-4, -3, -2, -1, 0, 1, 2, 3, 4];

export const StructuralPortalHero = () => {
  const faces = useMemo(() => buildPortal(), []);

  return (
    <svg
      className="portal-hero"
      viewBox="-90 -190 290 325"
      preserveAspectRatio="xMidYMid meet"
      role="presentation"
      aria-hidden="true"
      focusable="false"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Suelo cuadriculado. Una rejilla, no una textura: sitúa el objeto en un
          plano sin competir con él. */}
      <g className="portal-hero__ground">
        {GRID_INDICES.map((i) => (
          <g key={i}>
            <line x1={22.517 * i + 90.067} y1={13 * i + 23} x2={22.517 * i + 20.785} y2={13 * i + 63} />
            <line x1={-8.66 * i - 34.641} y1={5 * i - 9} x2={-8.66 * i + 145.492} y2={5 * i + 95} />
          </g>
        ))}
      </g>

      {/* Sombra de contacto: una elipse difuminada bajo la huella de las bases.
          Un filtro de sombra real sobre 36 paths costaría más de lo que aporta. */}
      <ellipse className="portal-hero__contact" cx="55" cy="43" rx="90" ry="24" />

      {faces.map((face) => (
        <path
          key={face.id}
          className="portal-hero__face"
          d={toPath(face)}
          fill={MATERIAL_TOKEN[face.material]}
          style={{ '--face-shade': formatFixed(face.shade, 3, 'canvas') } as CSSProperties}
        />
      ))}
    </svg>
  );
};
