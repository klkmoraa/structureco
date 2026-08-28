# RFC — paquete de revisión local-first

**Clasificación:** `REFERENCE`
**Estado:** preparado para aprobación de producto y seguridad; no autoriza implementación.
**Issue:** CRI-133

## Decisión solicitada

Definir un perfil de expediente para revisión humana que permita identificar, sin ejecutar un cálculo, qué proyecto, corrida, unidades, supuestos y cambios recibió una persona revisora. El perfil debe conservar el comportamiento local-first: no sube datos, no crea cuentas, no comparte por defecto y no requiere backend.

Esta RFC no aprueba un formato v2 ni una pantalla nueva. La implementación queda bloqueada hasta que producto y seguridad acepten el contrato y la política de firma.

## Hechos actuales

El expediente v1 ya contiene un snapshot de `ProjectModel`, `AnalysisResult`, metadatos de unidades, caso, calidad numérica, versión de app/esquema y un checksum SHA-256 sobre una serialización canónica. El bundle `.structureco` contiene `manifest.json`, `portable/payload.json`, `project.json`, `analysis/result.json` y una memoria PDF; al leerlo se comparan payload, manifest y copias separadas.

El lector actual rechaza tamaño excesivo antes de cargar bytes, traversal, rutas absolutas, entradas duplicadas, compresión sospechosa, archivos incompletos y versiones de formato no compatibles. Los límites vigentes son 40 MB para el bundle, 32 entradas, 64 MB por entrada expandida y 128 MB expandido total. PDF reimportable y `.structureco` son editables después de la importación actual; no existe un modo de revisión read-only ni una firma de identidad.

## Objetivos

- Mostrar una vista previa antes de abrir o importar: identidad de paquete, versión, fecha, tamaño, unidades, caso/combinación, freshness, calidad numérica, supuestos y lista de contenidos.
- Separar cuatro propósitos sin duplicar datos: revisión humana (PDF), recuperación editable (`.structureco`/PDF reimportable), datos (CSV/JSON/BOM) y visual (SVG/PNG).
- Mantener una única autoridad para modelo, resultados y memoria PDF: el payload portable existente.
- Permitir que un revisor compare una revisión explícita cuando el emisor decidió incluirla, sin presentar inferencias causales.
- Conservar la importación como decisión explícita y ofrecer primero una apertura de sólo lectura.

## No objetivos

- Colaboración en tiempo real, cuentas, enlaces públicos, backend, telemetría del contenido o expiración impuesta remotamente.
- Certificación estructural, aprobación profesional, cifrado de destinatario o una garantía de identidad del emisor en v1.
- Convertir automáticamente un paquete en un proyecto editable, recalcular al abrir o inferir propiedades/cargas ausentes.
- Introducir una firma visible como si fuera una firma profesional o criptográfica sin una clave externa gestionada por la persona usuaria.

## Modelo de amenazas y controles

| Riesgo | Control actual | Decisión para el perfil de revisión |
| --- | --- | --- |
| Archivo alterado o corrupto | SHA-256 canónico, manifest y comparación de copias | Mostrar “integridad verificada” sólo si todas las comprobaciones pasan; nunca traducirlo como identidad del emisor. |
| Archivo creado maliciosamente con un checksum nuevo | La integridad puede recalcularse por cualquier persona | Declarar “sin identidad verificada”. Las firmas de identidad quedan fuera hasta resolver claves, revocación y UX de confianza. |
| ZIP bomb, traversal o consumo de memoria | Presupuestos y allowlist del lector | Mantener los límites como gate obligatorio antes de vista previa o importación. |
| Apertura accidental como editable | La importación actual puede aplicar el proyecto | Preview read-only por defecto; “Crear copia editable” es una segunda acción confirmada que nunca reemplaza el proyecto abierto. |
| Datos compartidos sin querer | Exportación/compartir se inicia desde una acción local | El hub muestra contenido, finalidad y reimportabilidad antes de exportar; no propone destinatarios ni transmisión. |
| Resultado no comparable o viejo | El comparador existente gatea por firma, escenario y fiabilidad | El paquete declara freshness y escenario; los deltas sólo aparecen si el mismo gate los marcó `comparable` o `qualified`. |
| Archivo futuro o perfil desconocido | El lector v1 rechaza formatos futuros | Rechazo explícito con metadatos mínimos, sin fallback de importación. |

## Perfil propuesto

El perfil se llama **review-package/v2** y sólo puede crearse a partir de un payload portable validado. No serializa objetos nuevos que dupliquen modelo o resultados: referencia digest y rutas de contenido.

```text
manifest.json
  profile: review-package
  profileVersion: 2
  payload: { path, sha256 }
  review: { revisionId?, comparisonState?, scenarioId, freshness, numericQuality }
  presentation: { units, locale, generatedAt, appVersion, projectSchemaVersion }
  contents: [{ path, mediaType, purpose, sha256, byteLength }]
  privacy: { transport: local-only, contains: [...] }
  expiry: { mode: none | advisory, expiresAt? }
```

Reglas normativas:

1. `payload.sha256` debe coincidir con el checksum del payload portable validado; cada contenido declarado se hashea sobre sus bytes exactos.
2. `revisionId` sólo puede ser el identificador de una captura inmutable de la comparación de revisiones; si no existe, se omite. No se fabrica una revisión al exportar.
3. `freshness` proviene de la misma firma de análisis usada por el comparador. Si no puede probarse, vale `unknown`, no `fresh`.
4. `expiry.mode: advisory` sólo informa a la persona revisora; no elimina, bloquea ni contacta a ningún servicio. El modo por defecto es `none`.
5. El lector trata cualquier HTML, SVG, PDF adjunto o nota como dato no confiable y no ejecuta scripts ni macros. La previsualización no usa URLs externas.
6. La apertura inicial es `read-only`. La copia editable requiere una confirmación nombrada y crea un proyecto nuevo.

## Compatibilidad y tamaño

El formato portable v1 seguirá siendo el núcleo de recuperación hasta que v2 tenga pruebas de compatibilidad. Un lector v2 puede entender un paquete v1 como `recovery`, pero no debe afirmar que es `review-package`. Un lector v1 debe rechazar v2 de manera explícita.

El presupuesto inicial no cambia los límites de lectura vigentes. Antes de adoptar v2 se definirá un presupuesto por contenido y se medirá con fixtures reales; si el PDF o los adjuntos lo superan, el exportador debe omitirlos con una declaración visible, nunca truncarlos silenciosamente.

## Flujo de interfaz propuesto

1. La paleta y el menú abren **Exportar y revisar**, no ejecutan una descarga directa.
2. La persona elige un preset y ve propósito, contenido, privacidad local, tamaño estimado, reimportabilidad y el caso/combinación actual.
3. Para revisión humana, la vista previa muestra el resumen ya visible de Results, sus supuestos y el identificador del payload; para recuperación, aclara que crea una copia editable al importar.
4. Al abrir un expediente, la revisión read-only muestra versión, integridad, escenario, unidades, freshness, calidad y diferencias disponibles. “Crear copia editable” permanece separado.

## Gates antes de implementar

- Aprobación explícita de producto y seguridad para la ausencia de firma de identidad y para la semántica de `expiry`.
- Decisión de si una nota de revisión puede contener datos personales y, si sí, política de redacción/exportación.
- Fixtures y pruebas de round-trip de v1/v2, tampering de manifest y de cada contenido, incompatibilidad futura, límites, ZIP bomb y apertura read-only.
- Golden files para PDF/SVG/PNG, más una revisión de navegador de la vista previa y de importación sin red.
- Prueba con revisores: identificar origen, versión, estado, escenario y procedencia en menos de dos minutos sin recalcular.

## Consecuencias

La propuesta concentra la salida sin crear una segunda memoria de cálculo y deja clara una limitación importante: checksum protege integridad, no autoría. El costo es que v2 requiere una UI de preview y fixtures adicionales; el beneficio es evitar que el producto presente un archivo local como colaboración segura o como firma profesional.

## Evidencia de código

- `src/utils/portablePayload.ts` — snapshot canónico y checksum SHA-256.
- `src/utils/portableBundle.ts` — manifest, bundle y validación cruzada de payload/proyecto/análisis.
- `src/utils/fileGuards.ts` — presupuestos y controles de archivo/ZIP.
- `src/features/import-export/PortableImportCenter.tsx` y `portableImportAdapter.ts` — entrada actual.
- `src/features/topbar/TopBar.tsx` y `src/features/workspace/commandRegistry.ts` — rutas de exportación actuales.
- `docs/architecture/structureco-revision-comparison-contract.md` — identidad, freshness y gate de comparabilidad.
