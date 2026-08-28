# Protocolo de investigación de adopción — CRI-125

**Clasificación:** `AUDIT/TEMPORARY`

## Decisión que informará

Determinar si la ruta de primer análisis, el plan de reparación de Model Doctor y el centro de resultados reducen fricción real para estudiantes e ingenieros. Este protocolo no valida la implementación por sí solo: ningún hallazgo se considera observado hasta que una sesión registrada lo respalde.

## Participantes y muestra

| Perfil | Cantidad | Criterio mínimo |
| --- | ---: | --- |
| Estudiantes | 5 | Haber cursado estática o análisis estructural básico. |
| Ingenieros | 5 | Usar o revisar modelos estructurales en su trabajo. |

No incluir al equipo que implementó StructureCo. Si la muestra cambia, registrar motivo y efecto sobre la comparabilidad antes de iniciar la primera sesión.

## Consentimiento y privacidad

Antes de iniciar, explicar que se registrarán pantalla, voz opcional, ruta de interacción, tiempo y respuestas; que se puede detener la sesión sin justificarlo; y que no deben compartir datos de proyectos reales, nombres de clientes ni información identificable. Asignar un identificador de participante aleatorio. Guardar clips y notas fuera del repositorio; el repositorio conserva sólo síntesis anonimizadas.

## Guion moderado (45 minutos)

1. **Contexto, 5 min.** Preguntar experiencia con análisis estructural y herramienta habitual, sin evaluar conocimientos.
2. **Inicio y plantilla, 8 min.** “Quieres revisar una estructura sencilla. Elige cómo empezar y cuéntame qué esperas que ocurra.” Observar si distingue Plantillas, Generador, Ajustes y Estudio de ilustraciones.
3. **Modelo vacío, 10 min.** “Empieza un proyecto vacío y llega a un modelo listo para analizar. Usa el camino que te parezca más seguro.” Medir si localiza la guía, la abandona o usa una ruta experta.
4. **Generador y reparación, 10 min.** Crear un pórtico sin apoyos. “Déjalo listo para una corrida válida sin que la aplicación decida por ti las condiciones físicas.” Observar Model Doctor, causa entendida, CTA de apoyo, cancelación y retorno.
5. **Primer resultado, 8 min.** Ejecutar el modelo preparado. “Indica qué resultado mirarías primero, qué unidades y combinación estás leyendo, y qué te haría desconfiar.”
6. **Recuperación, 3 min.** Mostrar un conflicto/recovery preparado. “¿Cuál copia usarías y por qué?”
7. **Cierre, 1 min.** Calificar confianza de 1 a 5 y preguntar cuál fue el momento más incierto.

El moderador sólo puede repetir la tarea. Si da una pista, registrar la marca de tiempo y clasificar la tarea como asistida.

## Registro por sesión

| Campo | Registro permitido |
| --- | --- |
| ID y perfil | Código anónimo; estudiante o ingeniero. |
| Tarea y ruta | Identificadores de tarea y ruta elegida; no contenido del proyecto. |
| Resultado | Éxito autónomo, éxito asistido, abandono o error. |
| Tiempo | Inicio, fin y tiempo hasta primer resultado. |
| Fricción | Cita corta anonimizada, paso, severidad preliminar y captura/clip externo. |
| Comprensión | Respuesta a resultado, unidades, combinación, apoyo y recuperación. |
| Confianza | Escala 1–5 y motivo breve. |

## Criterios de decisión

| Señal | Construir o mantener | Ajustar | Descartar o investigar de nuevo |
| --- | --- | --- | --- |
| Ruta inicial | 8/10 llegan a una corrida válida sin ayuda | 6–7/10 o pasos confusos repetidos | Menos de 6/10 o la ruta empuja una decisión técnica errónea |
| Model Doctor | 8/10 explican causa y siguiente acción sin creer que el sistema eligió los apoyos | Comprenden la causa, pero fallan en el CTA o retorno | La corrección se interpreta como automática o insegura |
| Resultados | 8/10 identifican resultado, unidades y combinación | Falta una de esas tres piezas con patrón claro | La lectura provoca conclusión estructural no justificada |
| Recuperación | 8/10 identifican la copia con mayor contenido y conservan la otra | Dudan entre acciones pero no pierden datos | Eligen una copia vacía creyendo que es canónica |

## Síntesis posterior

1. Agrupar problemas por tarea y evidencia, no por preferencia verbal aislada.
2. Priorizar los cinco problemas con severidad: bloqueante, alta, media o baja; anotar frecuencia, perfiles afectados, evidencia y decisión propuesta.
3. Actualizar CRI-127, CRI-129 y CRI-130 sólo con enlaces al ID anónimo, clip/captura externo y decisión: construir, ajustar o descartar.
4. Publicar una síntesis anonimizada sin clips en `reports/` y conservar el material sensible fuera de Git.

## Plantilla de hallazgo

```text
ID: R-###
Tarea:
Perfiles y frecuencia:
Evidencia: [ID de sesión + marca de tiempo + captura/clip externo]
Observado:
No inferir:
Severidad: bloqueante | alta | media | baja
Decisión: construir | ajustar | descartar | investigar de nuevo
Issues afectadas: CRI-127 | CRI-129 | CRI-130
```
