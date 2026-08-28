# Métricas de producto locales

**Clasificación:** `CANONICAL`

## Propósito y límites

Este contrato mide el recorrido hasta el primer resultado entendido sin enviar
datos fuera del dispositivo. No se recopila geometría, cargas, propiedades,
valores de resultado, nombres de proyecto, identificadores persistentes ni PII.

La captura está desactivada por defecto. Al activarla, los eventos permanecen en
`localStorage` bajo una clave propia, se muestran sólo en el panel local y se
pueden exportar mediante una acción explícita de la persona usuaria.

## Esquema v1

Cada evento contiene únicamente:

```ts
{ version: 1, name: LocalMetricName, at: string, route?: LocalMetricRoute, code?: string }
```

`at` es la hora local ISO; no es un identificador de persona. `code` sólo se
admite para códigos enumerados de diagnósticos o blockers ya existentes. Nunca
almacena mensajes, texto de búsqueda, nombres ni contenido del modelo.

## Eventos permitidos

- Entradas: `start_blank`, `start_template`, `start_aula`, `canvas_ready`.
- Reparación: `doctor_opened`, `doctor_issue_actioned`,
  `doctor_action_started`, `doctor_action_completed`.
- Resultados: `analysis_started`, `results_drawer_expanded`,
  `first_result_understood`, `result_view_opened`, `value_located`,
  `diagram_label_mode`.
- Confianza: `conflict_detected`, `recovery_opened`, `recovery_decision`,
  `recovery_abandoned`.
- Descubrimiento: `command_search_empty` (sin texto de búsqueda),
  `inspector_layout_changed`, `bridge_2d_3d_blocker_seen`,
  `bridge_2d_3d_blocker_completed`.

## Métricas derivadas

- Activación por ruta: una entrada seguida por `analysis_started`.
- Tiempo al primer resultado: diferencia entre entrada y
  `first_result_understood`.
- Abandono del diagnóstico: `doctor_opened` sin acción posterior.
- Tasa de corrección: `doctor_action_completed` / `doctor_action_started`.
- Calidad de recuperación: decisiones y abandonos, sin guardar contenido de
  las revisiones.

## Invariantes del panel

El panel local muestra la revisión activa, recuperaciones pendientes y la
coherencia de conteos de tarjeta/snapshot como indicadores booleanos. No
serializa ninguna entidad estructural ni resultados para calcularlos.

## Decisión experimental

La instrumentación sólo se mantiene si compara las rutas `start_blank`,
`start_template` y `start_aula` con consentimiento local explícito y permite
detectar una reducción de abandono sin degradar los guardrails de recuperación.
