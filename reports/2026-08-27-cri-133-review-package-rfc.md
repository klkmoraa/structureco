# CRI-133 — RFC de paquete de revisión

Se preparó el RFC propuesto de paquete de revisión local-first. Distingue integridad de identidad, mantiene el payload portable como fuente única, exige preview read-only y conserva explícitamente el rechazo temprano de archivos hostiles.

No se implementó un formato ni una pantalla v2: la RFC deja esos cambios bloqueados hasta aprobación de producto y seguridad, incluidas firma de identidad, notas potencialmente personales y semántica de expiración.

Validación del estado existente: `portable.test.ts`, `portableSecurity.test.ts`, `portableImportAdapter.test.ts` y `portableExportAnalysis.test.ts` — 31 pruebas aprobadas. El entorno emitió avisos conocidos de PDF.js sobre `standardFontDataUrl`; las pruebas de PDF finalizaron correctamente.

Evidencia: `docs/architecture/structureco-review-package-rfc.md`.
