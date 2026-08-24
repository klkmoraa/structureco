# Model Doctor, Results y dock — 2026-08-23

## Alcance entregado

- Model Doctor ya no muestra avisos al abrir, crear, importar o editar un proyecto. Un aviso de hallazgos sólo se habilita tras una intención explícita de **Analizar** y sólo al terminar esa ejecución.
- Results salió de los paneles del dock. Tiene un control persistente en la barra superior que abre/cierra la superficie mediante el broker y conserva el retorno de foco. En Compact se mantiene fuera del dock, dentro del menú de utilidades de la barra para no comprimir los controles táctiles.
- El dock izquierdo vuelve a ser un riel vertical estrecho: Results y acciones contextuales ya no le aplican reglas de `bottom`; los grupos se apilan, conserva scroll interno y queda separado de la barra superior.
- `qa:model-doctor` ahora acota sus cuatro esperas de foco a 15 s e informa etapa, foco activo y diálogos si falla, en vez de quedar bloqueado sin salida.

## Verificación focal

- `npx.cmd vitest run … -t "only announces|opens and closes Compact|opens Results from its own|keeps setup and view|Analyze records" --maxWorkers=1 --pool=forks --no-file-parallelism --no-cache` — 5 pruebas pasaron.
- `npm.cmd run build` — pasó.
- `node scripts/qa-model-doctor.mjs` — pasó completo.
- `node scripts/qa-shell-composition.mjs --dock-left-only` — pasó: 54 px de ancho, 680 px de alto a 1440×900, sin overflow y con retorno de foco de Results.
- `npm.cmd run verify:protected` — frontera protegida intacta (38 archivos).
- `npm.cmd run lint` — salida 0; conserva cinco advertencias preexistentes de Fast Refresh fuera de este alcance.

## Límites respetados

No se modificaron solver, unidades, signos, topología, `ProjectModel`, workers, persistencia, importación/exportación, historial ni resultados numéricos.
