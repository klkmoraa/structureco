# CRI-11 · Fase A · harness de prototipado

Entorno de prototipado **aislado y navegable** para poner a prueba la dirección
UX cerrada por CRI-7/8/9/10 **antes** de tocar StructureCo de producción.

No es la aplicación. No ejecuta el solver. Todos sus datos son fixture, y la
interfaz está obligada a decirlo en pantalla.

```
prototypes/cri-11-harness/     ← vive aquí, con su propio package.json
src/**                         ← NO se modifica. Sólo se leen dos hojas de estilo.
```

## Abrirlo

```bash
npm --prefix prototypes/cri-11-harness install
npm --prefix prototypes/cri-11-harness run dev
```

Abre `http://localhost:5211`. A la izquierda está el panel del laboratorio; a la
derecha, el prototipo dentro de un marco del tamaño elegido.

Otros comandos:

```bash
npm --prefix prototypes/cri-11-harness run test:resolver   # 18 pruebas, sin navegador
npm --prefix prototypes/cri-11-harness run build
npm --prefix prototypes/cri-11-harness run smoke           # recorrido real en Chromium
```

`smoke` necesita un `build` previo; deja capturas y un resumen en
`reports/evidence/2026-08-15-cri-11-fase-a/` y sale con código 1 si hay un solo
error de consola o una aserción incumplida.

## Ejes del harness

Ninguno requiere reescribir el escenario ni recargar la página — ése es el gate
de la Fase A.

| Eje | Valores |
|---|---|
| Escenario | `portal-basic` · `dense-selection` · `datasheet-2000` (2 038 entidades) |
| Viewport | 10 presets de 320×568 a 1920×1080, o **ventana real** |
| Orientación | retrato · apaisado |
| Input | ratón · táctil · mixto |
| Tema | Día · Noche |
| Idioma | es-MX · en-US |
| Modo | Esencial · Completa |
| Motion | normal · reducido |
| Voz de marca | A instrumental · B contextual · C técnica · D la línea vigente a retirar |
| Estado | `current` · `stale` · `limited` · `unreliable` · `failed` · `offline` · `recovery` |
| Histéresis | 0–120 px (U-13: es el parámetro del experimento, no una constante) |

El panel muestra además la **lectura del resolutor**: composición resuelta,
viewport medido, lienzo en reposo y con detalle, y qué reglas CB se cumplen.

## Arquitectura

Es la Alternativa D de CRI-9 —resolutor puro + broker de superficies— con un
solo árbol de slots. No hay un compositor por clase de espacio.

| Capa | Archivo | Qué hace |
|---|---|---|
| 3 · Sensor de entorno | `src/core/environment.ts` | **El único** módulo que lee `matchMedia` o mide el viewport |
| 4 · Resolutor | `src/core/resolver.mjs` | Función pura: viewport → composición. Port calibrado de CRI-9 |
| 5 · Broker | `src/core/broker.ts` | Ocupación, `peek`, suspensión, retorno de foco, anuncios |
| 6 · Superficies | `src/app/*.tsx` | Una implementación por superficie, tres presentaciones |
| — | `src/core/fixtures.ts` | Modelos sintéticos deterministas |
| — | `src/core/analysis.ts` | Máquina de estados y evidencia **simulada** |
| — | `src/core/commands.ts` | `CommandRegistry`: un `commandId`, varias rutas |
| — | `src/core/telemetry.ts` | Sink local exportable a JSON |
| — | `src/core/surfaces.ts` | Catálogo de 18 superficies + ledger de capacidad |

Nadie escribe `1024`. La clase de espacio es la **salida** del presupuesto de
lienzo, no una etiqueta de ancho: la frontera Expanded↔Medium se calcula y
depende de la altura (1042–1130 px).

## Qué es fixture

**Todo.** El modelo, los resultados, los proyectos recientes y la duración del
cálculo. Ni una cifra sale del solver de StructureCo.

- El chip `FIXTURE` está en la TopBar, en el bloque de resultados y en el pie.
- Cada valor numérico de resultado lleva `data-fixture="true"` en el DOM.
- `src/core/analysis.ts` declara en su cabecera que no hay solver.

Lo que **sí** es real, y se conserva a propósito: la terminología, las unidades,
los signos, la forma de los identificadores y los contratos de estado —
`success ≠ reliable ≠ safe`, `stale` fail-closed, la causa de fiabilidad en un
elemento enfocable.

## Reglas que este prototipo respeta

- No toca `src/**`, `package.json`, gates, tokens ni documentación canónica.
- No copia el solver ni implementa un segundo análisis.
- No crea una paleta ni una librería visual paralela: importa
  `src/design-system/tokens.css` y `components/ui.css` sin modificarlos.
- No diseña Aula vNext. Space3D sigue experimental y fuera de alcance.
- El lienzo se mantiene plano: ninguna sombra clay sobre vigas, cotas o valores.
