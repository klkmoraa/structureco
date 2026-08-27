# Depuración de evidencia regenerable

**Fecha:** 2026-08-27  
**Alcance:** `reports/evidence/` y documentación del harness CRI-11

Se retiraron del índice y del árbol operativo las capturas, métricas y reportes
generados que todavía estaban rastreados bajo `reports/evidence/`. Se conserva
la regla `/reports/evidence/` de `.gitignore`; la evidencia histórica sigue
disponible en los commits anteriores.

Los artefactos locales se regeneran sin añadirlos al índice:

```bash
npm --prefix prototypes/cri-11-harness run build
npm --prefix prototypes/cri-11-harness run smoke
npm --prefix prototypes/cri-11-harness run validate
npm --prefix prototypes/cri-11-harness run build:artifact
npm --prefix prototypes/cri-11-harness run verify:artifact
```

La compilación del harness se verificó correctamente. Los tres recorridos de
navegador alcanzaron su punto de lanzamiento, pero no pudieron completarse en
este entorno porque Chromium no está instalado y su descarga fue rechazada por
el CDN con HTTP 403. Los scripts conservan rutas de salida explícitas para las
capturas y los reportes de Fase A, B y C.

La comprobación de cierre es:

```bash
git ls-files reports/evidence
```

Debe producir una salida vacía.
