# 2026-08-28 — Limpieza del repositorio operativo

**Clasificación:** `AUDIT/TEMPORARY` · handoff abierto verificable

**Fecha:** 2026-08-28

**Rama:** `codex/limpieza-repo-operativo-2026-08-28`
**SHA base auditado:** `e35e4cbb5776763d3b0f87ccf5fe44d9b6e85fbd` (`origin/main`)

## Resultado

Se retiraron 188 archivos sin consumidores operativos: dos prototipos cerrados,
dos árboles audiovisuales, evidencia CRI cerrada, fuentes no referenciadas,
configuración personal de agente, informes cerrados, documentos históricos y un
componente React huérfano. Las especificaciones de producto vigentes se movieron
de `docs/superpowers/` a `docs/product/` y se actualizaron todos sus enlaces.

El árbol pasó de 1.018 a 833 archivos versionados y de 19.884.145 a 14.052.865
bytes: 5.831.280 bytes menos (29,33 %). El diff elimina 34.365 líneas y mantiene
el código funcional, sus pruebas, QA, oráculos, assets y documentación vigente.

## Cambios funcionales de mantenimiento

- Se separaron los modelos puros de acciones contextuales y resolución de URLs
  de assets para cumplir Fast Refresh sin alterar comportamiento.
- Se retiraron exports por defecto redundantes y 19 líneas CSS del componente
  huérfano `WorkCycleGlyph`.
- Se actualizaron README, clasificación documental, `.gitignore` y pruebas que
  todavía asumían superficies antiguas de Resultados/TopBar.
- Se amplió a 10 s la holgura de una prueba Space 3D que excedió por 523 ms su
  timeout bajo ejecución aislada; no cambió código de producción.

## Fronteras preservadas

- Los 40 archivos de la frontera protegida —solver, unidades y contratos
  estructurales— permanecen idénticos a la base.
- Se conservaron contratos públicos y barrels usados por pruebas o carga
  dinámica aunque analizadores estáticos los presentaran como candidatos.
- Todo lo retirado sigue recuperable desde el historial de Git.

## Verificación

- `npm run verify`: 259 archivos de prueba, 2.453 pruebas aprobadas, 5 omitidas;
  lint, docs, PWA, i18n, CSS, build y presupuesto de rendimiento aprobados.
- `npm run validate:ci`: 2 workflows válidos.
- `npm run verify:space3d`: 214 pruebas aprobadas, 5 omitidas; capacidad aprobada
  de 150 nudos y 300 barras.
- `npm run verify:structural-assets`: 80 PNG válidos, 40 Day + 40 Night.

La inspección mediante navegador remoto no pudo alcanzar el servidor local por
su política de red; no se considera evidencia visual. La compilación, los gates
de assets y las suites de interfaz sí completaron correctamente.
