# CRI-129 — diagnóstico y reparación segura

Model Doctor diferencia de forma explícita la ausencia total de apoyos de otros problemas de restricción. En vez de inventar apoyos, presenta una ruta con contexto, pasos y retorno al Doctor antes de abrir la herramienta de apoyos.

El flujo no modifica el modelo hasta que la persona elige y confirma la edición correspondiente; conserva foco y ofrece copia ES/EN.

Validación focal: `ModelDoctor.test.tsx`, `modelDoctorPresentation.test.ts`, `modelDoctorDiagnostics.test.ts` y `topologyRepairPreview.test.ts` — 55 pruebas aprobadas. Incluyen preview/cancel/foco, reparación de topología en una intención deshacible y la ruta no automática de apoyos.

Pendiente para cierre: ampliar la matriz de rutas contextuales y ejecutar los E2E completos de pórtico sin apoyos, modelo desconectado y propiedades inválidas. Los escenarios de diagnóstico se cubren por unidad; no se han presentado como validación de usuarios.
