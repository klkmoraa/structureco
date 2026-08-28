# Resultados en tarjetas y limpieza de guía invasiva

Se retiró la guía automática de primer análisis y su comando: las acciones que ofrecía siguen disponibles en sus superficies propias, sin ocupar el lienzo al abrir un proyecto vacío.

En Resultados, las tarjetas de extremos quedan siempre visibles en móvil. Se eliminaron la leyenda de «Puntos notables», el interruptor que ocultaba las tarjetas y el desplegable «Explicar este valor». Las curvas, puntos críticos calculados, cursor y acciones de localizar permanecen intactos; no se modificó el solver, unidades ni el modelo.

Validación focal: `ResultsPanel.test.tsx` (23), `DenseResultsSurface.test.tsx` (8), `CommandPalette.test.tsx` (13), `tsc --noEmit` y `npm run build` pasan. `qa:results-cards` compiló correctamente, pero su revisión visual Chromium no se pudo ejecutar porque no hay Chrome instalado en este equipo.
