# Biblioteca Three.js estructural completa

**Clasificación:** `AUDIT/TEMPORARY`
**Fecha:** 2026-08-22 02:38
**Agente:** Codex
**Rama:** `codex/clay-workspace-phase-2`

## Qué cambió

La biblioteca Three.js pasó de 20 a 40 escenas editables. Se añadieron cuatro variantes para estructuras espaciales, apoyos, cargas, secciones y conexiones; cada escena usa exclusivamente geometría de mallas/líneas, materiales mate sin texturas y un fondo transparente. El atlas usa ahora los PNG Three.js como visual primario y conserva el SVG paramétrico como fallback.

El generador consume el manifiesto tipado de 40 IDs expuesto por el laboratorio, limpia únicamente `public/assets/structural`, y produce de forma determinista 80 PNG: 40 Día y 40 Noche. Un gate nuevo valida conteo, familias, resolución 900×600 y canal alfa.

## Por qué

El usuario rechazó los SVG como presentación principal y pidió miniaturas estructurales 3D mate, precisas y editables. También exigió cuatro variantes por familia, color técnico idéntico en ambos temas, ausencia de fondos decorativos —incluido el cuadrado azul— y una revisión visual real a escala de tarjeta.

## Archivos tocados

- `src/features/structural-assets/threeTechnicalAssets.ts` — 20 escenas nuevas, helpers geométricos y colores persistentes de carga.
- `src/features/structural-assets/threeTechnicalAssets.test.ts` — IDs, firmas únicas, editabilidad, ausencia de texturas/fondos, rugosidad y color exacto.
- `src/features/structural-assets/threeStructuralRender.ts` y prueba — unión de los 40 IDs y enrutamiento a los tres constructores.
- `src/features/structural-assets/ThreeStructuralImage.test.tsx` — rutas Día/Noche para las cinco familias nuevas.
- `src/features/structural-assets/ThreeAssetRenderLab.tsx` y prueba — manifiesto único para la generación determinista.
- `src/features/structural-assets/StructuralAssetStudio.tsx`, CSS y prueba — atlas Three.js primario, scroll interno real y lienzo neutro sin cuadrícula decorativa.
- `src/features/structural-assets/index.ts` — exports públicos del catálogo, constructor y renderer Three.js.
- `scripts/generate-three-portal-assets.mjs` — generación de todos los IDs sin catálogo duplicado.
- `scripts/structural-png-contract.mjs`, prueba y `scripts/check-three-structural-renders.mjs` — contrato binario de PNG.
- `scripts/qa-structural-assets.mjs` — oráculo de 40 escenas en Día/Noche con carga lazy observable.
- `package.json` — gate focal `verify:structural-assets`.
- `public/assets/structural/{day,night}/{space-frame,support,load,section,connection}/*.png` — 40 renders nuevos; el árbol completo suma 80.
- `reports/evidence/2026-08-22-three-structural-assets/` — atlas, 20 contactos por familia y resumen JSON.
- `.superpowers/sdd/2026-08-22-structureco-total-visual-redesign/progress.md` — avance Task 1C.

## TDD · RED y GREEN

- RED 1: el focal de tres archivos falló porque `threeTechnicalAssets` no existía y `THREE_STRUCTURAL_ASSET_IDS` tenía 20 en vez de 40. Resultado: 2 archivos fallidos, 1 prueba fallida y 1 suite sin módulo.
- GREEN 1: 10/10 pruebas pasaron al añadir las 20 escenas y el enrutamiento cerrado.
- RED 2: atlas/laboratorio fallaron 3/3 porque había 0 imágenes Three.js primarias, ningún render Noche y el manifiesto global no existía.
- GREEN 2: 3/3 pasaron con el atlas Three.js y el manifiesto único.
- RED 3: la primera generación terminó con `ReferenceError: assetIds is not defined` en el resumen final.
- GREEN 3: regeneración exitosa: `Generated 80 transparent Three.js structural renders`.
- RED 4: el contrato PNG falló por módulo inexistente.
- GREEN 4: 2/2 pruebas de cabecera y el gate de 80 archivos pasaron.
- QA debugging: el primer oráculo agotó 30 s porque `html` bloqueaba el scroll y las imágenes lazy posteriores nunca entraban al viewport. La evidencia DOM mostró `scrollHeight=1000`, `overflow=hidden` y `naturalWidth=0`. Se dio al atlas un scroll interno real; el mismo oráculo pasó sin aumentar timeouts ni desactivar lazy loading.

## Cómo verificar

```powershell
npm.cmd test -- src/features/structural-assets --reporter=verbose
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run verify:protected
node scripts/generate-three-portal-assets.mjs
npm.cmd run verify:structural-assets
node scripts/qa-structural-assets.mjs
npm.cmd run build
```

Resultados observados:

- Focused Vitest: 8 archivos, 33/33 pruebas PASS.
- Typecheck: PASS.
- Lint: exit 0 con 13 warnings preexistentes fuera del alcance.
- Frontera protegida: 38 archivos intactos.
- PNG: 80/80, 900×600, canal alfa; 40 Día + 40 Noche, diez familias × cuatro variantes.
- Browser QA Chromium: PASS, 40 imágenes Three.js únicas por tema, 0 fallbacks SVG, 0 canvas/filters, 0 overflow horizontal.
- Build: PASS; conserva el warning conocido de Vite por un chunk >500 kB.

## Evidencia visual

- `reports/evidence/2026-08-22-three-structural-assets/atlas-light.png`
- `reports/evidence/2026-08-22-three-structural-assets/atlas-dark.png`
- `reports/evidence/2026-08-22-three-structural-assets/family-{space-frame,support,load,section,connection}-{light,dark}.png`
- `reports/evidence/2026-08-22-three-structural-assets/qa-summary.json`

Se inspeccionaron las 20 escenas nuevas en ambos temas a escala de tarjeta. No se detectaron siluetas ambiguas: los cuatro apoyos muestran mecanismos distintos; las secciones macizas/huecas son visibles; las conexiones separan placa rígida, pasador, base y empalme; y los cuatro space frames cambian materialmente de topología. Las cargas conservan azul `#2F73C8`, verde `#65A323` y rosa aplicado `#C65F86` en ambos temas.

## Pendiente / siguiente paso

Task 1C queda lista para revisión independiente. No se tocó solver, dominio, persistencia, comandos, import/export, canvas real ni el archivo ajeno `reports/evidence/2026-08-21-clay-mobile-density-phase-5/full-test.log`. No se hizo push.
