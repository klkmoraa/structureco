# Extracción de propietarios CSS

`src/styles.css` queda limitado a reset, raíz, accesibilidad, movimiento global y contratos compartidos del design system. Los bloques de producto se clasificaron y trasladaron sin cambiar declaraciones de dominio:

- Welcome → `features/welcome/totalHome.css`.
- TopBar → `features/topbar/topbar.css`.
- Workspace y composición del shell → `features/workspace/phase1.css`.
- Canvas y sus capas/chrome → `features/canvas/phase2.css`.
- Inspector → `features/inspector/inspector.css`, cargado por `Inspector.tsx`.
- Results → `features/results/results.css`, cargado por `ResultsPanel.tsx`.

Las hojas locales se cargan desde entrypoints residentes de cada superficie; sus selectores permanecen encapsulados por propietario para que ningún override dependa del instante en que se resuelva otro componente lazy. Las definiciones ya locales se conservaron como última capa canónica dentro de su propio archivo.

Se añadió `verify:styles`, con presupuesto de 8 kB para la hoja global y una lista de familias de selectores de feature que no pueden regresar a ella.
