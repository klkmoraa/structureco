# Sites assets y superficies móviles — Implementation Plan

**Clasificación:** `AUDIT/TEMPORARY`

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Hacer que la publicación de Sites cargue los assets 3D renderizados con Three.js y que el Workspace móvil no muestre paneles ni acciones intrusivas por defecto.

**Architecture:** La portada seguirá usando imágenes PNG transparentes producidas por el renderer Three.js, pero sus URLs se resolverán con la base pública de Vite para funcionar tanto en `/` como en `/app/`. El Inspector conservará el broker de superficies existente; sólo cambiará su intención inicial y el comportamiento de presentación móvil. Las acciones de edición se renderizarán dentro del Inspector, sin duplicar comandos ni tocar el modelo.

**Tech Stack:** React, TypeScript, Vite, Vitest, CSS responsive, Sites wrapper.

**Spec:** Plan adjunto del usuario `codex-plan-305A534E-7B1E-4E33-87B9-B5A28638E5FA.md`, secciones 2, 5, 8 y 9.

## Global Constraints

- No tocar solver, cálculos, signos, unidades, topología, persistencia, formatos, comandos, undo/redo ni resultados.
- Preservar `reports/evidence/2026-08-21-clay-mobile-density-phase-5/full-test.log`, archivo ajeno sin seguimiento.
- No incluir tokens, credenciales ni datos privados en código o reportes.
- No hacer `git push` sin confirmación explícita.

### Task 1: Asset URLs compatibles con Sites

**Files:**
- Modify: `src/features/structural-assets/ThreeStructuralImage.tsx`
- Test: `src/features/structural-assets/ThreeStructuralImage.test.tsx`

- [x] Añadir una resolución de URL basada en `import.meta.env.BASE_URL`, conservando una sola barra entre base, familia y variante.
- [x] Mantener el fallback SVG sólo para errores reales de carga y añadir prueba para base `/app/`.
- [x] Ejecutar la prueba focal y el contrato de assets.

### Task 2: Inspector móvil no residente

**Files:**
- Modify: `src/features/workspace/useWorkspaceLayoutPreferences.ts`
- Modify: `src/features/workspace/WorkspaceShell.tsx`
- Modify: `src/features/inspector/Inspector.tsx`
- Test: `src/features/workspace/useWorkspaceLayoutPreferences.test.tsx`
- Test: `src/features/inspector/Inspector.test.tsx`

- [x] Cambiar el valor inicial móvil a cerrado y no forzar apertura por selección.
- [x] Sustituir el grupo visible `Compacta / Media / Casi completa` por un tirador etiquetado y un control de cierre; conservar los detents como estado accesible para gesto/teclado.
- [x] Ajustar los detents al contrato de 35/55/85% sin alterar superficies de escritorio.
- [x] Cubrir inicio cerrado, apertura explícita y cierre.

### Task 3: Acciones de selección dentro del Inspector

**Files:**
- Modify: `src/features/canvas/StructuralCanvas.tsx`
- Modify: `src/features/canvas/ContextualActions.tsx` o su integración de superficie
- Modify: `src/features/inspector/Inspector.tsx`
- Test: `src/features/canvas/StructuralCanvas.contextualActions.test.tsx`
- Test: `src/features/inspector/Inspector.test.tsx`

- [x] Dejar el canvas sólo con selección y resaltado cuando exista una selección.
- [x] Exponer Editar y Eliminar en el Inspector contextual, con Eliminar al final y confirmación existente.
- [x] Retirar la barra flotante `Editar selección / Borrar / …` del canvas.
- [x] Conservar rutas de teclado, comandos y undo/redo.

### Task 4: Dock y densidad de resultados

**Files:**
- Modify: `src/features/workspace/useWorkspaceLayoutPreferences.ts`
- Modify: `src/features/workspace/AppShellLayout.tsx`
- Modify: `src/features/workspace/WorkspaceShell.tsx`
- Modify: `src/features/canvas/ToolRail.tsx`
- Modify: `src/features/workspace/phase1.css`
- Modify: `src/styles.css`
- Test: `src/features/canvas/ToolRail.test.tsx`
- Test: `src/features/workspace/useWorkspaceLayoutPreferences.test.tsx`

- [x] Mantener la posición del dock entre abajo e izquierda en X2, con una acción visible y etiquetada para cambiarla.
- [x] Hacer que el launcher de superficies tenga una acción explícita para cerrar el menú y no deje el texto recortado en el dock compacto.
- [x] Reducir el espacio muerto de Compacto y Expandido sin alterar los datos ni la geometría de los resultados.
- [x] Mantener el dock lateral de M1/K0 y el dock inferior seguro para móvil.

### Task 5: Verificación y entrega

**Files:**
- Create: `reports/YYYY-MM-DD-HHmm-sites-assets-mobile-inspector.md`

- [x] Ejecutar typecheck, lint, pruebas focales, build y `verify:structural-assets`.
- [x] Verificar que el paquete de Sites contiene `/app/assets/structural/**`.
- [x] Commitear código y reporte en commits consecutivos; dejar explícito que no se hizo push.
