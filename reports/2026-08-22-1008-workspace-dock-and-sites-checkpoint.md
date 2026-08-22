# Workspace móvil más claro y dock configurable

**Fecha:** 2026-08-22 10:08
**Agente:** Codex
**Rama:** codex/clay-workspace-phase-2

## Qué cambió

Se retiró la barra flotante de edición del canvas y se llevaron las acciones contextuales al Inspector. El Inspector móvil inicia cerrado, usa un tirador compacto para cambiar de altura y tiene un cierre explícito.

El launcher de “Paneles de trabajo” ya no deja acciones duplicadas en el dock: conserva las superficies existentes, evita el texto recortado en el dock compacto y ofrece “Cerrar paneles”. El dock X2 puede colocarse abajo o a la izquierda, y la elección queda guardada localmente. Compacto y Expandido reducen el espacio vacío del área de resultados sin cambiar valores ni geometría.

También se corrigieron las rutas de los assets Three.js para funcionar bajo `/app/`. El build contiene 80 PNG transparentes estructurales —40 de Día y 40 de Noche— con las mismas rutas en ambos temas.

## Por qué

El usuario reportó que “Paneles de trabajo” era confuso, que no podía cerrarse de forma evidente, que los modos Compacto/Expandido tenían espacio inutilizable y que el dock obstruía el lienzo. El cambio mantiene el motor, los comandos, la selección, undo/redo, persistencia y resultados intactos.

## Archivos tocados

- `src/features/canvas/StructuralCanvas.tsx` — retira la barra contextual flotante sin eliminar las rutas de comandos.
- `src/features/canvas/ToolRail.tsx` — agrupa superficies, añade cierre explícito y alternancia del dock abajo/izquierda.
- `src/features/inspector/Inspector.tsx` y `src/features/inspector/InspectorProperties.tsx` — presenta el Inspector móvil cerrado por defecto y las acciones Editar/Eliminar en contexto.
- `src/features/workspace/useWorkspaceLayoutPreferences.ts` — persiste `toolDockPosition` y migra la preferencia del Inspector.
- `src/features/workspace/AppShellLayout.tsx`, `src/features/workspace/WorkspaceShell.tsx` y `src/features/workspace/phase1.css` — conecta la posición del dock, el cierre y la densidad responsive.
- `src/styles.css` — reduce espacio muerto en Compacto/Expandido y organiza las acciones del Inspector.
- `src/features/structural-assets/ThreeStructuralImage.tsx` — resuelve URLs con `BASE_URL` para `/app/`.
- `src/i18n/catalogs.ts` — incorpora etiquetas de cierre y posición del dock en español e inglés.
- `src/features/**.test.tsx` — actualiza los contratos de interacción y cubre el dock y el cierre de Paneles.
- `docs/README.md`, `docs/superpowers/plans/2026-08-22-sites-assets-mobile-inspector.md` y el plan/spec de rediseño total — documentan el alcance y su clasificación.

## Cómo verificar

- `npm.cmd test -- src/features/canvas/StructuralCanvas.structuralEditing.test.tsx src/features/canvas/ToolRail.test.tsx --run` — 27/27 en la ejecución focal; la ejecución posterior de `ToolRail.test.tsx` quedó en 17/17 tras cubrir el cierre explícito.
- `npm.cmd test -- src/features/results/ResultsPanel.test.tsx src/features/results/DenseResultsSurface.test.tsx --run` — 26 aprobadas, 3 omitidas por el propio archivo.
- Focales anteriores de Inspector, preferencias, acciones contextuales y assets — 49 aprobadas.
- `npm.cmd run typecheck` — PASS.
- `npm.cmd run lint` — PASS con advertencias preexistentes.
- `npm.cmd run verify:docs` — PASS; 46 documentos clasificados.
- `npm.cmd run verify:structural-assets` — PASS; 80 PNG, 40 Día + 40 Noche, 900×600 y transparencia validada.
- `npm.cmd run verify:protected` — PASS; 38 archivos protegidos.
- `npm.cmd run build` — PASS.
- El build del wrapper de Sites — PASS; el paquete contiene `dist/server/index.js`, `dist/.openai/hosting.json` y 80 assets bajo `dist/client/app/assets/structural/**`.

## Pendiente / siguiente paso

El wrapper de Sites quedó preparado localmente en el commit `a5643aa` y el paquete validado está listo, pero el conector rechazó guardar la versión porque exige que ese commit sea el HEAD remoto de la rama `main`. Además, el Site existente reporta una discrepancia: la política sólo lista al usuario propietario, pero el modo aparece como `public`.

No se hizo push a GitHub ni se cambió la visibilidad del Site. Falta autorización explícita para subir el commit del wrapper y decidir si se publica con el acceso público registrado o se corrige primero a propietario únicamente. El test heredado `structureco-sites/tests/rendered-html.test.mjs` sigue esperando el skeleton inicial que ya no existe; el build real sí termina correctamente.
