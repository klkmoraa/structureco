# CRI-140 - recuperación ante conflicto multi-pestaña

## Alcance entregado

- El Project Hub compara la versión guardada y la edición recuperada con hora, conteos de nudos, barras y cargas, caso activo y el estado honesto de resultados no persistidos.
- Si una recuperación de conflicto contiene más entidades que la tarjeta guardada, la tarjeta ambigua queda oculta: no se presenta un 0/0 como la revisión canónica.
- La recuperación ofrece vista previa de solo lectura, duplicación de ambas revisiones, descarte confirmado y restauración segura.
- Restaurar crea primero una recuperación manual de la versión guardada; no hay sobrescritura silenciosa.

## Validación

- `npm test -- src/storage/projectRepository.test.ts src/features/project-hub/ProjectHub.test.tsx` - 12 pruebas aprobadas.
- `npx tsc --noEmit --pretty false` - aprobado.
- `npm run lint` - aprobado con advertencias preexistentes fuera del alcance.
- `npx vite build` - aprobado; conserva la advertencia preexistente de chunks grandes.
- Recorrido real en dos pestañas: una renombró la revisión guardada y la otra produjo el conflicto. La mesa quedó bloqueada y Home mostró el resolvedor con la previsualización sin escritura, sin errores de consola.

## Límites

No se modificaron solver, unidades, signos, topología, `ProjectModel`, resultados ni formatos de importación/exportación. El estado de análisis se declara como no persistido porque no se inventa una nueva fuente de verdad para resultados.
