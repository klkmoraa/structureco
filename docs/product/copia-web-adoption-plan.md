# Plan de adopción selectiva de Copia-web

**Clasificación:** `REFERENCE`

## Decisión

`structureco` sigue siendo el producto base. Este plan no traslada la apariencia ni sustituye su núcleo: conserva `ProjectModel`, solver, unidades, signos, topología, workers, persistencia, importación/exportación y undo/redo. Copia-web aporta contratos y flujos que se adoptarán sólo cuando pasen los gates de esta rama.

No es seguro entregar todo en un solo cambio. Versiones toca almacenamiento y recuperación; resultados y canvas tocan el broker responsive y foco; PDF, estudios y normas tienen riesgos independientes. Cada fase produce una entrega reversible y compatible con archivos existentes.

## Estado de partida verificado

- Principal local y `origin/main`: `0e37f06d5f76d1c0fec851cae9020697dca96f7e`.
- El gate `npm.cmd run verify` se detiene en `verify:i18n`: hay 14 claves declaradas sin consumidor. Lint, documentación, frontera protegida y las 17 pruebas del shell PWA pasaron antes de ese bloqueo.
- La auditoría compara ese mismo principal con Copia-web y sigue siendo útil como inventario. Las decisiones de este documento prevalecen sobre estimaciones de líneas o fechas de aquella auditoría; código, pruebas y gates actuales son la evidencia operativa.

## Selección de capacidades

| Tratamiento | Capacidades |
|---|---|
| Conservar | Concurrencia entre pestañas, recoveries, PWA versionada, guard de entrada 3D, broker de superficies y foco, resultados adaptativos, métricas locales y patrón NTC con bloqueos/procedencia. |
| Adoptar | `ErrorBoundary`, catálogo EN lazy con gate de entrada, preview PDF lazy, guardado nativo con fallback, versiones nombradas, tabs roving y evidencia numérica calibrada. |
| Adaptar | Reanudación como preferencia, canvas por capacidades, apertura de archivos de extremo a extremo, enlaces compartidos con confirmación, constructor de secciones y métodos clásicos como narrativa. |
| Combinar | Versiones con comparación result-aware; una taxonomía de resultados dentro del dock/drawer/fullscreen actual; splitting de Copia-web con gates de StructureCo. |
| Rehacer o bloquear | Apertura vía `launchQueue`/`file_handlers` hasta que complete todo el flujo; matemáticas PDF; AISC y Eurocode; CSS por capas/propiedad por feature. No se trasladan defaults normativos inventados ni el etiquetado de IA para un parser local. |

## Fases y gates

| Fase | Entrega acotada | Gate de salida |
|---|---|---|
| 0. Baseline | Resolver o justificar las 14 claves i18n, diagnosticar suite completa, fijar presupuestos por chunk y documentar la decisión de matemáticas PDF. | `npm.cmd run verify` verde y presupuesto reproducible. |
| 1. Fundaciones | `ErrorBoundary`; carga lazy de EN; preview del mismo Blob PDF que se descarga; guardar nativo progresivo; contrato de versiones nombradas sobre el diff actual. | Pruebas de error, i18n, diálogo/foco, archivo y restauración; multi-pestaña; entry y PDF dentro de presupuesto. |
| 2. Superficies | Una taxonomía de resultados y tabs roving dentro del broker existente; Data/Table/Review/BOM como superficies hermanas; teclado, Navigator, evidencia, corte y diagramas del canvas detrás de flags. | Chromium y WebKit: teclado, lector, zoom 200/400 %, reduced motion, móvil y modelo grande sin doble render ni pérdida de foco. |
| 3. Evidencia y estudios | Certificado numérico y procedencia con lenguaje prudente; active-set, pandeo y modal en workers; métodos clásicos sólo explicativos. | Oráculos independientes, tolerancias publicadas, hashes de modelo/solver/unidades, worker no bloqueante y tests de regresión numérica. |
| 4. Avanzado | Constructor de secciones con propiedades explícitamente soportadas; share como importación confirmada; asistente de comandos reversible sin red. | Compatibilidad de schemas hacia delante/atrás, privacidad revisada y ninguna propiedad incompleta consumida por solver o diseño. |
| 5. Normas y PDF matemático | Nueva especificación por norma; fuentes, hash, cláusula/página, fixtures y revisión técnica. Matemáticas PDF mediante una dependencia mínima y segura. | Aprobación técnica explícita, oráculos y supply-chain revisado. No empieza por copiar AISC/Eurocode actuales. |

## Orden de implementación dentro de una fase

1. Añadir o ajustar contrato puro y pruebas de fallo.
2. Conectar almacenamiento, worker o adaptador de plataforma con migración reversible.
3. Integrar la superficie usando el broker y la dirección visual canónica.
4. Ejecutar gate focalizado y `npm.cmd run verify`; agregar QA de navegador cuando afecte flujos reales.
5. Confirmar branch, diff, archivos sin seguimiento y SHA remoto antes de integrar; publicar requiere una autorización separada.

## Primer corte recomendado

La siguiente entrega debe ser la fase 0 completa, sin mezclar funcionalidad de Copia-web: dejar el baseline verde, decidir límites de chunk y registrar la decisión de PDF matemático. Con esa base, la primera función transferida será `ErrorBoundary` y después el lazy-load de inglés; ambas son pequeñas, aislables y no alteran el dominio estructural.

## Avance real de esta rama

- Ya se completaron ErrorBoundary, inglés lazy, guardado nativo con descarga de reserva, versiones nombradas, vista previa lazy de la memoria PDF, certificado numérico opcional en worker, procedencia verificable para extremos N/V/M, barras de sólo tracción/compresión por conjunto activo, análisis modal y pandeo elástico, selección por propiedades desde la paleta, el asistente local de comandos con revisión/diff y confirmación separada, la apertura de archivos de la PWA y los enlaces locales compartibles hacia el importador con revisión obligatoria.
- El constructor de secciones personales ya incorpora rectángulo, círculo, I simétrica, caja rectangular, canal U, ángulo L y tubo circular. Sus propiedades se calculan desde la geometría paramétrica y sólo viven en la biblioteca personal: no alteran el catálogo ni se conectan aún al solver.
- La tarjeta de estudios deja escoger el modo de pandeo o vibración que se lee, con su multiplicador o periodo/frecuencia, participación, masa total, residuo, GDL libres y avisos del estudio. El modo elegido se puede publicar como una capa de presentación del canvas y se retira al modificar el modelo; la procedencia de masa queda explícita para evitar interpretar el resultado modal como una revisión sísmica.
- Cuando no hay una selección activa, el inspector ahora conserva su resumen accesible y añade un panorama del modelo: nodos, barras, apoyos, cargas, extensión, casos activos y escenario. Es una lectura derivada y no duplica el estado del análisis ni modifica el proyecto.
- El panorama de un modelo vacío ofrece acceso directo al generador estructural existente. Emite la misma intención del workspace que las herramientas del canvas, sin construir geometría ni cambiar el proyecto por sí mismo.
- El panorama de un modelo con geometría conserva el total de hallazgos de Model Doctor y su acceso directo. El diagnóstico se importa bajo demanda y el botón reutiliza la superficie preventiva existente, sin duplicar estado ni análisis.
- Una sección de la biblioteca personal ya se puede aplicar desde el inspector. El proyecto recibe una instantánea de área e inercia como sección personalizada; no queda enlazado a la biblioteca local, por lo que su edición posterior no altera modelos ni resultados guardados.
- El mismo selector del inspector abre el constructor paramétrico completo. Crear o revisar una sección no cambia el miembro: sólo el botón posterior de aplicar confirma la instantánea A/I para la barra seleccionada.
- El modo de pandeo o vibración elegido se puede superponer en el canvas. Usa las formas nodales ya calculadas, interpola pórticos con funciones cúbicas y conserva líneas rectas para armaduras; su estado es sólo de presentación y se invalida con cualquier cambio de modelo.
- El minimapa conserva el encuadre completo como acción de teclado y ahora admite navegación por puntero: un clic sobre el radar centra la cámara en ese punto sin cambiar el zoom ni tocar el modelo.
- El riel de evidencia puede desplegar simultáneamente axial, cortante y momento (ACM) bajo la estructura resuelta. Las tres curvas leen el mismo `MemberResult`, comparten estación de lectura y se escalan por carril; cada carril se puede ocultar sin dejar el ACM vacío y esa preferencia local se conserva entre sesiones. En una discontinuidad enseña ambos límites laterales, sin elegir uno en silencio. Es una capa efímera de presentación, no otro análisis ni un cambio de modelo.
- Las superficies de Resultados, Hoja de datos, Model Doctor y BOM conservan su propia herramienta y borrador, pero ahora se enlazan como un único flujo de datos. Cambiar desde una de las tres hojas invocadas cierra la anterior antes de abrir el destino, para no retener una capa modal suspendida; las flechas y Home/End recorren el flujo y restauran el foco en el destino. La entidad, el borrador y su origen en Hoja de datos sobreviven al cambio y sólo se descartan al cerrar la herramienta de datos de verdad.
- El presupuesto de la carga inicial ya es bloqueante: 1.40 MB sin comprimir y 380 kB gzip, medidos desde el `dist` real. Cualquier aumento deliberado debe revisar el splitting y renovar la evidencia, en vez de crecer bajo un límite infinito.
- La reanudación directa vuelve a estar habilitada sólo una vez al abrir la aplicación, y sólo cuando el repositorio confirma proyectos sin recuperaciones pendientes. Volver a Inicio mantiene las rutas explícitas de recuperación, importación y ejemplos.
- El dock de Resultados reúne sus lecturas densas con accesos a Hoja de datos, Model Doctor y BOM. Reutiliza el bus tipado y las superficies existentes en lugar de duplicar el drawer de Copia-web, por lo que conserva foco, layout y carga diferida.
- La copia local actual de Copia-web contenía `launchQueue`, pero no lo entregaba a su importador; StructureCo lo conecta hasta la inspección y confirma la importación por separado.
- El enlace compartible mejora la fuente: usa fragmento comprimido, controla un límite explícito, no usa servidor y también responde a un cambio de fragmento cuando la aplicación ya estaba abierta.
- El catálogo versionado de combinaciones NTC CDMX 2023 Grupo B ahora tiene un consumidor explícito en Cargas. Se seleccionan y clasifican los casos permanente/variable, se inspecciona el alcance antes de generar los borradores y cada alta conserva procedencia, URL, hash y estado límite dentro de la combinación editable; el flujo no aplica ni certifica nada automáticamente.

## Fuera de alcance por ahora

- Cambiar el diseño visual vigente por el de Copia-web.
- Migrar los defaults AISC/Eurocode o declarar cobertura normativa nueva.
- Agregar red, proveedores de IA, secretos o telemetría remota.
- Publicar, hacer push o modificar los repositorios remotos.
