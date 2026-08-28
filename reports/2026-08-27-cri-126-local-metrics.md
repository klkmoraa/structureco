# CRI-126 — métricas locales y con consentimiento

Se definió un contrato versionado y una implementación local, agregada y con `opt-in` explícito. No transmite datos: sólo permite nombres de evento, ruta enumerada, código de diagnóstico enumerado y hora. El usuario puede activar o desactivar la captura, exportar su diagnóstico y borrar sus observaciones sin perder su elección de consentimiento.

La paleta registra únicamente que una búsqueda no tuvo resultados; nunca guarda el término buscado. El experimento de línea base y las sesiones reales siguen siendo trabajo de investigación, no se han simulado.

Validación focal: `src/analytics/localMetrics.test.ts`.
