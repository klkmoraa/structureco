# Zócalo contextual móvil y runners de QA · 2026-08-24

## Alcance

Se cerró la auditoría del flujo móvil mostrado en las capturas: bienvenida con
proyecto guardado, colocación de un miembro, Model Doctor, Resultados,
Datasheet y acciones de selección en X2/M1/K0. No se ejecutó la suite completa.

## Causa encontrada y corrección

- `ContextualActions` ya tenía el contrato visual, traducciones y reglas del
  broker, pero `StructuralCanvas` nunca la montaba. Por eso Datasheet/Doctor
  podían pasar a `peek` y devolver el lienzo sin devolver el zócalo contextual.
- La superficie ahora deriva su existencia de la selección viva y su actividad
  del `SurfacePresentationContext`; no crea una segunda selección ni estado de
  shell. Reutiliza los comandos existentes de copiar, pegar, duplicar, repetir,
  borrar, hoja de datos y edición estructural.
- Durante una colocación (`Miembro`/primer nodo) el zócalo se suspende para no
  competir con la pista de destino ni la entrada rápida.
- Se añadió la identidad `data-workspace-surface="contextualActions"` para que
  el broker y los oráculos de interacción observen la misma superficie.

## Correcciones de infraestructura de prueba

- TopBar usa la plantilla vigente y desactiva la recarga externa de PWA durante
  el recorrido.
- Resultados usa el lanzador persistente de TopBar en X2/M1 y el menú de
  utilidades en K0; conserva un fallback histórico sólo para builds antiguas.
- Datasheet usa Chrome del entorno Windows o `PLAYWRIGHT_EXECUTABLE_PATH`, y
  continúa el proyecto sembrado en vez de crear uno nuevo al volver a Home.

## Evidencia focal

| Comprobación | Resultado |
| --- | --- |
| `npm.cmd run build` | PASS · 2,637 módulos transformados |
| Vitest focal: ContextualActions, StructuralCanvas contextual y broker | PASS · 33/33 |
| `node scripts/qa-datasheet-k0.mjs` | PASS · 76/76; zócalo vuelve en `peek` portrait y landscape |
| `node scripts/qa-topbar.mjs` | PASS · breakpoints 1023/1024/1025, barrido continuo y nombres ES/EN |
| `node scripts/qa-results-cards.mjs` | PASS · día/noche, X2/M1/K0, dense y Datasheet |
| Selección de miembro en K0 | PASS · zócalo 370×62 en x=10, overflow horizontal 0 |
| Colocación móvil tras activar Miembro y tocar primer nodo | PASS · pista + entrada rápida presentes, zócalo ausente, overflow 0 |
| Home con proyecto guardado | PASS · permanece en bienvenida; no autoabre la Mesa |
| Model Doctor focal | PASS · 0 avisos al entrar/abrir, 1 tras Analizar explícito; retorno de foco X2/K0 y sin errores |

El runner largo `qa:model-doctor.mjs` se detuvo tras no mostrar progreso en su
segunda secuencia de foco; no se presenta como PASS. La reproducción mínima
equivalente sí pasó y devolvió el diagnóstico observable, por lo que no se
atribuyó ese bloqueo del runner a un fallo funcional del producto.

## Límites respetados

No se tocaron solver, unidades, signos, topología, `ProjectModel`, workers,
persistencia, import/export, undo/redo ni resultados numéricos. El reporte
extranjero `reports/2026-08-23-cri-29-action-contract-audit.md` permanece sin
seguir y fuera del cambio.
