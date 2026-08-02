# structureCo 0.8.1 — Estado canónico

**Modo:** trabajo exclusivamente local. Ver [LOCAL_MODE.md](LOCAL_MODE.md).
**GitHub:** NO UTILIZADO.
**Rama:** `main` · **Commit base:** `3564505`
**Versión en `package.json` al iniciar:** 0.8.0 (el bump es el último slice, S20).

Estados válidos: `NOT_STARTED` · `IN_PROGRESS` · `BLOCKED` · `COMPLETE` · `NOT_NEEDED`.

Un slice solo pasa a `COMPLETE` con: implementación + pruebas ejecutadas + build + evidencia +
revisión del diff + verificación de la frontera protegida + reporte + commit local.

| ID | Slice | Estado | Propietario | Dependencias | Commit local | Pruebas | Evidencia | Bloqueos |
|----|-------|--------|-------------|--------------|--------------|---------|-----------|----------|
| S01 | Baseline y protección | COMPLETE | Opus 5 | — | `b6cfde7`, `be02366` | 67 archivos / 388 pruebas en verde | `PROTECTED_BASELINE.sha256`, [reporte](../../../reports/2026-08-02-1150-s01-baseline-y-proteccion.md) | — |
| S02 | Especificación de diseño | NOT_STARTED | Opus 5 | S01 | — | — | — | — |
| S03 | Fundamentos del sistema de diseño | NOT_STARTED | Opus 5 | S02 | — | — | — | — |
| S04 | Navegación y shell | NOT_STARTED | Opus 5 | S03 | — | — | — | — |
| S05 | Canvas e interacción | NOT_STARTED | Opus 5 | S03 | — | — | — | — |
| S06 | Inspector y formularios | NOT_STARTED | Opus 5 | S03 | — | — | — | — |
| S07 | Resultados | NOT_STARTED | Opus 5 | S03 | — | — | — | — |
| S08 | Mentor/Aula | NOT_STARTED | Opus 5 | S03 | — | — | — | — |
| S09 | Seguridad de importaciones | COMPLETE | Opus 5 | S01 | `95ad0e1` | 69 archivos / 439 pruebas en verde (+51) | corpus adversarial en `portableSecurity.test.ts`, [reporte](../../../reports/2026-08-02-1205-s09-seguridad-de-importaciones.md) | — |
| S10 | Experiencia de importación | NOT_STARTED | Opus 5 | S09 | — | — | — | — |
| S11 | Política numérica | NOT_STARTED | Opus 5 | S01 | — | — | — | — |
| S12 | SVG | NOT_STARTED | Opus 5 | S11 | — | — | — | — |
| S13 | PNG | NOT_STARTED | Opus 5 | S12 | — | — | — | — |
| S14 | PDF | NOT_STARTED | Opus 5 | S11 | — | — | — | — |
| S15 | Casos analíticos e invariantes | NOT_STARTED | Opus 5 | S01 | — | — | — | — |
| S16 | Rendimiento | NOT_STARTED | Opus 5 | S01 | — | — | — | — |
| S17 | Accesibilidad y responsive | NOT_STARTED | Opus 5 | S04–S08 | — | — | — | — |
| S18 | CI preparado localmente | NOT_STARTED | Opus 5 | S15 | — | — | — | — |
| S19 | Documentación | NOT_STARTED | Opus 5 | todos | — | — | — | — |
| S20 | Certificación y versión | NOT_STARTED | Opus 5 | todos | — | — | — | — |

## Frontera matemática protegida

45 archivos con hash SHA-256 registrado en `PROTECTED_BASELINE.sha256`:
`src/engine/**`, `src/workers/**`, `src/data/**`, `src/store/ProjectContext.tsx`, `src/types.ts`.

Verificación:

```bash
node scripts/check-protected-baseline.mjs
```

## Limitaciones registradas al iniciar

- No se pudo confirmar la versión de Claude Code: el ejecutable `claude` no está en el `PATH`
  del shell de esta sesión. El modelo activo sí está confirmado: Opus 5 (`claude-opus-5`).
- Las referencias visuales oficiales (`01-instrumento-precision-structureco.pdf` …
  `05-mesa-modular-structureco.pdf`, 33 capturas, 5 boards y 15 conceptos) existen **solo dentro
  de carpetas de respaldo ignoradas por git**
  (`structureCo-backup-redesign-20260802-002717/output/design-exploration/…`). No están versionadas.
- `structureCo_mockups_canva_10_paginas.pdf` **no se encontró** en el proyecto.
- Las skills `structureco-project-guardian`, `-engine-safety`, `-ux-responsive`,
  `-classroom-mode`, `-documentation-handoff` y `-release-certification` que `AGENTS.md`
  menciona **no existen** en el repositorio; `.gitignore` las lista como tooling externo.
  La única skill presente es `change-report`.
