# Task 3 — Illustration Studio

**Estado:** READY FOR RE-REVIEW
**Fecha:** 2026-08-22 03:57
**Rama:** `codex/clay-workspace-phase-2`

## Resultado

Se implementó un Studio de ilustraciones de superficie completa, abierto desde Ajustes de Home en escritorio y en el menú móvil. La edición y las exportaciones consumen una sola fábrica de escena: el mismo `THREE.Group` canónico, escalas, materiales de presentación y cámara ortográfica alimentan el preview WebGL, SVGRenderer y PNG offscreen.

Los 40 activos canónicos se presentan con nombres humanos en español o inglés. Los parámetros son: activo/topología, ancho/altura/profundidad 0.75–1.40 en pasos de 0.05, material, cámara, detalle y tema. Ningún parámetro escribe en el modelo estructural.

## Frontera de datos

- Key exclusiva: `structureCo.structural-asset-presets.v1`; payload `{ schemaVersion: 1, presets }`.
- Payload corrupto, inválido o futuro recupera biblioteca personal vacía.
- Nombres recortados, no vacíos y únicos sin distinguir mayúsculas.
- Los 40 presets de fábrica y sus parámetros están profundamente congelados.
- Crear, renombrar, duplicar, borrar y restaurar opera sólo sobre copias personales.
- Restaurar conserva el nombre personal y vuelve al activo/parámetros de fábrica.
- `structureCo.project`, ProjectModel, comandos, undo/redo, engine, workers, resultados, formatos y StructuralCanvas no fueron modificados.

## TDD

RED real archivado en `task-3-red.txt`: 4 archivos fallaron por los tres módulos ausentes y porque Home aún abría el placeholder/no ofrecía Ajustes móvil. Después de implementación: 4 archivos, 17/17 PASS. Campaña focal final: 18 archivos, 90/90 PASS.

## Export y escena

- SVG: Three `SVGRenderer`, escena/cámara común, 900×600, sin fondo ni rectángulo decorativo.
- PNG: canvas offscreen transparente, logical 900×600 y exactos 900×600, 1800×1200 y 3600×2400 a 1×/2×/4×; alfa de esquina 0 verificado en Chromium.
- Preview sano: WebGL Three.js real, mate, iluminado, sin plano de sombra ni fondo exportable; fallback SVG sólo en ausencia/error WebGL.
- Día/Noche conserva colores técnicos; Night tematiza también shell, texto, bordes, controles y superficies.

## Accesibilidad y responsive

- Dialog modal con foco inicial en Cerrar, Escape y retorno al launcher.
- Todos los controles alcanzables por teclado/touch y targets visibles de al menos 44×44 px.
- Rails horizontales de familias/activos y una única sección de parámetros activa en móvil.
- Sin navegación inferior persistente, sin overflow horizontal y con reduced motion.

## Verificación

- RED: fallo contractual registrado.
- GREEN focal: 17/17 PASS.
- Focal completo structural-assets + welcome: 18 archivos, 90/90 PASS.
- Timeout de `threeStructuralRender.test.ts` sólo durante una campaña paralela con build/typecheck; aislado pasó 3/3 y la repetición serial completa pasó 90/90 sin cambiar timeouts.
- `npm.cmd run typecheck`: PASS.
- `npm.cmd run lint`: exit 0; 13 warnings preexistentes fuera del diff.
- `npm.cmd run verify:protected`: 38/38 intactos.
- `npm.cmd run build`: PASS; warning conocido de chunk >500 kB.
- Chromium QA: PASS, 4 capturas (1440×900 y 390×844, Day/Night), WebGL real, consola limpia, cero overflow, targets, contraste, aislamiento de storage y exportes.
- WebKit QA: PASS con las mismas 4 composiciones y aserciones.

## Evidencia

`reports/evidence/2026-08-22-illustration-studio/` contiene capturas Day/Night Desktop/Mobile para Chromium y WebKit, `qa-summary.json` y `qa-summary-webkit.json`.

## Concerns

Sólo permanecen 13 warnings de lint preexistentes y el warning conocido de tamaño de chunk. No se hizo push.

## Fix round 1 — revisión independiente

La primera revisión independiente detectó 1 hallazgo crítico y 18 importantes. La ronda se corrigió con pruebas de regresión antes de tocar implementación:

- móvil conserva selector, renombrar, duplicar, restaurar y borrar presets;
- preview, SVG y PNG comparten cámara y encuadre 3:2;
- el modal contiene el foco, bloquea la superficie de Home y devuelve el foco a un launcher montado;
- renombrar ya no recorta cada pulsación y los errores de nombre/storage/export aparecen en la interfaz;
- cambiar o restaurar diseños conserva Día/Noche;
- payloads futuros no se reescriben al montar, e IDs vacíos/duplicados se rechazan;
- exportar limpia renderer/canvas incluso al fallar y revoca la URL temporal del SVG;
- los materiales de presentación no recolorean acentos técnicos;
- Night eleva contraste de texto/bordes y el QA mide todos los controles y textos clave;
- labels de canvas/familias están en español;
- las pruebas comprueban encuadre, colores técnicos y ciclo móvil completo de presets;
- Chromium y WebKit regeneraron ocho capturas con WebGL real, cero overflow, cero targets pequeños, cero fallos de contraste y consola limpia;
- PNG 1×/2×/4× conserva alfa transparente real y SVG verifica composición, dimensiones y ausencia de fondo decorativo.

Evidencia fresca del controlador: 4 archivos / 31 pruebas PASS, typecheck PASS, lint exit 0 con warnings preexistentes, frontera protegida 38/38 y `git diff --check` PASS. El estado queda listo para la segunda revisión independiente; no se hizo push.
