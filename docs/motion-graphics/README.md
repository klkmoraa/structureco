# Motion graphics: pipeline e inventario

**Clasificación:** `CANONICAL`

Este documento decide qué material audiovisual forma parte del árbol operativo.
La fecha de integración de una rama no determina vigencia: se revisaron la fecha
de autoría, los comandos reproducibles, los artefactos versionados y las
referencias desde el resto del repositorio.

## Decisión

**`video/` (Remotion) es el único pipeline soportado para material nuevo.** Fue
creado el 17 de agosto de 2026, después de la campaña HyperFrames del 4 de
agosto, importa el solver real para generar una escena y conserva comandos de
preview, render y stills. `motion/` no reemplazó a `video/`: su merge tardío del
26 de agosto sólo integró una campaña que ya había sido producida y entregada.

La campaña HyperFrames queda preservada por los commits `a010a23`, `d1d1e11`,
`cefd923` y `3221684`, y por su brief histórico. Se retiró `motion/` porque no
tenía consumidores externos ni entregables versionados y mantener diez copias
de GSAP, audio, configuración y código de render de una campaña cerrada no
aportaba capacidad operativa.

## Clasificación

Cada composición tiene una clasificación primaria:

- **vigente**: fuente activa para trabajo nuevo;
- **regenerable**: fuente reproducible, pero no activa;
- **entregada**: campaña terminada; la historia de Git es su archivo;
- **abandonada**: intento sin entrega ni continuidad.

| Pipeline | Composición | Duración / formato | Clasificación | Estado del artefacto |
|---|---|---:|---|---|
| Remotion | `Manifiesto` | 25 s · 16:9 | vigente | MP4 no versionado; regenerable |
| Remotion | `Analisis2D` | 20 s · 9:16 | vigente | MP4 no versionado; regenerable; datos del solver |
| Remotion | `Aula` | 16 s · 4:5 | vigente | MP4 no versionado; regenerable; datos del solver |
| Remotion | `Space3D` | 15 s · 16:9 | vigente | MP4 no versionado; regenerable |
| HyperFrames | `01-brand-reveal` | 14 s · 16:9 | entregada | fuente retirada; recuperable en Git |
| HyperFrames | `02-model-to-result` | 30 s · 16:9 | entregada | fuente retirada; recuperable en Git |
| HyperFrames | `03-load-path` | 25 s · 16:9 | entregada | fuente retirada; recuperable en Git |
| HyperFrames | `04-precision-instrument` | 20 s · 16:9 | entregada | fuente retirada; recuperable en Git |
| HyperFrames | `05-night-lab` | 24 s · 16:9 | entregada | fuente retirada; recuperable en Git |
| HyperFrames | `06-classroom` | 30 s · 16:9 | entregada | fuente retirada; recuperable en Git |
| HyperFrames | `07-diagrams-alive` | 24 s · 16:9 | entregada | fuente retirada; recuperable en Git |
| HyperFrames | `08-import-export` | 20 s · 16:9 | entregada | fuente retirada; recuperable en Git |
| HyperFrames | `09-before-after` | 24 s · 16:9 | entregada | fuente retirada; recuperable en Git |
| HyperFrames | `10-teaser` | 30 s · 16:9 | entregada | fuente retirada; recuperable en Git |

No se encontró ninguna composición meramente **regenerable** ni
**abandonada**: las fuentes presentes eran el pipeline vigente o la campaña
completa que el historial registra como entregada.

## Consumidores reales

- La aplicación, Vite, CI, Netlify y `gh-pages` no importan ni publican ninguna
  composición. No hay MP4, WebM ni still final versionado.
- En `video/`, Remotion consume las cuatro composiciones desde `src/Root.tsx`.
  `scripts/generar-escena.mjs` consume el solver de la aplicación y genera
  `src/data/escena-portico.json`; `scripts/extraer-logo.mjs` consume el SVG de
  marca. Los scripts de render consumen los IDs declarados por Remotion.
- En la campaña retirada, cada HTML sólo consumía sus copias locales de audio y
  GSAP. Los scripts compartidos producían audio para esos mismos HTML. No se
  hallaron referencias desde fuera de `motion/`, salvo el brief y reportes.
- Los reportes anteriores son evidencia temporal, no consumidores ni autoridad
  sobre el pipeline.

## Operación

Instalar primero las dependencias aisladas con `npm --prefix video install`.
Desde la raíz:

```bash
npm run video:studio   # preview interactivo
npm run video:scene    # regenera el JSON desde el solver
npm run video:render   # renderiza las cuatro piezas a video/out/
npm run video:stills   # genera portadas en video/out/stills/
```

`video/out/` sigue fuera de Git. No se añaden scripts raíz para HyperFrames ni
para recuperar la campaña cerrada.
