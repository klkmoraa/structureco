# Workspace móvil a ancho completo

## Resultado

- Corregida la composición `K0`: el workspace, el lienzo y la bandeja de herramientas ocupan ahora todo el ancho del viewport.
- El cambio es exclusivamente de layout; no modifica solver, unidades, signos, IDs, topología, persistencia ni resultados.

## Causa

Al cargar el workspace desde su chunk diferido, `phase1.css` podía quedar después de `canvas/phase2.css`. La plantilla base de escritorio recuperaba entonces tres columnas (`76px 0px 320px`) y reducía el lienzo móvil a 76 px.

## Corrección

`phase1.css` declara la cuadrícula compacta con el selector de la clase real del shell:

```css
.app-shell[data-shell-class='K0'] .workspace {
  grid-template-columns: minmax(0, 1fr);
  grid-template-rows: minmax(0, 1fr) auto;
}
```

La QA del shell registra además los anchos de workspace, lienzo y dock, y falla si alguno deja de coincidir con el viewport en `K0`.

## Verificación

- Build de producción: correcto.
- Lint: correcto.
- Prueba enfocada de presentación del workspace: 7/7.
- Navegador, build de producción, 390×844: `K0`, cuadrícula `390px`, workspace/lienzo/dock `390px`, overflow horizontal `0`, consola sin errores ni advertencias.
- Navegador, build de producción, 1440×900: `X2`, workspace `1440px`, consola sin errores ni advertencias.

La publicación de `main` y `gh-pages` se valida por separado para no confundir el código fuente con el artefacto desplegado.
