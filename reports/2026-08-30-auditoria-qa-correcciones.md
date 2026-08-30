# Correcciones de la auditoría QA de StructureCo

Fecha: 2026-08-30
Fuente: `Auditoria_StructureCo_QA_5_problemas_con_imagenes.pdf`
Base revisada: `b765f76` (`main` = `origin/main` al iniciar el trabajo)

## Alcance

Se corrigieron los hallazgos B-01 a B-07 del PDF y las recomendaciones de presentación directamente relacionadas con ellos:

- **B-01 — posición de carga puntual:** `position` se conserva en la ficha del inspector y en la hoja de datos; la tabla y las tarjetas muestran `x/L` con el valor exacto.
- **B-02 — ajustar modelo a la vista:** la cámara valida límites, dimensiones, escala y coordenadas finitas, con un encuadre seguro para modelos diagonales, nodos múltiples y entradas inválidas.
- **B-03 — advertencias falsas:** el estado superior usa el total real de Model Doctor y deja de mostrar atención cuando el informe no tiene hallazgos.
- **B-04 — cambio de proyecto/unidades:** abrir o crear otro proyecto limpia resultados, pestañas, selección, herramienta activa y superficies dependientes del proyecto anterior.
- **B-05 — resultados obsoletos tras undo:** un resultado sólo se recupera al volver exactamente al mismo proyecto, firma de análisis y combinación; editar o rehacer vuelve a marcarlo como obsoleto.
- **B-06 — cancelar generador:** cerrar el generador devuelve explícitamente la herramienta a Seleccionar.
- **B-07 — sección manual/catalogada:** se distingue el origen de la sección y una sección manual, importada o heredada ya no adopta visualmente una identidad de catálogo antigua.
- **Apoyos y presentación:** colocar un apoyo abre una selección explícita con tipo, rodillo orientable y cancelación; resultados mejoran ceros numéricos, lectura de restricciones, escala deformada y selección de etiquetas.

La capa modificada sigue siendo de interacción, estado y presentación. No se cambiaron solver, unidades de cálculo, signos, IDs, topología, `ProjectModel`, workers, persistencia, import/export ni los contratos de resultados.

## Verificación

- `npm.cmd test`: **306 archivos**, **2656 pruebas aprobadas**, **5 omitidas**.
- Suite enfocada de las áreas tocadas: **18 archivos**, **242 pruebas aprobadas**.
- `npm.cmd run build`: aprobado.
- `npm.cmd run typecheck`: aprobado.
- `npm.cmd run lint`: aprobado; queda un warning previo de `react(only-export-components)` en `CanvasDiagramStack.tsx`.
- `npm.cmd run verify:styles`: aprobado.
- `npm.cmd run verify:i18n`: aprobado.
- Browser QA local: escritorio `1440×900` y móvil `390×844`; cero overflow horizontal, modelo visible tras ajustar cámara, paneles de resultados/reacciones operativos y cero errores de consola.

## Límite de la validación

La revisión humana en dispositivos físicos, lectores de pantalla y navegadores distintos del navegador integrado queda como QA complementaria. No se publicó `gh-pages`; esta entrega está limitada a la rama y al PR solicitados.
