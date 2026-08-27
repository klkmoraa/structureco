# Consolidación de las composiciones HyperFrames

Se auditaron las diez piezas de `motion/`. Sus `AGENTS.md`, `CLAUDE.md` y
`hyperframes.json` eran copias byte a byte; los `package.json` sólo diferían en el
nombre de la pieza.

## Decisión

- Las instrucciones viven una sola vez en `motion/AGENTS.md`.
- HyperFrames no consume `CLAUDE.md` durante preview, check o render; era orientación
  duplicada creada por el scaffold, así que se retiraron las diez copias.
- El CLI 0.7.90 trata cada carpeta como raíz de proyecto y espera allí
  `hyperframes.json`. Al no exponer herencia ni una ruta de configuración, se conserva
  una plantilla canónica y se materializa un archivo ignorado durante cada ejecución.
- `motion/package.json` centraliza los scripts sin declarar workspaces hijos: ya no hay
  paquetes distintos que instalar, y `meta.json` sigue siendo la identidad específica.
- No se añadieron dependencias. El wrapper mantiene el pin existente
  `hyperframes@0.7.90` y la verificación usa únicamente módulos integrados de Node.

## Verificación

`npm run verify:assets` analiza cada HTML, resuelve sus referencias locales desde la
carpeta de la pieza, exige al menos un audio y comprueba que `meta.json` sea JSON válido
con `id` y `name` iguales al nombre de carpeta. También se valida que preparar y limpiar
la configuración produzca exactamente la plantilla común.
