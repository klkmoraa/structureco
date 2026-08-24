# CRI-40 · Biblioteca personal

## Resultado

Se implementó una biblioteca personal local para materiales, secciones, pares material–sección y vistas. Home concentra el CRUD, búsqueda, filtros y Papelera; el Inspector guarda y aplica identidades estructurales; la superficie Vista guarda y aplica tema y preferencias visuales.

La biblioteca no es un catálogo normativo ni forma parte de `ProjectModel`. Guardar, renombrar, duplicar, borrar o restaurar un favorito no modifica proyectos existentes. La aplicación siempre requiere el botón explícito correspondiente.

## Contratos preservados

- Persistencia independiente y versionada: `structureCo.personal-library.v1`.
- Materiales y secciones estructurales guardan IDs de catálogo explícitos; no hay inferencia por floats, nombres ni tolerancias.
- Un par se aplica con un solo `selection.bulk.apply`, un punto de undo y el `sourceSnapshot` vigente.
- Una referencia retirada se conserva para poder mostrar el estado no disponible; no se aplica ni se sustituye silenciosamente.
- Las vistas usan `updateProjectView` y `WorkspaceUIContext.setTheme`; conservan análisis e historial estructural.
- El borrado es lógico y restaurar respeta conflictos de nombre.
- Fallar al escribir almacenamiento mantiene el estado anterior y no toca la clave del proyecto.
- No se añadieron dependencias ni se modificaron solver, workers, tipos de dominio, formatos, topología, import/export o resultados.

## Superficies

| Superficie | Responsabilidad |
|---|---|
| Home · Biblioteca | Crear, buscar, filtrar, renombrar, duplicar, borrar, abrir Papelera y restaurar. |
| Inspector · miembro | Guardar material/sección/par actual cuando su origen es `catalog`; aplicar un favorito por confirmación. |
| Inspector · Vista | Guardar tema + `CanvasViewSettings`; aplicar sin invalidar el análisis. |

## Evidencia ejecutada

| Gate | Resultado |
|---|---|
| Suite focal Vitest | PASS · 10 archivos, 119 pruebas. |
| `npm.cmd run typecheck` | PASS. |
| `npm.cmd run build` | PASS · 2644 módulos transformados. |
| `npm.cmd run qa:personal-library` | PASS · X2 1440×900, M1 1100×768 y K0 390×844. |
| Browser QA | 0 px de overflow en Home/Workspace; consola limpia; proyecto intacto al guardar; 2 favoritos persistidos; targets K0 ≥44 px. |
| `npm.cmd run verify:protected` | PASS · 38 archivos protegidos intactos. |
| `npm.cmd run verify:docs` | PASS · clasificaciones y enlaces válidos. |
| `npm.cmd run lint` | PASS con avisos históricos ajenos; el aviso nuevo de Fast Refresh se eliminó separando el constructor de comandos del componente. |
| `git diff --check` | PASS. |

El oracle genera capturas y `qa-summary.json` en `qa-artifacts/personal-library/`; son evidencia regenerable ignorada por Git.

## Alcance no realizado

- No se guardan cargas, apoyos, combinaciones, patrones ni propiedades numéricas personalizadas.
- No hay sincronización cloud, migración a IndexedDB ni inclusión en exportaciones de proyecto.
- No se inventó una versión de catálogo inexistente; cada favorito sí conserva unidades y fechas.
