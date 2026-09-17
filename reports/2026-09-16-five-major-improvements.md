# Cinco mejoras grandes de producto

## Resultado

Se aplicaron cinco mejoras coordinadas en la capa visual y de flujo, manteniendo intactos el solver, las unidades, los signos, los IDs, la topología, `ProjectModel`, workers, persistencia de proyectos, import/export y undo/redo.

1. **Inicio con puntos de partida reales.** La portada ahora ofrece Viga simplemente apoyada, Pórtico de ejemplo y Armadura triangular con acceso directo al editor, además de un rail de “siguiente movimiento” derivado del estado real del modelo.
2. **Biblioteca de proyectos operable.** Proyectos incorpora búsqueda por nombre, orden por actualización/nombre/tamaño y contador de resultados; el filtrado es tolerante a mayúsculas y acentos.
3. **Paleta de comandos con memoria.** Los cinco últimos comandos de la paleta se guardan como preferencia local de interfaz, se deduplican y se muestran como accesos rápidos al reabrirla. La selección de nudos y barras no se persiste como historial.
4. **Lectura rápida de resultados.** El panel de resultados muestra escenario, fiabilidad y extremo gobernante antes del detalle, con acción para localizarlo en el modelo; reutiliza la respuesta analítica existente y funciona en escritorio y móvil.
5. **Responsive y acabado visual.** Los nuevos rails, controles de biblioteca, historial y banda de resultados siguen la dirección Studio, con estados de foco, acciones táctiles y composición de una columna en móvil.

## Verificación

- `pnpm run test:changed -- src/features/project-hub/ProjectHub.test.tsx src/features/project-hub/projectLibraryView.test.ts src/features/welcome/WelcomeScreen.test.tsx src/features/results/ResultsPanel.test.tsx src/features/workspace/commandHistory.test.ts` — **47/47**.
- `pnpm run typecheck` — correcto.
- `pnpm run build` — correcto; Vite generó `dist/`.
- `pnpm run lint` — código de salida 0; permanecen advertencias existentes de React Compiler/lint en otras áreas del repositorio.
- `pnpm run verify:styles` — correcto.
- `pnpm run verify:i18n` — correcto.
- `pnpm run verify:protected` — frontera protegida intacta, 55 archivos.
- Revisión visual puntual con Playwright en Inicio, Proyectos, paleta con historial, resultados y viewport móvil 390×844.

No se ejecutó la suite completa ni el gate global; el cambio quedó validado con las pruebas y contratos directamente afectados, según el acuerdo de trabajo.

## Publicación

El cambio se publica en `main` y se verifica la actualización de GitHub Pages después del push, sin force push.
