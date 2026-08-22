# Home total y assets estructurales Three.js

**Fecha:** 2026-08-22 01:28  
**Agente:** Codex  
**Rama:** `codex/clay-workspace-phase-2`

## Qué cambió

Se reemplazó por completo la composición anterior del Home con una experiencia adaptativa de escritorio, tablet y móvil. El Home ahora prioriza continuar o crear proyecto, accesos rápidos, proyectos recientes y plantillas, con navegación propia por formato.

Se añadió una primera familia editable de escenas Three.js y 40 renders transparentes Día/Noche: cuatro pórticos, cuatro vigas, cuatro voladizos, cuatro armaduras y cuatro losas. El pórtico principal se elige de forma estable por sesión y las plantillas usan las nuevas imágenes 3D con SVG únicamente como respaldo.

## Por qué

El usuario pidió un rediseño visual total guiado por sus referencias, con material mate, profundidad física y assets estructurales de mayor calidad. También pidió eliminar la placa/cuadrado decorativo detrás del pórtico: el modelo ahora se presenta directamente sobre la superficie del Home, sin fondo, halo, patrón ni contenedor visual adicional.

## Archivos tocados

- `src/features/welcome/WelcomeScreen.tsx` y `totalHome.css` — nueva arquitectura del Home y composición responsive Día/Noche.
- `src/features/welcome/homeSession.ts` — selección aleatoria estable del pórtico principal durante la sesión.
- `src/features/project-hub/ProjectHub.tsx` y `Phase2ProjectHub.tsx` — integración del Hub real dentro de la nueva navegación.
- `src/features/structural-assets/threePortalAssets.ts` — cuatro escenas editables de pórticos.
- `src/features/structural-assets/threeFamilyAssets.ts` — escenas editables de vigas, voladizos, armaduras y losas.
- `src/features/structural-assets/threeStructuralRender.ts` — render transparente y encuadre ortográfico calculado desde límites reales.
- `src/features/structural-assets/ThreeStructuralImage.tsx` — carga de prerenders Día/Noche con fallback SVG.
- `public/assets/structural/` — 40 PNG transparentes generados para uso rápido en producto.
- `scripts/generate-three-portal-assets.mjs` — regeneración determinista de los renders desde las escenas Three.js.
- `scripts/qa-total-home-redesign.mjs` y `scripts/qa-structural-assets.mjs` — QA visual y responsive automatizada.
- `reports/evidence/2026-08-22-total-home-redesign/` — capturas de escritorio, tablet y móvil.
- `reports/evidence/2026-08-22-structural-assets/` — evidencia del atlas de assets.

## Cómo verificar

```powershell
npm.cmd run typecheck
npm.cmd test -- src/features/welcome/WelcomeScreen.test.tsx src/features/welcome/totalRedesignHome.test.tsx src/features/structural-assets/ThreeStructuralImage.test.tsx src/features/structural-assets/threePortalAssets.test.ts src/features/structural-assets/threeFamilyAssets.test.ts src/features/structural-assets/threeStructuralRender.test.ts
npm.cmd run build
node scripts/qa-total-home-redesign.mjs
```

Resultado actual: tipado correcto, pruebas focales correctas, build de producción correcto y `Home redesign QA PASS` en cuatro capturas. El aviso de chunks mayores a 500 kB continúa siendo un warning de Vite y no un fallo de compilación.

## Pendiente / siguiente paso

Completar las familias 3D restantes (marcos espaciales, apoyos, cargas, secciones y conexiones), integrarlas en Proyectos y Plantillas, y continuar el rediseño total del Workspace. No se tocó motor estructural, solver, signos, unidades, topología, persistencia, import/export ni formatos.
