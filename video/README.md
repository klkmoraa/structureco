# Motion graphics Clay de structureCo

Piezas de video hechas con [Remotion](https://remotion.dev) sobre la identidad
Clay oficial. Es un proyecto **aislado**: tiene su propio `package.json` y sus
propias dependencias, y no toca las de la aplicación.

## Por qué Remotion y no HyperFrames

El servidor MCP de HyperFrames deshabilita `compose` y `render_video` cuando
quien llama es un agente con sistema de archivos local (Claude Code, Cursor,
Codex), justamente para que las composiciones vivan como archivos versionables
en el repositorio. Remotion cumple eso mismo con React y TypeScript, que es lo
que la aplicación ya usa, y permite lo que aquí importa de verdad: **leer el
motor real de structureCo y animar sus resultados**.

## Las cuatro piezas

| Composición | Formato | Duración | De qué habla |
|---|---|---|---|
| `Manifiesto` | 1920×1080 (16:9) | 25 s | Qué es structureCo y de qué material está hecha su interfaz. |
| `Analisis2D` | 1080×1920 (9:16) | 20 s | El flujo real: modelar → cargar → resolver → leer. |
| `Aula` | 1080×1350 (4:5) | 16 s | El modo pedagógico y su regla: predecir antes de calcular. |
| `Space3D` | 1920×1080 (16:9), tema Noche | 15 s | El dominio espacial S3D-1, con sus límites declarados en pantalla. |

## Los números en pantalla son del motor, no inventados

`Analisis2D` y `Aula` muestran deformada, diagrama de momentos, reacciones y
valores numéricos de un pórtico de un vano (6 × 4 m, columnas empotradas, 20
kN/m sobre la viga y 30 kN de empuje horizontal). Esas curvas y esas cifras se
obtienen ejecutando `analyzeProject` de `src/engine/solver.ts` —el mismo solver
de la aplicación— y congelando la salida en `src/data/escena-portico.json`.

```powershell
node scripts/generar-escena.mjs
```

El script levanta Vite en modo SSR contra la raíz del repositorio, importa el
motor, resuelve el pórtico y escribe el JSON. No modifica nada de la aplicación.
Si el motor cambia, se vuelve a correr y el video cambia con él.

El logotipo sigue el mismo criterio: `scripts/extraer-logo.mjs` transcribe la
geometría de `brand/logo.svg` a `src/components/logoPath.ts`. `brand/**` es
fuente protegida y no se edita ni se redibuja a ojo.

## Uso

```powershell
npm.cmd install

# Previsualización interactiva con línea de tiempo
npm.cmd run studio

# Renderizar todo a out/*.mp4
npm.cmd run render:all

# Una sola pieza
npm.cmd run render:manifiesto

# Fotogramas de portada en out/stills/
npm.cmd run still:all
```

Remotion descarga su propio Chrome Headless Shell la primera vez. Si el entorno
ya trae uno (contenedores de CI, imagen de Playwright), evita la descarga con:

```bash
REMOTION_BROWSER_EXECUTABLE=/ruta/a/headless_shell npm run render:all
```

## Cómo está armado

```
src/
  lib/theme.ts       Tokens leídos de brand/brandbook-clay.html
  lib/clay.ts        Las cuatro recetas de sombra y la regla salido/hundido
  lib/motion.ts      Curvas y muelles del brandbook llevados a Remotion
  lib/portico.ts     Proyección modelo → pantalla de la escena resuelta
  lib/fonts.ts       IBM Plex Sans y Mono desde public/fonts
  components/        Escenario, Tarjeta, Píldora, Botón, Logo, Pórtico, Texto
  compositions/      Una por pieza
  data/              escena-portico.json (generado)
```

Las reglas de la identidad se respetan en el código, no sólo en el resultado:
una pieza usa **una** receta de sombra (nunca salida y hundida a la vez), y
ningún color técnico aparece sin la magnitud que representa al lado.

## Límites de estas piezas

- Los videos no llevan audio.
- El pórtico de la escena es un caso concreto y fijo; no es un banco de pruebas
  del motor ni sustituye a las suites de `src/engine`.
- `Space3D` dibuja un marco espacial en alambre con una proyección propia y
  sencilla: ilustra el dominio, no reproduce la vista 3D de la aplicación.
