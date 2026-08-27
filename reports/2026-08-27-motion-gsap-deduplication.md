# GSAP compartido para motion graphics

Se confirmó que las diez copias originales correspondían a GSAP 3.14.2 y compartían el
SHA-256 `c174bfce53a729418d57a8ad8625e7247c793a22fef8e2851e3cfa3de9cd8280`.

Se consolidó el runtime en `motion/_shared/vendor/gsap.min.js`, se actualizaron las diez
entradas y se añadió validación estática. Para las operaciones de HyperFrames que aíslan
una pieza, `motion/_shared/prepare-workspace.sh` genera un workspace temporal con la pieza
y el runtime, sin reintroducir copias versionadas.
