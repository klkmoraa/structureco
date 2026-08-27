# Guía de motion graphics

## Runtime compartido de GSAP

Las diez composiciones cargan GSAP desde `motion/_shared/vendor/gsap.min.js`. Esa es la
única copia versionada (GSAP 3.14.2); no se deben restaurar copias dentro de cada pieza.
Después de cambiar una entrada o el runtime, valida todas las rutas desde la raíz:

```bash
node motion/_shared/validate-runtime.mjs
```

## Workspace autocontenido para HyperFrames

El HTML usa `../_shared/vendor/gsap.min.js`, una ruta válida al servir el árbol `motion/`.
Cuando HyperFrames necesite recibir una pieza en un workspace temporal autocontenido,
prepáralo antes de ejecutar `preview`, `check` o `render`:

```bash
workspace="$(mktemp -d)"
project="$(motion/_shared/prepare-workspace.sh 01-brand-reveal "$workspace")"
cd "$project"
npm run check       # o npm run dev / npm run render
```

El preparador copia la pieza y la fuente canónica conservando la misma estructura y ruta
relativa. El destino es temporal: no se versiona y se puede borrar al terminar. Los renders
que deban conservarse se copian fuera del workspace antes de eliminarlo.
