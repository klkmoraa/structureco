# Resultados con dock discreto

**Fecha:** 2026-08-25 20:22
**Agente:** Codex
**Rama:** main

## Qué cambió

Resultados de escritorio ahora inicia como una barra compacta y sólo despliega
el dock cuando la persona lo solicita. Compacto, Expandido y Enfocar reequilibran
las tarjetas de extremos y el alto útil del diagrama; Enfocar se limita a una
lectura amplia contenida en lugar de ocupar casi todo el lienzo.

## Por qué

El dock abierto permanentemente competía con el modelo. A la vez, el gráfico
era ilegible en Compacto/Expandido y desproporcionado en Enfocar.

## Archivos tocados

- `src/features/results/ResultsPanel.tsx` — barra de acceso, despliegue y cierre accesibles del dock.
- `src/styles.css` — geometría de dock, tarjetas y diagramas para los tres modos.
- `src/i18n/catalogs.ts` — etiquetas bilingües de abrir/cerrar Resultados.
- `src/features/results/ResultsPanel.test.tsx` — contrato del dock bajo demanda.
- `scripts/qa-results-cards.mjs` — evidencia renderizada de dock, Compacto, Expandido y Enfocar.

## Cómo verificar

1. `npx vitest run src/features/results/ResultsPanel.test.tsx --maxWorkers=1 --pool=threads --no-file-parallelism`
2. `npm run typecheck`
3. `node scripts/qa-results-cards.mjs`

Las capturas locales en `reports/evidence/2026-08-17-cri-101-results-cards-dense/` muestran los cuatro estados X2.

## Pendiente / siguiente paso

Nada pendiente en este ajuste visual. El push queda pendiente de autorización explícita.
