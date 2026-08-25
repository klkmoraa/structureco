# 2026-08-25 — Auditoría del árbol vigente y propuestas de mejora

**Fecha:** 2026-08-25
**Agente:** Claude
**Rama:** `claude/propuestas-mejora-mp8bhq`
**SHA base auditado:** `89010caa558a86c7d109298d77b17f3c82a7f6e5` (= `origin/main`)
**Entorno de medición:** contenedor Linux 6.18, Node v22.22.2, npm ci sobre
`package-lock.json`. Las cifras de tiempo son de esta máquina y no son una
promesa para otras; los conteos de bytes y de claves sí son reproducibles.

## Resumen

Se auditó el árbol completo —103 033 líneas de TS/TSX en 555 archivos, 258
archivos de prueba, gates y workflows— buscando defectos demostrables y
oportunidades medibles, no opiniones de estilo. La primera evidencia fue que
**`origin/main` estaba en rojo**: `npm test` reportaba 2 fallos deterministas,
ambos de accesibilidad y ambos reproducibles sin navegador.

Este reporte cubre dos cosas: lo que ya se corrigió en esta rama (seis
commits, todo verificado) y lo que se propone como trabajo siguiente, con el
número que lo justifica y sin implementarlo, porque cada propuesta abierta
toca una decisión de producto o un contrato que no me corresponde cambiar
por iniciativa propia.

## Parte 1 · Corregido en esta rama

### 1.1 El bróker devolvía el foco y el shell se lo robaba

`WorkspaceShell.setResultsOpen(false)` enfocaba `.utility-more-button` en
**todo** cierre de Resultados, y `setBomOpen(false)` hacía lo mismo con
`.topbar-export-trigger, .utility-more-button`. Ese respaldo se encolaba en un
`requestAnimationFrame` posterior al del bróker, así que se ejecutaba después
de la restauración correcta y la pisaba.

Efecto real en K0: abrir Resultados desde su botón persistente de la barra y
cerrarlo con `Escape` dejaba el foco en Utilidades, no en el botón que lo
abrió. Es la ruta de teclado y de lector de pantalla completa.

Instrumentando el ciclo se ve que el bróker sí hacía su trabajo
(`returnTarget = .results-launcher`, `isConnected = true`, `focus()` efectivo)
y que el único `focusin` posterior venía de `WorkspaceShell.tsx:257`.

El respaldo sigue existiendo —lo justifica el caso real de un item de menú que
se desmonta con la hoja— pero ahora comprueba `document.activeElement` antes de
actuar y sólo enfoca si nadie reclamó el foco. Gate: `App.test.tsx`
«opens and closes Compact Results from the persistent top-bar control»,
que estaba en rojo y ahora pasa.

### 1.2 Un `transform` literal escapaba de `prefers-reduced-motion`

`src/features/workspace/phase1.css` declaraba `transform:translateY(2px)`
literal en el estado pulsado del dock táctil. CRI-105 prohíbe exactamente eso
—un literal en un estado pulsado sobrevive a la preferencia porque el token ya
no lo alcanza— y su gate estaba en rojo.

El literal no era un descuido: lo puso CRI-120 porque
`--sc-clay-press-transform` incluye `scale(0.98)` y eso baja un objetivo táctil
de 44 px a 43 px en WebKit. Dos invariantes legítimas en conflicto.

Se resuelve sin sacrificar ninguna: `--sc-clay-press-transform-flat`
(`translateY(2px)`, sin `scale`) vive junto al token principal y la consulta de
`prefers-reduced-motion` lo anula igual. La guarda de CRI-105 acepta el token
nuevo **y** la prueba de tokens comprueba que también colapsa a `none`, para que
la lista blanca no se pueda ampliar sin demostrar la anulación.

### 1.3 El service worker acumulaba una copia del shell por release

`CACHE_NAME` lleva el digest del build, así que cada release abre una caché
nueva. El handler de `activate` sólo hacía `clients.claim()`: **ninguna caché
anterior se borraba nunca**. Con `dist` en 13.95 MB, cada versión instalada
dejaba ~14 MB muertos en el origen hasta que el navegador desalojaba el origen
entero por cuota —incluida la caché vigente y el shell offline—.

`activate` ahora barre las cachés `structureco-shell-*` obsoletas y deja
intactas las ajenas al prefijo — pero **conserva la release inmediatamente
anterior**, y eso no es un descuido. `install` llama a `skipWaiting()` en una
actualización, así que el worker nuevo controla pestañas que siguen mostrando
el documento previo; ese documento pide chunks perezosos con el hash de *su*
release —las superficies que `WorkspaceShell` importa bajo demanda— y esos
archivos ya no están en el servidor. Borrar su caché las dejaría sin ninguna
fuente y la superficie no cargaría. El `controllerchange` de `PwaUpdateNotice`
recarga esas pestañas, pero no de forma instantánea y no sin red.

Conservando dos generaciones el crecimiento queda acotado —28 MB en vez de
ilimitado— y una pestaña abierta durante una actualización sigue resolviendo
sus chunks, porque `caches.match` busca en todas las cachés del origen. Una
pestaña que sobreviva a **dos** actualizaciones sin recargar sí pierde la suya:
ése es el límite explícito de la política. Lo señaló la revisión de Codex sobre
la primera versión de este cambio, que sí borraba todo salvo la vigente.

De paso, la fuente del worker sale de `vite.config.ts` a
`scripts/pwa-shell-source.mjs`. Era código de producción que corre en el
navegador de cada usuario **sin una sola prueba**; ahora `npm run verify:pwa`
lo evalúa contra un `self`/`caches` falso (install, primera instalación vs
actualización, activate, purga selectiva, fetch cross-origin y desde caché) sin
construir la aplicación, y el gate rápido lo ejecuta.

### 1.4 El ensamblado denso: una matriz `naug × naug` menos

CRI-25 midió que a 1000 miembros el ensamblado —no la factorización— es el
58.8 % del análisis, y nombró como siguiente inversión eliminar la triple
materialización densa `K` / `A` / `scaledA`. Se retira la tercera: la
equilibración diagonal escribe sobre `A` en vez de construir una segunda matriz
`naug × naug`.

Es válido porque cada celda del escalado depende sólo de sí misma y de las
escalas de su fila y su columna —en el sitio produce los mismos productos en el
mismo orden— y porque `A` sin escalar no vuelve a leerse: `K` conserva la
rigidez original para `KU`, el equilibrio global y la traza educativa. El
cálculo de `diagonalScale` deja además de asignar una fila por fila
(`row.map(Math.abs)`).

**Paridad.** No basta con que las pruebas sigan verdes. Se volcaron todos los
resultados numéricos del corpus de ejemplos —análisis lineal, cada combinación,
P-Delta y traza educativa— con 17 dígitos por número, antes y después:
**24.8 MB de salida idénticos bit a bit**. Residual (`5.897e-18`) y estimación
de condición (`4.309e+6`) no se mueven en el arnés F3.

**Rendimiento**, viga continua de 1000 miembros, mediana de 3 corridas por lado:

| Fase | Antes | Después | Δ |
|---|---:|---:|---:|
| assembly | 3 449.4 ms | 2 909.5 ms | −15.7 % |
| total | 5 674.5 ms | 5 214.1 ms | −8.1 % |

Y una matriz densa menos viva a la vez: a 1000 miembros son ~72 MB de arrays de
dobles fuera del pico. El `heap-delta` del arnés no lo refleja porque mide
`heapUsed` después del GC, con la misma salvedad que ya anota CRI-25.

`scripts/protected-baseline.sha256` se refrescó porque `src/engine/solver.ts`
está en la frontera protegida; el cambio está autorizado explícitamente.

### 1.5 Claves de traducción sin consumidor, y el gate que faltaba

`catalogs.test.ts` comprobaba que `es` y `en` declaren lo mismo y que
interpolen igual. Faltaba la dirección contraria —que lo declarado tenga
todavía un consumidor— y sin ella el catálogo sólo podía crecer.

`scripts/check-i18n-usage.mjs` recorre 593 archivos y reporta las claves cuyo
texto literal no aparece en ninguno y que ningún prefijo dinámico
(`` t(`role.${role}`) ``) cubre. La segunda regla es deliberadamente generosa:
un falso positivo borra una etiqueta viva y la deja en blanco en producción,
un falso negativo sólo conserva unos bytes.

Con ese criterio había **142 claves muertas de 2174 (6.5 %)**, heredadas de
superficies rehechas: 56 de la bienvenida anterior, 24 de Resultados, 23 de
Space 3D, 13 del Inspector. Retiradas de ambos catálogos, el chunk de entrada
baja de 1 228.55 kB a 1 215.25 kB (−13.30 kB; −3.51 kB gzip).

Las tres últimas —`project.openExamples`, `project.importError` y
`analysis.statusOpenIssues`— sólo aparecieron tras acotar el detector en la
revisión del PR: la primera versión dejaba que cualquier template literal
donara prefijos, así que las rutas de procedencia de `revisionComparison.ts`
mantenían vivos los espacios de nombres `project.` y `analysis.` enteros.
Ahora un archivo sólo dona prefijos si participa de la traducción, y dentro de
él se descarta el template que sea argumento de otra llamada. La regla
contraria —restringirlo a las llamadas a `t`— habría marcado como muertas las
194 claves `generator.*`, que se alcanzan a través de tipos y nunca como
argumento literal. `scripts/check-i18n-usage.test.mjs` fija las dos
direcciones, porque el agujero existía justamente por no tener prueba.

### 1.6 Dos gates que existían y no corrían

`verify:space3d` (política de capacidad) y `verify:structural-assets` (contrato
de los 80 PNG) estaban en `package.json` y en ningún workflow: sólo se
ejecutaban a mano, justo los dos que pueden romperse al regenerar assets o al
mover el límite de nudos. Añadidos al gate rápido: 20.3 s y 0.5 s medidos,
sobre un techo de 15 minutos.

El Gate completo tenía además una duplicación que ya había divergido: enumeraba
el gate rápido en un bloque inline al que le faltaba `verify:perf`, y que se
quedó corto otra vez al promover `verify:pwa` y `verify:i18n` —un candidato de
release podía pasarlo con esos gates en rojo—. Ahora invoca `npm run verify`,
que es la única definición y no puede desincronizarse de sí misma.

## Parte 2 · Propuestas abiertas, por prioridad

Ninguna está implementada. Cada una toca una decisión de producto, un contrato
declarado o un volumen de trabajo que merece su propia tarea y sus gates.

### P1 · Ensamblado sparse de extremo a extremo

**Evidencia.** Es la recomendación explícita de CRI-25 y sigue vigente después
de 1.4: el solver todavía crea `K = zeros(ndof, ndof)` y `A = zeros(naug,
naug)` densas. A 1000 miembros el ensamblado sigue siendo ~55 % del análisis y
el heap medido ronda los 465–486 MiB. La factorización ya es sparse; lo que la
rodea no.

**Propuesta.** Ensamblar en triplets/CSR, escalar y calcular residual y normas
con un operador sparse, y conservar un adaptador denso explícito como fallback.
CRI-25 ya dejó escrito el contrato de no regresión numérica que hay que
respetar (paridad con LU denso, determinismo exacto, residual ≤ `1e-10`,
estimación de condición del sistema completo, fallback y diagnóstico de
singularidad idénticos, P-Delta sigue forzando denso).

**Por qué no ahora.** Es una tarea de arquitectura con sus propios gates, no un
cambio incremental. 1.4 era la parte que sí podía demostrarse bit a bit en una
sesión.

### P2 · El shell offline precachea 13.95 MB, la mitad invisible

**Evidencia.** `install` hace `cache.addAll(SHELL)` sobre **todos** los archivos
del build. De los 13.95 MB, 7.1 MB son ilustraciones estructurales PNG y de
esas la mitad exacta (3.6 MB) es el tema que el usuario no está viendo; otros
2.3 MB son `pdf.worker`. Además `addAll` es atómico: un solo archivo que falle
aborta la instalación entera.

**Propuesta.** Separar un shell crítico que debe instalarse sí o sí (documento,
chunk de entrada, CSS, fuentes, manifiesto) del resto, que el handler de
`fetch` ya cachea bajo demanda al primer uso. El coste es explícito y hay que
decidirlo: una ilustración de un tema no visitado deja de estar disponible sin
red hasta que se abre una vez.

**Por qué no ahora.** Cambia qué garantiza el modo offline. Eso es una decisión
de producto, no una optimización.

### P3 · Presupuesto de rendimiento sin techo

**Evidencia.** `scripts/check-performance-budget.mjs` declara
`eagerBytes: Infinity` y `eagerGzip: Infinity` con una decisión fechada
(«Fase 4, 2026-08-09: sin techo»). El gate mide y publica, pero no puede fallar.
Medición actual tras 1.5: **1 593 524 B eager / 404 696 B gzip**.

**Propuesta.** Convertirlo en trinquete: fijar el techo en la medición vigente
más un margen acordado (p. ej. +5 % → 425 000 B gzip) y subirlo sólo con una
decisión escrita. Es un cambio de dos líneas; lo que hace falta es revertir
conscientemente una decisión registrada, y eso te toca a ti.

### P4 · Los dos idiomas viajan en el chunk de entrada

**Evidencia.** `es` y `en` se declaran en el mismo módulo y `translate` los
indexa de forma síncrona, así que ambos catálogos entran en el chunk eager.
Calibrado con la medición de 1.5 (13.30 kB crudos y 3.51 kB gzip por 284
entradas), el idioma que el usuario **no** está usando pesa del orden de 25 kB
gzip: ~6 % de los 404.7 kB de carga inicial.

**Propuesta.** Cargar el catálogo activo por `import()` dinámico y mantener un
subconjunto mínimo síncrono para el arranque. Cambia `translate` de síncrono a
un contrato con estado de carga, y eso toca todas las superficies.

### P5 · Las recuperaciones crecen sin límite

**Evidencia.** `createRecovery` guarda un `ProjectModel` normalizado completo en
IndexedDB y **no existe ninguna poda**: ni por cantidad, ni por antigüedad, ni
por proyecto. Se crean en conflicto entre pestañas, en migración de esquema y
en **cada importación DXF** (`DxfImportDialog.tsx:111`). Un usuario que itera
sobre importaciones acumula una copia completa del proyecto por intento, para
siempre.

**Propuesta.** Retener las N más recientes por proyecto (N ≈ 20) y podar al
crear, o exponer la lista con borrado explícito en Project Hub.

**Por qué no ahora.** Es borrar datos del usuario. Aunque sean instantáneas de
seguridad, decidir cuántas sobreviven es tuyo, no mío.

### P6 · Superficies que ya no caben en un archivo

**Evidencia.** `StructuralCanvas.tsx` tiene 2 740 líneas y `solver.ts` 2 182;
`App.test.tsx` (949) e `Inspector.test.tsx` (934) van detrás. No hay defecto
demostrable asociado —el módulo funciona y está probado—, así que esto es
mantenibilidad, no corrección.

**Propuesta.** Si se toca, extraer por eje de responsabilidad (entrada de
puntero, capas de dibujo, gestos táctiles) con las pruebas que ya existen como
red. No proponerlo como tarea propia: hacerlo cuando una funcionalidad obligue
a entrar ahí de todos modos.

## Lo que no se tocó

Solver, unidades, signos, IDs, topología, `ProjectModel`, workers, persistencia,
import/export, undo/redo y resultados quedan invariantes salvo por 1.4, que es
una reescritura interna del ensamblado demostrada idéntica bit a bit y que no
cambia ninguna interfaz. No se añadieron dependencias. No se creó ninguna
superficie de usuario nueva. No se abrió ninguna capacidad de las que están en
investigación (CRI-49 a CRI-52): sus gates R0–R6 siguen siendo precondición.

## Cómo verificar

```powershell
npm.cmd run verify
npm.cmd run verify:space3d
npm.cmd run verify:structural-assets
npm.cmd run validate:ci
```

Estado en esta rama: `npm test` en **258 archivos y 2 443 pruebas verdes**
(8 saltadas), frente a los 2 fallos deterministas del SHA base. Lint,
`typecheck`, `verify:docs`, `verify:protected`, `verify:pwa`, `verify:i18n`,
`verify:space3d`, `verify:structural-assets`, `validate:ci` y `build` pasan.

## Pendiente

Las seis propuestas de la Parte 2 quedan abiertas y sin issue. P1 y P2 son las
que más valor mueven; P3 y P5 son las más baratas y ambas necesitan una
decisión tuya antes de tocarlas.
