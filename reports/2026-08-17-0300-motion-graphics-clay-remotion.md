# Motion graphics Clay de structureCo (Remotion)

**Fecha:** 2026-08-17 03:00
**Agente:** Claude Code
**Rama:** claude/motion-graphics-claymorphism-videos-1jseaf

## Qué cambió

Se añadió `video/`, un proyecto Remotion **aislado** (su propio `package.json` y
sus propias dependencias) con cuatro piezas de motion graphics claymorfismo
sobre la identidad Clay oficial: `Manifiesto` (16:9), `Analisis2D` (9:16),
`Aula` (4:5) y `Space3D` (16:9, tema Noche).

Lo que distingue estas piezas de una animación decorativa: **los resultados que
se ven en pantalla los calcula el motor real**. `scripts/generar-escena.mjs`
levanta Vite en modo SSR contra la raíz del repo, importa `analyzeProject` de
`src/engine/solver.ts`, resuelve un pórtico de un vano y congela la salida en
`video/src/data/escena-portico.json`. La deformada, el diagrama de momentos, las
reacciones y las cifras del panel se dibujan desde ese JSON.

No se tocó ningún archivo de la aplicación ni de `brand/`.

## Por qué

El usuario pidió videos tipo motion graphics claymorfismo basados en
structureCo, con Remotion o HyperFrames.

Se eligió Remotion porque el MCP de HyperFrames deshabilita `compose` y
`render_video` para agentes con sistema de archivos local —su propia guía manda
usar las skills locales para que las composiciones queden como archivos
versionables— y porque Remotion es React + TypeScript, que es lo que el repo ya
usa. Eso permitió lo que de verdad importaba: que la pieza técnica no ilustrara
números inventados sino los del solver.

Las decisiones de material (sombras, radios, color, tipografía, curvas) se
leyeron de `brand/brandbook-clay.html` y se transcribieron a tokens en
`video/src/lib/`. La geometría del logotipo se extrae de `brand/logo.svg` con un
script, para no redibujarla a ojo.

## Archivos tocados

Todo bajo `video/` (nuevo):

- `package.json`, `tsconfig.json`, `remotion.config.ts`, `.gitignore`, `README.md`
- `src/lib/theme.ts` — tokens Clay (Día y Noche, familia de marca, colores técnicos)
- `src/lib/clay.ts` — las cuatro recetas de sombra y la regla «salido o hundido»
- `src/lib/motion.ts` — curvas y muelles del brandbook llevados a Remotion
- `src/lib/portico.ts` — proyección modelo → pantalla de la escena resuelta
- `src/lib/fonts.ts` — IBM Plex Sans/Mono desde `video/public/fonts`
- `src/components/` — `Escenario`, `Clay` (Tarjeta/Píldora/Botón), `Logo`,
  `Portico`, `Texto`, `Bloque`, `logoPath.ts` (generado)
- `src/compositions/` — `Manifiesto`, `Analisis2D`, `Aula`, `Space3D`
- `src/data/escena-portico.json` — salida del solver (generado)
- `scripts/generar-escena.mjs` — ejecuta el motor y escribe la escena
- `scripts/extraer-logo.mjs` — transcribe `brand/logo.svg`
- `scripts/render-all.mjs`, `scripts/stills.mjs`
- `public/fonts/*.woff2` — copia de `public/fonts` de la app

## Cómo verificar

```powershell
cd video
npm.cmd install
node scripts/generar-escena.mjs   # reproduce el JSON desde el motor
npm.cmd run studio                # línea de tiempo interactiva
npm.cmd run render:all            # MP4 en video/out/
```

Los MP4 no se versionan (`video/.gitignore` excluye `out/`): se regeneran con el
comando de arriba.

Comprobaciones ya corridas en esta rama:

- `npx tsc --noEmit -p video/tsconfig.json` — sin errores.
- `npm run lint` — sin avisos nuevos; los dos de `ContextualActions.tsx` y los
  dos de `prototypes/` ya existían.
- `npm run verify:protected` — frontera protegida intacta, 38 archivos.
- Equilibrio de la escena, contra la salida del solver: ΣFy = 52.0071 + 67.9929
  = 120 kN = 20 kN/m × 6 m; ΣFx = 1.7968 − 31.7968 = −30 kN = −H; residuo 0.

Dos avisos de `npm run verify:docs` (`docs/superpowers/plans/…-cri-94-…md` y
`docs/superpowers/specs/…-cri-94-…-design.md`, ambos HISTORICAL sin aviso
inicial) **ya fallaban antes de este trabajo** — se confirmó guardando los
cambios y volviendo a correr el gate sobre el árbol limpio. No se tocaron: son
ajenos a esta tarea.

## Pendiente / siguiente paso

- Las piezas no llevan audio.
- `Space3D` dibuja un marco espacial en alambre con una proyección propia y
  sencilla: ilustra el dominio, no reproduce la vista 3D de la aplicación.
- El pórtico de la escena es un caso fijo. Si se quiere otro modelo en el video,
  se edita `scripts/generar-escena.mjs` y se vuelve a correr; no hay que tocar
  las composiciones.
- Los dos avisos documentales preexistentes de CRI-94 siguen abiertos.
