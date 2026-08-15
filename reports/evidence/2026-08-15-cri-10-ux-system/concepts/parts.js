/* CRI-10 · piezas compartidas de los conceptos.
 *
 * Los conceptos se generan desde datos y no se escriben a mano frame por frame.
 * Eso no es una comodidad: es lo que hace que el zócalo de un miembro y el de
 * una carga salgan del MISMO generador con distinta entrada, que es exactamente
 * lo que la especificación afirma que debe pasar en el producto. Si dos
 * conceptos discrepan, discrepan porque los datos discrepan.
 */

export const ICON = {
  // Trazo 1.8 en todos — Brandbook §11. Hoy conviven 1.8 y 2.0 (F-10).
  _: (d, extra = '') => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${d}${extra}</svg>`,
  get select() { return this._('<path d="M4 3l7 17 2.5-7L20 10.5z"/>'); },
  get pan() { return this._('<path d="M9 11V5a1.7 1.7 0 013.4 0v6M12.4 11V4.2a1.7 1.7 0 013.4 0V11M15.8 11.4V6.6a1.7 1.7 0 013.4 0V14a7 7 0 01-7 7h-1a7 7 0 01-6-3.4L4 14.6a1.7 1.7 0 012.6-2.1L9 15"/>'); },
  get node() { return this._('<circle cx="12" cy="12" r="4.2"/><path d="M12 3v3.4M12 17.6V21M3 12h3.4M17.6 12H21"/>'); },
  get member() { return this._('<circle cx="6" cy="18" r="2.4"/><circle cx="18" cy="6" r="2.4"/><path d="M7.9 16.1l8.2-8.2"/>'); },
  get support() { return this._('<path d="M12 4v7M5.5 18.5L12 11l6.5 7.5zM3.5 18.5h17M6 22l1.8-3.5M11 22l1.8-3.5M16 22l1.8-3.5"/>'); },
  get load() { return this._('<path d="M12 3v13"/><path d="M7.5 11.5L12 16.5l4.5-5"/><path d="M4 20.5h16"/>'); },
  get dist() { return this._('<path d="M4 3.5h16M7 6v6M12 6v6M17 6v6"/><path d="M5.4 10.2L7 12.6l1.6-2.4M10.4 10.2L12 12.6l1.6-2.4M15.4 10.2L17 12.6l1.6-2.4"/><path d="M4 16.5h16"/>'); },
  get moment() { return this._('<path d="M20 12a8 8 0 10-3 6.2"/><path d="M20.5 7.5V12H16"/>'); },
  get dim() { return this._('<path d="M4 7v10M20 7v10M4 12h16"/><path d="M7 9.2L4.2 12 7 14.8M17 9.2L19.8 12 17 14.8"/>'); },
  get cut() { return this._('<path d="M12 3v18"/><circle cx="6.5" cy="17.5" r="2.6"/><circle cx="17.5" cy="17.5" r="2.6"/><path d="M8.6 15.9L15.5 5M15.4 15.9L8.5 5"/>'); },
  get gen() { return this._('<rect x="3.5" y="3.5" width="17" height="17" rx="2"/><path d="M9 3.5v17M15 3.5v17M3.5 9h17M3.5 15h17"/>'); },
  get undo() { return this._('<path d="M3.5 9.5h10a5.5 5.5 0 010 11H8"/><path d="M7 5.5l-3.5 4 3.5 4"/>'); },
  get redo() { return this._('<path d="M20.5 9.5h-10a5.5 5.5 0 000 11H16"/><path d="M17 5.5l3.5 4-3.5 4"/>'); },
  get play() { return this._('<path d="M6.5 4.5l13 7.5-13 7.5z" fill="currentColor" stroke-linejoin="round"/>'); },
  get caret() { return this._('<path d="M6 9l6 6 6-6"/>'); },
  get chev() { return this._('<path d="M9 6l6 6-6 6"/>'); },
  get search() { return this._('<circle cx="11" cy="11" r="6.5"/><path d="M20.5 20.5l-4.5-4.5"/>'); },
  get layers() { return this._('<path d="M12 3l9 5-9 5-9-5z"/><path d="M3.5 12.5L12 17l8.5-4.5M3.5 16.5L12 21l8.5-4.5"/>'); },
  get plus() { return this._('<path d="M12 5v14M5 12h14"/>'); },
  get minus() { return this._('<path d="M5 12h14"/>'); },
  get fit() { return this._('<path d="M4 9V4.5h4.5M15.5 4.5H20V9M20 15v4.5h-4.5M8.5 19.5H4V15"/><circle cx="12" cy="12" r="2.4"/>'); },
  get info() { return this._('<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5.5M12 7.8v.6"/>'); },
  get check() { return this._('<circle cx="12" cy="12" r="8.5"/><path d="M8.2 12.3l2.6 2.6 5-5.4"/>'); },
  get half() { return this._('<circle cx="12" cy="12" r="8.5"/><path d="M12 3.5a8.5 8.5 0 000 17z" fill="currentColor" stroke="none"/>'); },
  get bang() { return this._('<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5v5.2M12 16.1v.5"/>'); },
  get slash() { return this._('<circle cx="12" cy="12" r="8.5"/><path d="M6 18L18 6"/>'); },
  get cross() { return this._('<circle cx="12" cy="12" r="8.5"/><path d="M9 9l6 6M15 9l-6 6"/>'); },
  get ring() { return this._('<circle cx="12" cy="12" r="8.5" stroke-dasharray="3 3"/>'); },
  get doctor() { return this._('<path d="M12 3l7.5 3v6c0 4.4-3 8.1-7.5 9.4C7.5 20.1 4.5 16.4 4.5 12V6z"/><path d="M12 9v5M9.5 11.5h5"/>'); },
  get table() { return this._('<rect x="3.5" y="4.5" width="17" height="15" rx="1.6"/><path d="M3.5 9.5h17M3.5 14.5h17M9.5 9.5v10"/>'); },
  get target() { return this._('<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="2.6"/><path d="M12 2v2.6M12 19.4V22M2 12h2.6M19.4 12H22"/>'); },
  get back() { return this._('<path d="M20 12H4.5"/><path d="M10 5.5L3.5 12l6.5 6.5"/>'); },
  get trash() { return this._('<path d="M4.5 6.5h15M9.5 6.5V4.8a1.3 1.3 0 011.3-1.3h2.4a1.3 1.3 0 011.3 1.3v1.7"/><path d="M6.5 6.5l1 13a1.4 1.4 0 001.4 1.3h6.2a1.4 1.4 0 001.4-1.3l1-13"/>'); },
  get copy() { return this._('<rect x="8.5" y="8.5" width="12" height="12" rx="1.8"/><path d="M15.5 5.5H5.2A1.7 1.7 0 003.5 7.2v10.3"/>'); },
  get repeat() { return this._('<path d="M3.5 8.5h13a4 4 0 010 8h-3"/><path d="M6.5 5l-3 3.5 3 3.5"/><path d="M20.5 16.5h-4"/>'); },
  get split() { return this._('<path d="M3.5 12h17"/><path d="M12 5.5v13"/><circle cx="3.8" cy="12" r="1.8" fill="currentColor" stroke="none"/><circle cx="20.2" cy="12" r="1.8" fill="currentColor" stroke="none"/>'); },
  get more() { return this._('<circle cx="5.5" cy="12" r="1.6" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none"/><circle cx="18.5" cy="12" r="1.6" fill="currentColor" stroke="none"/>'); },
  get grad() { return this._('<path d="M12 3.5L22 8.5 12 13.5 2 8.5z"/><path d="M6 10.8V16c0 1.9 2.7 3.4 6 3.4s6-1.5 6-3.4v-5.2"/>'); },
  get canvasIcon() { return this._('<rect x="3.5" y="4.5" width="17" height="15" rx="1.8"/><path d="M3.5 15l4.5-4.5 3.5 3.5 3-3 6 6"/>'); },
  get sliders() { return this._('<path d="M4 7h10M18 7h2M4 17h4M12 17h8"/><circle cx="16" cy="7" r="2.2"/><circle cx="10" cy="17" r="2.2"/>'); },
};

/** Cinta. Tres naturalezas y sólo tres. */
export const cinta = ({ estado, compact = false, doctor = 0, name = 'Pórtico de ejemplo' } = {}) => `
<header class="cinta">
  <div class="mark">S</div>
  ${compact ? '' : '<div class="doc"><span class="doc__name">' + name + '</span></div>'}
  ${compact ? '<div class="doc"><span class="doc__name">' + name + '</span></div>' : ''}
  <button class="ib ib--ghost">${ICON.caret}</button>
  ${compact ? '' : `<button class="ib">${ICON.undo}</button><button class="ib" data-state="disabled">${ICON.redo}</button>`}
  <div class="cinta__spacer"></div>
  ${compact ? '' : `<span class="aviso">${ICON.info} Herramienta de apoyo</span>`}
  ${doctor > 0 ? `<button class="ib">${ICON.doctor}</button>` : ''}
  ${estado ? estadoChip(estado, compact) : ''}
  <div class="resolver">
    <button class="resolver__go">${ICON.play}${compact ? '' : ' Resolver'}</button>
    <button class="resolver__more">${ICON.caret}</button>
  </div>
</header>`;

/** Chip de estado: forma + color + palabra. Nunca sólo color, nunca sólo title. */
export const ESTADOS = {
  sin:      { cls: 'sin',      icon: 'ring',  t: 'Sin analizar',  s: 'El modelo no se ha resuelto' },
  calc:     { cls: 'calc',     icon: 'ring',  t: 'Resolviendo…',  s: 'Iteración 2 de 3' },
  resuelto: { cls: 'resuelto', icon: 'check', t: 'Resuelto',      s: 'Convergió en 3 iteraciones' },
  limitado: { cls: 'limitado', icon: 'half',  t: 'Lectura limitada', s: 'Cortante sin deformación por corte' },
  nofiable: { cls: 'nofiable', icon: 'bang',  t: 'No fiable',     s: 'Rigidez casi singular en N3' },
  obsoleto: { cls: 'obsoleto', icon: 'slash', t: 'Modelo cambiado', s: 'No hay resultado vigente' },
  fallido:  { cls: 'fallido',  icon: 'cross', t: 'No se pudo resolver', s: 'Mecanismo: faltan apoyos' },
};
export const estadoChip = (key, compact = false) => {
  const e = ESTADOS[key];
  return `<button class="estado estado--${e.cls}">
    <span class="estado__glyph">${ICON[e.icon]}</span>
    ${compact ? '' : `<span class="estado__copy">${e.t}<small>${e.s}</small></span>`}
  </button>`;
};

const TOOLS = [
  { g: 'Navegar', items: [
    { id: 'select', n: 'Seleccionar', k: 'V', c: '' },
    { id: 'pan', n: 'Desplazar', k: 'H', c: '' },
  ] },
  { g: 'Crear', items: [
    { id: 'node', n: 'Nudo', k: 'N', c: 'structure' },
    { id: 'member', n: 'Miembro', k: 'M', c: 'structure' },
    { id: 'support', n: 'Apoyo', k: 'S', c: 'structure' },
    { id: 'gen', n: 'Generar', k: 'G', c: 'structure' },
  ] },
  { g: 'Cargar', items: [
    { id: 'load', n: 'Puntual', k: 'P', c: 'load' },
    { id: 'dist', n: 'Distribuida', k: 'D', c: 'dist' },
    { id: 'moment', n: 'Momento', k: 'O', c: 'moment' },
  ] },
  { g: 'Anotar', items: [
    { id: 'dim', n: 'Cota', k: 'C', c: 'dim' },
    { id: 'cut', n: 'Corte', k: 'X', c: 'cut' },
  ] },
];

/**
 * Riel. Sólo herramientas — la paleta, el generador y «editar selección» salen
 * de aquí (van a `Ctrl+K`, a Crear y al zócalo respectivamente).
 * Los rótulos caben: «Distribuida», no «Carga distribui…».
 */
export const riel = (active = 'select') => `
<nav class="riel">
  ${TOOLS.map((group) => `
    <div class="riel__group">
      <h4>${group.g}</h4>
      ${group.items.map((tool) => `
        <button class="tool tool--${tool.c || 'nav'} ${tool.id === active ? 'is-active' : ''}" aria-label="${tool.n}">
          <span class="tool__icon">${ICON[tool.id]}</span>
          <span class="tool__name">${tool.n}</span>
          <kbd>${tool.k}</kbd>
        </button>`).join('')}
    </div>`).join('')}
</nav>`;

/**
 * Los tres grupos flotantes. Nada flotante fuera de estos tres.
 *
 * `compact` NO es una variante estética: es la degradación declarada de CB-3
 * ejecutándose. Cuando el lienzo se estrecha, los chips accionables se pliegan
 * dentro del disparador de capas y la lectura de coordenadas desaparece — en
 * ese orden, y antes de tocar los controles de cámara o el estado, que no se
 * degradan nunca. Sin esta regla los grupos se solapan, que es exactamente lo
 * que CRI-7 midió (17.5% de chrome flotante en 1024×768).
 */
export const flotantes = ({ modo = 'Seleccionar', hint = 'toca un objeto', capa = null, compact = false } = {}) => `
<div class="flot flot--modo">
  <span class="chip">${ICON.select} ${modo} <small>· ${hint}</small></span>
  ${capa ? `<span class="chip chip--on"><i class="chip__dot" style="--cc:${capa.c}"></i> ${capa.t}</span>` : ''}
</div>
<div class="flot flot--vista">
  ${compact ? '' : '<span class="chip chip--on">SNAP</span><span class="chip">Rejilla</span>'}
  <button class="ib">${ICON.layers}</button>
</div>
<div class="flot flot--camara">
  ${compact ? '' : '<span class="chip lectura">X 4.00 · Y 2.60 m</span>'}
  <span class="camara">
    <button>${ICON.plus}</button><button>${ICON.minus}</button><button>${ICON.fit}</button>
  </span>
</div>`;

/**
 * El pórtico de ejemplo. `box` es el viewBox en unidades de lienzo.
 * Todo trazo lleva 1.8–2.2; ninguna sombra. Plano, como pide el Brandbook §02.
 */
export const portico = ({ w, h, sel = null, layer = null, labels = 'auto' } = {}) => {
  const L = 6, H = 4;                              // metros
  const pad = { l: 0.18, r: 0.18, t: 0.30, b: 0.22 };
  const sx = w * (1 - pad.l - pad.r) / L;
  const sy = h * (1 - pad.t - pad.b) / H;
  const s = Math.min(sx, sy);
  const ox = (w - L * s) / 2;
  const oy = h - h * pad.b;
  const X = (m) => ox + m * s;
  const Y = (m) => oy - m * s;

  const N = { N1: [0, 0], N2: [L, 0], N3: [0, H], N4: [L, H] };
  const memberStroke = (id) => (sel === id ? 'var(--sc-color-selection-stroke)' : 'var(--sc-color-canvas-member)');
  const memberWidth = (id) => (sel === id ? 3.4 : 2.2);

  // Diagrama de momento: parábola sobre el dintel + tramos rectos en pilares.
  const momentPath = () => {
    const pts = [];
    for (let i = 0; i <= 24; i += 1) {
      const t = i / 24;
      const x = t * L;
      const m = -31.15 + (36.35 + 31.15) * (4 * t * (1 - t));   // forma, no cálculo
      pts.push(`${X(x)},${Y(H) - m * 1.05}`);
    }
    return `M${X(0)},${Y(H)} L${pts.join(' L')} L${X(L)},${Y(H)} Z`;
  };
  const shearPath = () => {
    const pts = [];
    for (let i = 0; i <= 24; i += 1) {
      const t = i / 24;
      const v = 45 * (1 - 2 * t);
      pts.push(`${X(t * L)},${Y(H) - v * 0.8}`);
    }
    return `M${X(0)},${Y(H)} L${pts.join(' L')} L${X(L)},${Y(H)} Z`;
  };
  const axialPath = () => `M${X(0)},${Y(0)} L${X(0) - 26},${Y(0)} L${X(0) - 26},${Y(H)} L${X(0)},${Y(H)} Z
                            M${X(L)},${Y(0)} L${X(L) + 26},${Y(0)} L${X(L) + 26},${Y(H)} L${X(L)},${Y(H)} Z`;
  const deformedPath = () => {
    const pts = [];
    for (let i = 0; i <= 20; i += 1) {
      const t = i / 20;
      pts.push(`${X(t * L)},${Y(H) + 26 * Math.sin(Math.PI * t)}`);
    }
    return `M${X(0) - 9},${Y(0)} Q${X(0) - 13},${Y(H / 2)} ${X(0) - 2},${Y(H)} L${pts.join(' L')} Q${X(L) + 13},${Y(H / 2)} ${X(L) + 9},${Y(0)}`;
  };

  const LAYER = {
    M: `<path d="${momentPath()}" fill="color-mix(in srgb, var(--sc-color-technical-moment) 13%, transparent)" stroke="var(--sc-color-technical-moment)" stroke-width="1.8" stroke-linejoin="round"/>`,
    V: `<path d="${shearPath()}" fill="color-mix(in srgb, var(--sc-color-technical-shear) 13%, transparent)" stroke="var(--sc-color-technical-shear)" stroke-width="1.8" stroke-linejoin="round"/>`,
    N: `<path d="${axialPath()}" fill="color-mix(in srgb, var(--sc-color-technical-axial) 13%, transparent)" stroke="var(--sc-color-technical-axial)" stroke-width="1.8" stroke-linejoin="round"/>`,
    d: `<path d="${deformedPath()}" fill="none" stroke="var(--sc-color-technical-deformed)" stroke-width="2.2" stroke-dasharray="6 4" stroke-linecap="round"/>`,
  };

  const showLoads = labels !== 'none' && !layer;
  // Dimensiones EXPLÍCITAS y sin `preserveAspectRatio="none"`.
  // Estirar el viewBox al contenedor convertía los nudos en elipses y los
  // apoyos en triángulos escalenos: un dibujo estructural deformado no es un
  // concepto, es un error de lectura. El SVG mide lo que dice medir y se ancla
  // arriba-izquierda del lienzo.
  return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <defs>
    <marker id="ar" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M0,0 L10,5 L0,10 z" fill="var(--sc-color-technical-load)"/>
    </marker>
    <marker id="ad" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5.5" markerHeight="5.5" orient="auto-start-reverse">
      <path d="M0,0 L10,5 L0,10 z" fill="var(--sc-color-technical-shear)"/>
    </marker>
    <marker id="are" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M0,0 L10,5 L0,10 z" fill="var(--sc-color-technical-reaction)"/>
    </marker>
  </defs>

  ${layer ? LAYER[layer] ?? '' : ''}

  <!-- Halo de selección: va DEBAJO del trazo técnico y aparte de él, nunca
       engordándolo. Es la misma disciplina que el producto ya aplica con
       «member-hit» — el área y la señal viven alrededor del dibujo, no dentro. -->
  ${sel === 'B3' ? `<path d="M${X(0)},${Y(H)} L${X(L)},${Y(H)}" stroke="var(--sc-color-selection-stroke)" stroke-width="11" stroke-linecap="round" opacity="0.22"/>` : ''}

  <!-- Barras. B3 es el dintel. -->
  <path d="M${X(0)},${Y(0)} L${X(0)},${Y(H)}" stroke="${memberStroke('B1')}" stroke-width="${memberWidth('B1')}" stroke-linecap="round"/>
  <path d="M${X(L)},${Y(0)} L${X(L)},${Y(H)}" stroke="${memberStroke('B2')}" stroke-width="${memberWidth('B2')}" stroke-linecap="round"/>
  <path d="M${X(0)},${Y(H)} L${X(L)},${Y(H)}" stroke="${memberStroke('B3')}" stroke-width="${memberWidth('B3')}" stroke-linecap="round"/>

  ${showLoads ? `
  <!-- Repartida sobre el dintel -->
  <path d="M${X(0)},${Y(H) - 34} L${X(L)},${Y(H) - 34}" stroke="var(--sc-color-technical-shear)" stroke-width="1.8"/>
  ${[0.1, 0.26, 0.42, 0.58, 0.74, 0.9].map((t) => `<path d="M${X(t * L)},${Y(H) - 33} L${X(t * L)},${Y(H) - 7}" stroke="var(--sc-color-technical-shear)" stroke-width="1.6" marker-end="url(#ad)"/>`).join('')}
  <!-- Puntuales en las esquinas -->
  <path d="M${X(0)},${Y(H) - 62} L${X(0)},${Y(H) - 9}" stroke="var(--sc-color-technical-load)" stroke-width="2.2" marker-end="url(#ar)"/>
  <path d="M${X(L)},${Y(H) - 62} L${X(L)},${Y(H) - 9}" stroke="var(--sc-color-technical-load)" stroke-width="2.2" marker-end="url(#ar)"/>` : ''}

  ${layer ? `
  <path d="M${X(0)},${Y(0) + 9} L${X(0)},${Y(0) + 52}" stroke="var(--sc-color-technical-reaction)" stroke-width="2" marker-start="url(#are)"/>
  <path d="M${X(L)},${Y(0) + 9} L${X(L)},${Y(0) + 52}" stroke="var(--sc-color-technical-reaction)" stroke-width="2" marker-start="url(#are)"/>` : ''}

  <!-- Apoyos -->
  <g transform="translate(${X(0) - 16},${Y(0)})"><use href="#sup-pin" width="32" height="22"/></g>
  <g transform="translate(${X(L) - 16},${Y(0)})"><use href="#sup-pin" width="32" height="22"/></g>

  <!-- Nudos. El halo de selección es un anillo aparte: no engorda el trazo. -->
  ${Object.entries(N).map(([id, [mx, my]]) => `
    ${sel === id ? `<circle cx="${X(mx)}" cy="${Y(my)}" r="11" fill="none" stroke="var(--sc-color-selection-stroke)" stroke-width="2.4"/>` : ''}
    <circle cx="${X(mx)}" cy="${Y(my)}" r="5" fill="var(--sc-color-canvas-node-fill)" stroke="${sel === id ? 'var(--sc-color-selection-stroke)' : 'var(--sc-color-canvas-member)'}" stroke-width="1.8"/>`).join('')}

</svg>`;
};

/** Miniatura: el objeto y su entorno inmediato. Pulsarla encuadra. */
export const mini = (sel) => `<div class="mini">${portico({ w: 272, h: 92, sel, labels: 'none' })}</div>`;

/** Zócalo de selección: los verbos vienen al objeto. */
export const zocalo = ({ x, y, id, glyph, verbs, danger = true }) => `
<div class="zocalo" style="left:${x}px; top:${y}px">
  <span class="zocalo__id">${ICON[glyph]} ${id}</span>
  ${verbs.map((v) => `<button class="zac">${v.i ? ICON[v.i] : ''} ${v.t}</button>`).join('')}
  <span class="zocalo__sep"></span>
  ${danger ? `<button class="zac zac--danger">${ICON.trash}</button>` : ''}
  <button class="zac">${ICON.more}</button>
</div>`;

export const prow = (k, sub, control) => `
<div class="prow">
  <span class="prow__k"><strong>${k}</strong>${sub ? `<small>${sub}</small>` : ''}</span>
  ${control}
</div>`;
export const fieldNum = (v, u) => `<span class="field"><span class="val">${v}</span><span class="unit">${u}</span></span>`;
export const fieldSel = (v) => `<span class="field field--select"><span class="val">${v}</span></span>`;
export const fieldMix = () => `<span class="field field--mixed"><span class="val">mixto</span></span>`;
export const metric = (cls, label, value, unit, detail = '') => `
<div class="metric metric--${cls}">
  <span>${label}</span>
  <strong>${value}<small>${unit}</small></strong>
  ${detail ? `<span style="color:var(--sc-color-text-muted);font-size:11px">${detail}</span>` : ''}
</div>`;
