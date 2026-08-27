# Composiciones de motion

`motion/` es un único proyecto npm para las diez piezas. Cada composición conserva su
HTML, audio y metadata propios, pero comparte comandos e instrucciones.

## Fuentes y derivados

Son **fuente versionada**:

- `AGENTS.md`: instrucciones comunes para todos los agentes y composiciones.
- `package.json` y `scripts/`: comandos comunes, preparación y verificación.
- `hyperframes.template.json`: configuración canónica de HyperFrames.
- `<pieza>/index.html`, `<pieza>/meta.json`, `<pieza>/assets/` y `<pieza>/vendor/`:
  composición, metadata, medios y runtime específicos de cada pieza.
- Los briefs u otros documentos que existan dentro de una pieza.

Es **derivado temporal ignorado** `<pieza>/hyperframes.json`. HyperFrames 0.7.90 busca
la configuración en la raíz de proyecto y no ofrece herencia ni una opción pública de
ruta de configuración, por lo que el wrapper copia la plantilla antes de invocarlo y
la elimina al terminar. `CLAUDE.md` no es una entrada de runtime de HyperFrames; las
copias generadas por el scaffold se eliminaron en favor del `AGENTS.md` común.

## Uso

Desde `motion/`:

```bash
npm run verify:assets
npm run check -- 01-brand-reveal
npm run dev -- 01-brand-reveal
npm run render -- 01-brand-reveal
npm run check:all
```

`prepare:compositions` materializa los diez `hyperframes.json` para herramientas que
se ejecuten directamente dentro de cada pieza. Son temporales: no deben incluirse en
commits. Los wrappers `dev`, `check`, `render` y `publish` preparan y limpian el archivo
de una sola pieza automáticamente. La versión del CLI sigue fijada en `0.7.90` y no se
añaden dependencias al repositorio.
