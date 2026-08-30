# Ramas y publicación de GitHub Pages

## Decisión

`main` permanece como única rama de desarrollo y rama predeterminada. GitHub Pages se
publica mediante Actions desde el `dist` construido en cada push a `main`; ya no consume
el contenido generado de `gh-pages`.

## Limpieza remota

Se conservan `main` y `gh-pages`. Se retiran las ramas de trabajo obsoletas y se cierran
sin fusionar los PR conflictivos #17 y #25: ambos eran cambios aislados que no deben
forzarse sobre el estado actual de `main`.
