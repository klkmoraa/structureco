# Recuperación de cambios preparados de Work · 2026-08-26

## Alcance

Se recuperó el conjunto cohesivo de cambios que estaba preparado en `Work`:
se activó cobertura antes omitida de Resultados/Aula, se documentó la
recuperación tolerante de proyectos persistidos, se hizo desmontable e
idempotente el ciclo de vida de actualizaciones PWA y se ajustó el contrato de
mensajes y coincidencias exactas de la auditoría i18n.

El cambio no modifica el solver, unidades, signos, IDs, topología,
`ProjectModel`, workers, formatos de importación/exportación, undo/redo ni
resultados numéricos.

## Cambios recuperados

- `ResultsPanel.test.tsx` ya no conserva bloques `it.skip` y ejecuta los casos
  activos de Resultados/Aula incluidos en la recuperación.
- `projectStorage` explica el fallback que permite recuperar proyectos aunque
  falle la validación o migración de preferencias auxiliares, y el baseline de
  la frontera protegida refleja ese cambio deliberado.
- `pwaLifecycle` devuelve una función de limpieza, evita registrar más de un
  ciclo simultáneo y permite volver a inicializarlo después del desmontaje;
  `PwaUpdateNotice` ejecuta esa limpieza desde el efecto de React.
- La auditoría i18n conserva mensajes de diagnóstico precisos y aplica
  coincidencias exactas para evitar falsos positivos; sus pruebas fijan el
  contrato actualizado.

## Verificación

| Comprobación | Resultado |
| --- | --- |
| Pruebas focales de ResultsPanel, projectStorage, pwaLifecycle e i18n | PASS en la recuperación original |
| `typecheck` | PASS en la recuperación original |
| `lint` | PASS con advertencias preexistentes en la recuperación original |
| `build` | PASS en la recuperación original |
| `verify:pwa` | PASS en la recuperación original |
| `verify:i18n` | PASS en la recuperación original |
| Frontera protegida | PASS en la recuperación original |

## Estado abierto

La suite completa de la recuperación dejó diez fallos fuera de este alcance en
`App.test.tsx`, `TopBar.test.tsx` y `tokens.test.ts`; 256 archivos de prueba
pasaron. Este reporte no reclasifica esos fallos como resueltos. La publicación
de `main` y `gh-pages` queda fuera de este cambio y debe verificarse por
separado si se autoriza.
