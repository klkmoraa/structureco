# Cinco mejoras grandes para cerrar el ciclo de revisión

## Resultado

Se aplicaron cinco mejoras coordinadas sobre la experiencia de Studio. La capa visual no modifica solver, unidades, signos, IDs, topología, `ProjectModel`, persistencia, import/export ni undo/redo.

1. **Baliza de salud del modelo.** El canvas expone el estado de Model Doctor y la fiabilidad numérica en un control persistente que abre el diagnóstico existente.
2. **Modos de foco del canvas.** Modelo, Cargas, Resultados y Revisión aplican presets completos de capas; Resultados/Revisión aterrizan en un diagrama visible cuando hacía falta.
3. **Navegador de escenarios.** La comparación deja de esconder fallos: filtra todos/utilizables/fallidos, muestra estado y extremos N/V/M y permite activar una combinación.
4. **Explorador de sensibilidad.** Un worker local analiza copias efímeras con E/A/I en ±10 %, reporta cambios relativos y deja explícito que el modelo fuente no se muta.
5. **Tablero de preparación para revisión.** Modelo, análisis, cobertura y certificado numérico se resumen como evidencia accionable, con enlaces a Model Doctor/comparación y sin presentarlo como certificación de seguridad o norma.

## Verificación

- Pruebas focalizadas: 14 archivos y 56 pruebas; además, `App`, reconciliación Clay y modos de foco: 3 archivos y 72 pruebas.
- Suite completa: `341` archivos, `2,855` pruebas, `5` omitidas; todo pasa.
- `typecheck`, `build`, `lint`, `verify:styles`, `verify:i18n`, `verify:docs`, `verify:protected` y `verify:i18n-entry`: todos pasan. El lint conserva únicamente advertencias preexistentes y las advertencias normales de workers/chunks.
- Revisión visual puntual con Chromium empaquetado: desktop `1440×900` y mobile `390×844`. En ambos casos se verificaron cero overflow horizontal, cuatro filas de escenarios, tres puntos de sensibilidad y activación de Revisión; se conservaron capturas fuera del repositorio.
- La comprobación manual en la app confirmó la baliza de salud, la tira de foco, el mapa de demanda y el cambio automático a Momento en Revisión.
- `qa:results-cards` no se usa como gate de esta entrega: sus comprobaciones visuales nuevas pasan, pero el script histórico aún falla en cuatro aserciones de retorno de foco y termina con el selector antiguo `.sc-home-topline select`. No se modificó ese flujo ajeno.

## Publicación

Se integrará el cambio en `main` y se verificará por separado el SHA remoto de `main`, el estado de `gh-pages` y el workflow de GitHub Pages, sin force push. El SHA final y el estado de Pages se añadirán al cerrar la publicación.
