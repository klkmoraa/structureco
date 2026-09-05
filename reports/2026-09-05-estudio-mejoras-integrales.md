# Reporte de Mejoras Integrales — StructureCo Studio

**Fecha:** 2026-09-05  
**Autor:** Antigravity  
**Estado:** Completado y Verificado  

---

## 1. Resumen Ejecutivo

Se abordó una optimización cohesiva y multidimensional del entorno de StructureCo Studio, abarcando desde la resiliencia en la capa de persistencia y ejecución de pruebas, hasta la usabilidad y ergonomía de teclado para los usuarios de ingeniería, sin alterar en ningún momento el núcleo protegido del solver, unidades, signos ni topología.

---

## 2. Acciones Realizadas

### 2.1. Estabilización de la Suite de Pruebas (20 fallos a 0)
- **`src/space3d/runtime/workerClient.ts`**: Corrección de la detección de soporte de Web Workers en entornos de test (JSDOM / Node 20+ con `globalThis.Worker` pero sin runtime de navegador). Activa de forma transparente el worker inline (`createInlineSpace3DWorker`), estabilizando `Space3DProjectContext.test.tsx` (14/14) y `Space3DWorkspace.test.tsx` (30/30).
- **`src/storage/projectRepository.ts`**: Implementación de sellos de tiempo monótonos (`nextMonotonicIsoDate()`) para eliminar colisiones en guardados múltiples dentro del mismo milisegundo en `InMemoryProjectRepository` e `IndexedDbProjectRepository`. `ProjectHub.test.tsx` (9/9).
- **`src/features/structural-assets/studio/IllustrationStudio.tsx`**: Sincronización atómica de renombramiento de presets en memoria para evitar desfases con el `useRef` de foco en `useModalFocus`, y espera asíncrona de revocación de URLs de blobs en tests. `IllustrationStudio.test.tsx` (9/9).
- **`src/features/datasheet/DatasheetAccessibility.test.tsx`**: Sincronización explícita del elemento activo en JSDOM antes de secuenciar teclas de flechas, eliminando carreras de foco sintético en la grilla accesible. `DatasheetAccessibility.test.tsx` (15/15).

### 2.2. Política de Poda de Recuperaciones Automáticas (P5)
- Se acotó la acumulación infinita de copias de seguridad en IndexedDB y memoria a un máximo de 20 versiones automáticas por proyecto (`MAX_AUTO_RECOVERIES_PER_PROJECT = 20`).
- Las versiones manuales (`reason === 'version'`) se conservan indefinidamente como puntos de restauración sagrados del usuario.
- Pruebas unitarias dedicadas en `src/storage/projectRepository.test.ts`.

### 2.3. Cero Advertencias en Oxlint
- Extracción modular y desacoplada de `normalizeSearch` en `src/features/welcome/homeSearchUtils.ts`.
- Extracción limpia de `externalStackBottomReserve` en `src/features/canvas/diagramStackReserve.ts`.
- Resultado del linter: **0 advertencias y 0 errores** en 773 archivos.

### 2.4. Diálogo de Atajos de Teclado del Studio (`KeyboardShortcutsModal`)
- Modal accesible conforme a las directrices de diseño (`useModalFocus`, trap de foco, salida con `Esc`, soporte Day/Night `#F5F7F8` / `#101820`).
- Presentación agrupada y canónica:
  - **Herramientas y modelado**: Atajos sincronizados con `TOOL_REGISTRY` (V, H, N, M, S, P, D, O, C, X, B, ⌫), más F2 numérico y Esc.
  - **Espacio de trabajo y comandos**: `⌘/Ctrl+K` (paleta), `⌘/Ctrl+Z` (deshacer), `⌘/Ctrl+Y` (rehacer), `?` (atajos).
  - **Hoja de cálculo (Datasheet)**: Navegación por flechas, Enter/F2 de edición, Esc y copiado.
- Activación triple: tecla `?` (respetando inputs, textareas y celdas), menú de Utilidades de la barra superior (`TopBar`), y comando en `CommandPalette` (`Cmd+K`).
- Soporte i18n bidireccional (ES / EN) verificado con `check-i18n-usage.mjs` (2.246 claves alcanzables).
- Pruebas unitarias completas en `KeyboardShortcutsModal.test.tsx`.

### 2.5. Ratchet de Presupuesto de Rendimiento
- Verificación del empaquetado real con Rolldown / Vite:
  - Carga inicial: **1.350.929 bytes** (370.461 gzip), por debajo del límite ratcheted de 1.400.000 / 380.000 bytes.
  - El modal de atajos es diferido (lazy-loaded) en un chunk de solo 4.45 kB (0.79 kB gzip), evitando cualquier regresión en el primer pintado.

---

## 3. Estado de los Gates de Verificación

- `bun run lint`: Aprobado (0 errores, 0 advertencias).
- `bun run typecheck`: Aprobado (0 errores TS).
- `bun scripts/check-protected-baseline.mjs`: Aprobado (55 archivos protegidos intactos).
- `bun run verify:docs`: Aprobado (23 documentos clasificados y enlaces válidos).
- `bun run verify:i18n`: Aprobado (2.246 claves activas).
- `bun run verify:styles`: Aprobado (3.432 / 8.000 bytes).
- `bun run build`: Aprobado (compilación de producción en 775 ms).
- `bun run verify:perf`: Aprobado (carga inicial bajo presupuesto).
- Pruebas de integración y unitarias: 61 archivos de pruebas ejecutados, 634 pruebas aprobadas, 0 fallos.
