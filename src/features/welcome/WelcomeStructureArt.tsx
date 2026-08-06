/**
 * Pieza de firma de la pantalla de bienvenida (AG-015).
 *
 * No es una ilustración decorativa: es un pórtico biempotrado bajo carga
 * repartida, dibujado con la misma codificación de color que el lienzo de
 * trabajo (coral = carga, magenta = momento, turquesa = deformada, tinta =
 * estructura). Quien conoce el dominio lee de un vistazo qué hace la app;
 * quien no, ve un instrumento en vez de un adorno.
 *
 * Geometría fija a propósito: no llama al motor ni al modelo. Es un trazo
 * de referencia, no un resultado, y la frontera matemática no se toca desde
 * una superficie visual. Las proporciones siguen el caso canónico —momento
 * negativo en los nudos, positivo en el centro— para que sea correcto a
 * ojos de un calculista.
 *
 * La animación de entrada vive en `styles.css` (CSS, no `motion`) porque es
 * una animación de montaje: las capacidades de la librería se cargan tras el
 * primer pintado y conducirla desde JS dejaría la figura vacía mientras
 * tanto. `prefers-reduced-motion` la anula por completo.
 */

/** Posición horizontal de cada flecha de la carga repartida sobre el dintel. */
const LOAD_ARROWS = [100, 135, 170, 205, 240, 275, 310, 345, 380];

/** Empotramiento: base sólida más rayado a 45°, como se dibuja a mano. */
const FixedSupport = ({ x }: { x: number }) => (
  <g className="welcome-art__support">
    <line x1={x - 26} y1={312} x2={x + 26} y2={312} />
    {[-20, -10, 0, 10, 20].map((offset) => (
      <line key={offset} x1={x + offset} y1={312} x2={x + offset - 9} y2={323} />
    ))}
  </g>
);

export const WelcomeStructureArt = () => (
  <svg
    className="welcome-art"
    viewBox="0 0 480 400"
    fill="none"
    role="presentation"
    aria-hidden="true"
    focusable="false"
    xmlns="http://www.w3.org/2000/svg"
  >
    {/* Carga repartida sobre el dintel */}
    <g className="welcome-art__load">
      <line className="welcome-art__load-rail" x1={100} y1={70} x2={380} y2={70} />
      {LOAD_ARROWS.map((x) => (
        <g key={x}>
          <line x1={x} y1={70} x2={x} y2={118} />
          <path d={`M${x - 4.5} 112 L${x} 121 L${x + 4.5} 112`} />
        </g>
      ))}
    </g>

    {/* Diagrama de momentos: negativo en los nudos, positivo en el centro */}
    <g className="welcome-art__moment">
      <path className="welcome-art__moment-fill" d="M100 98 Q240 200 380 98 L380 132 L100 132 Z" />
      <path className="welcome-art__moment-line" d="M100 98 Q240 200 380 98" />
    </g>

    {/* Deformada bajo la carga */}
    <path
      className="welcome-art__deformed"
      d="M100 312 C93 252 88 186 94 132 C160 154 320 154 386 132 C392 186 387 252 380 312"
    />

    {/* Estructura */}
    <g className="welcome-art__frame">
      <line x1={100} y1={132} x2={380} y2={132} />
      <line x1={100} y1={132} x2={100} y2={312} />
      <line x1={380} y1={132} x2={380} y2={312} />
    </g>

    <FixedSupport x={100} />
    <FixedSupport x={380} />

    <g className="welcome-art__node">
      {[[100, 132], [380, 132], [100, 312], [380, 312]].map(([cx, cy]) => (
        <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={5.5} />
      ))}
    </g>
  </svg>
);
