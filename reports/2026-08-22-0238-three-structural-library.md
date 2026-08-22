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

## Fix round 1/5 · hallazgos Important

La primera revisión independiente detectó cinco contratos que estaban incompletos aunque la salida visual era correcta. Esta ronda los cierra sin modificar escenas, colores ni geometría:

1. **Transparencia real:** el gate ahora descomprime `IDAT`, revierte los filtros PNG 0–4 y exige al menos un píxel con alfa menor que 255. Una imagen RGBA completamente opaca ya no pasa por tener solamente color type 6.
2. **Contrato global de 40 escenas:** una prueba recorre todos los IDs canónicos, exige `THREE.Group`, `BufferGeometry`, más de tres objetos editables y 40 firmas distintas, incluidas colisiones potenciales entre familias antiguas y nuevas.
3. **Autoridad del registro:** `THREE_STRUCTURAL_ASSET_IDS` se deriva en el orden de `STRUCTURAL_ASSET_REGISTRY`; una guarda runtime comprueba cobertura exacta. El atlas dejó de usar un cast y valida cada ID mediante el mismo type guard.
4. **Generación transaccional:** los 80 renders se escriben en un directorio hermano temporal con nombre controlado. Sólo después de validar conteo, estructura, resolución y transparencia se publica el bundle; una validación fallida conserva el bundle completo anterior. El reemplazo sólo acepta el destino exacto `public/assets/structural`, y el mensaje de éxito se emite únicamente después de publicar.
5. **Materiales honestos:** el validador de producción y la prueba Día/Noche rechazan clases distintas de `MeshStandardMaterial`, texturas en once slots, planos decorativos, rugosidad menor a `0.78`, transparencia/opacidad de vidrio, `depthWrite` desactivado y emisión distinta de negro. La cobertura incluye las 40 escenas.

### TDD RED

```powershell
node --test scripts/structural-png-contract.test.mjs scripts/structural-asset-bundle.test.mjs
```

Resultado esperado observado: exit 1; faltaba `structural-asset-bundle.mjs` y no existía `hasTransparentPixels` (1 PASS, 3 FAIL).

```powershell
npm.cmd test -- src/features/structural-assets/threeStructuralRender.test.ts src/features/structural-assets/threeTechnicalAssets.test.ts --reporter=verbose
```

Resultado esperado observado: exit 1; faltaban `isThreeStructuralAssetId` y `validateThreeStructuralGroup` (5 PASS, 3 FAIL). La prueba de caracterización global sí confirmó que las 40 firmas existentes ya eran distintas.

### GREEN y gates frescos

- `node --test scripts/structural-png-contract.test.mjs scripts/structural-asset-bundle.test.mjs` — PASS, 6/6.
- `npm.cmd test -- src/features/structural-assets/threeStructuralRender.test.ts src/features/structural-assets/threeTechnicalAssets.test.ts --reporter=verbose` — PASS, 8/8. El test exhaustivo de 80 grupos usa un timeout focal explícito de 15 s; no se cambió el timeout global.
- `node scripts/generate-three-portal-assets.mjs` — PASS, `Generated 80 validated transparent Three.js structural renders`.
- `npm.cmd run verify:structural-assets` — PASS, 6/6 más 80 PNG; 40 Día + 40 Noche, 900×600 y píxeles transparentes reales.
- `npm.cmd test -- src/features/structural-assets --reporter=verbose` — PASS, 8 archivos y 35/35 pruebas.
- `npm.cmd run typecheck` — PASS.
- `npm.cmd run lint` — exit 0; conserva 13 warnings preexistentes fuera del alcance.
- `npm.cmd run verify:protected` — PASS, 38 archivos protegidos intactos.
- `npm.cmd run build` — PASS; conserva el warning conocido por chunks mayores a 500 kB.
- `node scripts/qa-structural-assets.mjs` — PASS; 40 imágenes Three.js únicas por tema, 0 fallback SVG, 0 canvas/filtros y 0 overflow.

### Evidencia visual de la ronda

Se inspeccionaron nuevamente a escala de miniatura las 20 escenas nuevas en Día y Noche mediante:

- `reports/evidence/2026-08-22-three-structural-assets/family-space-frame-{light,dark}.png`
- `reports/evidence/2026-08-22-three-structural-assets/family-support-{light,dark}.png`
- `reports/evidence/2026-08-22-three-structural-assets/family-load-{light,dark}.png`
- `reports/evidence/2026-08-22-three-structural-assets/family-section-{light,dark}.png`
- `reports/evidence/2026-08-22-three-structural-assets/family-connection-{light,dark}.png`
- `reports/evidence/2026-08-22-three-structural-assets/qa-summary.json`

No se detectaron activos ambiguos. Los apoyos muestran mecanismos inequívocos; las secciones distinguen sólido, perfil I y caja hueca; las conexiones evidencian placa, pasador, base y empalme; los space frames cambian claramente de topología; y las cuatro cargas mantienen su color técnico exacto en ambos temas.

El archivo foráneo `reports/evidence/2026-08-21-clay-mobile-density-phase-5/full-test.log` permanece sin tocar y fuera del staging. No se hizo push.

## Fix round 2/5 · clase exacta de material

La segunda revisión comprobó que `MeshPhysicalMaterial` heredaba de `MeshStandardMaterial` y, por tanto, superaba el antiguo `instanceof`. Una configuración física con `transmission: 1`, `transmissionMap` y `thicknessMap` podía entrar aunque el contrato sólo permite clay mate sin vidrio ni transmisión.

La validación exige ahora que cada material de malla tenga como constructor exacto `THREE.MeshStandardMaterial`. Esto rechaza `MeshPhysicalMaterial` y cualquier otra subclase física antes de evaluar rugosidad, opacidad, emisión o texturas, mientras conserva las 40 escenas válidas existentes.

### TDD RED

```powershell
npm.cmd test -- src/features/structural-assets/threeTechnicalAssets.test.ts --reporter=verbose
```

Resultado observado antes de modificar producción: exit 1; la nueva prueba `rejects glass-like physical material subclasses with physical texture slots` esperaba una excepción, pero el validador aceptó el grupo. Totales: 1 FAIL y 5 PASS.

### GREEN y regresión

- `npm.cmd test -- src/features/structural-assets/threeTechnicalAssets.test.ts --reporter=verbose` — PASS, 1 archivo y 6/6 pruebas.
- `npm.cmd test -- src/features/structural-assets --reporter=verbose` — PASS, 8 archivos y 36/36 pruebas.
- `npm.cmd run verify:structural-assets` — PASS, 6/6 contratos de PNG/publicación y 80 PNG válidos; 40 Día + 40 Noche, 900×600, con píxeles transparentes reales.

No se tocaron escenas, geometrías, colores, assets generados, solver, dominio, persistencia ni canvas. La modificación ajena ya presente en `.superpowers/sdd/2026-08-22-structureco-total-visual-redesign/progress.md` y el `full-test.log` foráneo permanecen fuera de este cambio. No se hizo push.
