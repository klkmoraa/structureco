# CRI-11 · Fase A — preview público temporal del harness

**Fecha:** 2026-08-15 23:00
**Agente:** Claude Code
**Rama:** `claude/cri-11-fase-a-prototype-ej1x53`
**Clasificación:** `AUDIT/TEMPORARY`

## Qué cambió

Se pidió publicar el harness de CRI-11 Fase A como preview temporal en la nube
(Netlify/Vercel o equivalente), sin tocar `main` ni el GitHub Pages de
producción. Netlify, Vercel y Surge están bloqueados por la política de red de
este entorno (`403` en el `CONNECT` del proxy, confirmado contra
`api.netlify.com`, `api.vercel.com` y `surge.sh` — no es un problema de
credenciales). Se usó el equivalente disponible en esta sesión: un build de un
solo archivo HTML autocontenido, publicado como página aislada fuera del
repositorio (Artifact). No crea ni modifica ninguna configuración de Pages.

Añadido:

- `vite.artifact.config.ts` — config de build alterna (no sustituye
  `vite.config.ts`) que usa `vite-plugin-singlefile` para inlinear JS y CSS en
  un único `index.html`, sin llamadas de red externas.
- `scripts/verify-artifact.mjs` — abre ese bundle con Chromium en viewport
  EXTERNO de escritorio (1440×900) y de móvil real (390×844), y falla ante
  cualquier error de consola, excepción o request fallida.
- `npm run build:artifact` y `npm run verify:artifact`.
- `index.html`: el `<title>` pasa de `structureCo · CRI-11 Fase A · harness` a
  `CRI-11 Harness` (nombre corto y específico, sin el patrón de breadcrumb).

## Bug real encontrado y corregido

`verify-artifact.mjs` reveló que el propio panel del laboratorio —no el
prototipo bajo prueba— era inutilizable en un navegador móvil real. Ninguna
prueba anterior lo había ejercitado: `smoke.mjs` siempre corre con el navegador
externo fijo en 1600×1000 y sólo cambia el marco *simulado* dentro del
harness; nunca reduce la ventana real.

`HarnessShell.tsx` calculaba el espacio disponible para el marco restando un
ancho de panel fijo (`window.innerWidth - 372`), asumiendo el layout de
escritorio (panel lateral de 340px). Por debajo de 900px de ancho, `harness.css`
ya apila el panel arriba del escenario (`@media (max-width: 900px)`), y el
panel deja de robar ancho horizontal — pero el cálculo seguía restando esos
372px igual. En 390px de ancho eso dejaba **18px** de espacio "disponible": el
marco se encogía a casi nada y el botón `Continuar proyecto` quedaba
inalcanzable — Playwright lo confirmó con un timeout de 30s intentando hacer
clic.

**Corrección:** el espacio disponible ahora se **mide** del contenedor real
(`.lab-stage`) con `ResizeObserver`, en vez de calcularse restando una
constante que sólo era válida para un layout. Así el cálculo respeta cualquier
punto de quiebre de `harness.css` sin tener que duplicarlo en JS.

Verificado con capturas antes/después en
`reports/evidence/2026-08-15-cri-11-fase-a/artifact-{desktop,mobile}-{welcome,workspace}.png`:
el marco pasó de invisible/inalcanzable a visible, legible y clicable en
390×844 real.

Esas capturas ya no viven en el árbol operativo: se regeneran con
`npm --prefix prototypes/cri-11-harness run build:artifact` y
`npm --prefix prototypes/cri-11-harness run verify:artifact`; la versión
histórica permanece consultable en Git.

## Por qué

El encargo pedía verificar explícitamente que cargara en desktop **y** móvil.
Publicar algo roto en móvil sin haberlo probado con un viewport externo real
habría incumplido esa instrucción, aunque el bug estuviera en el chrome del
laboratorio y no en el producto bajo prueba.

## Archivos tocados

| Archivo | Qué |
|---|---|
| `prototypes/cri-11-harness/vite.artifact.config.ts` | Nuevo — build de un solo archivo |
| `prototypes/cri-11-harness/scripts/verify-artifact.mjs` | Nuevo — verificación desktop+móvil con viewport externo real |
| `prototypes/cri-11-harness/src/harness/HarnessShell.tsx` | Fix — espacio disponible medido, no calculado sobre una constante de layout |
| `prototypes/cri-11-harness/index.html` | Título del documento, más corto y específico |
| `prototypes/cri-11-harness/package.json` | `build:artifact`, `verify:artifact`, `vite-plugin-singlefile` |
| `prototypes/cri-11-harness/.gitignore` | Ignora `dist-artifact/` |
| `prototypes/cri-11-harness/README.md` | Documenta el flujo de preview y el bug corregido |

No se tocó `src/**` de producción, `brand/**`, `docs/**`, gates, ni la
configuración de GitHub Pages. `dist/` y `dist-artifact/` no se commitean.

## Cómo verificar

```bash
npm --prefix prototypes/cri-11-harness run build:artifact
npm --prefix prototypes/cri-11-harness run verify:artifact   # 2/2, sin errores
npm --prefix prototypes/cri-11-harness run smoke             # 26/26, sigue en verde
node --test prototypes/cri-11-harness/src/core/resolver.test.mjs   # 18/18
```

## Pendiente / siguiente paso

El preview publicado es temporal y vive fuera del control de versiones de este
repositorio (hosting de Artifact). Si se necesita un preview persistente y
compartible por URL fija más adelante, valdría la pena habilitar Netlify o
Vercel explícitamente para este entorno — hoy ambos están bloqueados por
política de red, no por falta de configuración del proyecto.
