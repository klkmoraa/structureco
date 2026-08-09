# Fase 4: dependencias y gates

**Fecha de corte:** 2026-08-09
**Base:** `6233286806f7029936e52d98fe3a8e53825b2a94` + cambios Fase 4 verificados antes del commit local
**Regla:** un documento histórico o pre-RFC demuestra diseño, no implementación ni certificación.

## Estados

- `PASA`: evidencia ejecutable actual y gate satisfecho para el alcance indicado.
- `PARCIAL`: existe una parte verificable, pero faltan controles o alcance requerido.
- `NO EXISTE`: no hay implementación actual.
- `NO PASA`: el gate requiere evidencia que no existe o falló.
- `REQUIERE INVESTIGACIÓN`: falta una decisión basada en fuentes o mediciones.

## Matriz

| ID | Capacidad / dependencia | Evidencia actual | Estado | Responsable del siguiente gate | Siguiente evidencia |
|---|---|---|---|---|---|
| F4-BASE-2D | Frontera matemática 2D | `npm.cmd run verify:protected`: 29 archivos intactos; `npm.cmd run verify` completo | PASA | mantenedor del solver | conservar baseline sin actualizar |
| F4-3D-VIEW | Visor `(x,y,0)` no autoritativo | Adaptador puro, Three.js lazy, cámara bajo demanda, fallback y navegación | PASA para alcance experimental | producto + frontend | revisión de uso antes de ampliar contenido |
| F4-3D-MODEL | `AnalysisSpace`, `z`, 6 GDL y propiedades 3D | Sólo pre-RFC | NO EXISTE | arquitectura estructural | ADR y contratos aprobados |
| F4-3D-NUM | Formulación/ensamblaje 3D | Investigación histórica, sin derivación vigente ejecutable | NO PASA | ingeniería numérica | derivaciones y corpus manual |
| F4-3D-ORACLE | Validación independiente | Frame3DD/OpenSees identificados, sin comparación structureCo | REQUIERE INVESTIGACIÓN | validación estructural | tolerancias y resultados reproducibles |
| F4-3D-DATA | Persistencia/portable 3D | Portable v1 protege 2D; no conoce 3D | NO EXISTE | arquitectura de datos | versión, migración y rechazo estricto |
| F4-3D-WORKER | Protocolo/capacidad 3D | Workers 2D permanecen intactos; no existe mensaje 3D | NO EXISTE para 3D | plataforma | protocolo 3D y presupuestos medidos |
| F4-3D-A11Y | Semántica y fallback del visor | Teclado, nombres accesibles, touch 44 px, 390×844, temas, reducción de movimiento y fallback probados en navegador | PASA para el alcance probado | accesibilidad | prueba manual con tecnología de asistencia antes de afirmarla |
| F4-CMD | Comandos reversibles | `ProjectCommand`, compile/apply y undo actuales | PASA para subcapacidad existente | arquitectura de comandos | ampliar sólo tras schema/evals de IA |
| F4-ANCHOR | Procedencia de explicaciones | Resolver interno de anchors sobre resultados almacenados | PARCIAL | arquitectura de resultados | snapshot/versionado/portable oficial |
| F4-AI-SCHEMA | `CommandProposal` cerrado | JSON Schema normativo en pre-RFC | NO EXISTE en producto | seguridad de aplicación | implementación local y tests negativos |
| F4-AI-BROKER | Broker servidor DeepSeek | Arquitectura propuesta; sin servicio, SDK o secreto | NO EXISTE | plataforma + seguridad | threat model, servicio y kill switch |
| F4-AI-EVAL | Corpus adversarial y métricas | Criterios definidos; harness ausente | NO EXISTE | seguridad + QA | evals reproducibles con cero escapes |
| F4-AI-VENDOR | Privacidad, retención y coste | Documentación técnica consultada | REQUIERE INVESTIGACIÓN | legal/privacidad + operaciones | evaluación contractual y de datos |
| F4-OPS-BUNDLE | Carga inicial preservada | 711 442 bytes / 188 963 gzip; visor 553 398 bytes, `eager:false`; Three.js ausente del entry | PASA | frontend performance | vigilar margen del presupuesto en cambios futuros |
| F4-OPS-RELEASE | CI/release reproducible | Verificación local completa; F4 no publicada por alcance | PARCIAL | release engineering | publicación sólo con autorización explícita |

## Evidencia de cierre experimental

- Pruebas focalizadas: 8 archivos, 50 pruebas aprobadas.
- Suite completa: 119 archivos, 811 aprobadas y 3 omitidas de 814.
- Build y rendimiento: aprobados mediante `npm.cmd run verify`.
- Navegador real: 1440×900 y 390×844; claro/oscuro; español/inglés; poblado/vacío; controles de cámara; pérdida y reintento de WebGL.
- Evidencia visual: `reports/evidence/2026-08-09-fase-4/`.
- Alcance de accesibilidad: se comprobó DOM accesible, teclado, foco, touch y movimiento reducido; no se afirma compatibilidad con lector de pantalla no probado.

## Dependencias y orden

```text
Visor experimental F4
  -> baseline protegida intacta
  -> tests de adaptador/ciclo de vida/navegación
  -> build y chunk lazy
  -> QA visual y accesible

Motor 3D futuro
  -> ADR de contratos
  -> derivación y oráculos
  -> tipos/versionado/workers
  -> prototipo experimental
  -> capacidad y UX completa
  -> gate de producción

IA futura
  -> schema + threat model
  -> validadores/conversión local
  -> preview + snapshot binding
  -> broker + privacidad
  -> corpus adversarial + kill switch
  -> experimento limitado
  -> gate de producción
```

## Decisión de fase

- **Visor 3D:** `IMPLEMENTADO EXPERIMENTAL / NO AUTORITATIVO`.
- **Análisis estructural 3D:** `NO IMPLEMENTADO / GATE NO PASA`.
- **IA:** `PRE-RFC COMPLETO / PRODUCTO NO IMPLEMENTADO`.
- Ningún gate de esta matriz autoriza modificar solver, datos persistidos o conectar un proveedor.
