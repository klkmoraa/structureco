# 2026-08-27 — Seguimiento de regresiones visuales móviles

Estado: cambios locales sin commit. No se hizo push ni publicación.

## Correcciones verificadas

- El lienzo mantiene la composición K0 en los puntos de corte móvil, sin una columna de escritorio que comprima el área útil.
- Las acciones contextuales también están disponibles en K0 cuando hay una selección válida.
- Los selectores de coincidencia y solapamiento elevan su escenario mientras esperan una decisión, de modo que el dock no cubre sus acciones.
- En paisaje bajo el dock K0 vuelve a ser una columna de seis herramientas tocables, en vez de conservar una fila desplazable.
- El control de altura del inspector no intenta un detent que la vista corta normaliza al mismo tamaño; avanza a la siguiente altura disponible y conserva el botón de cierre entre 701 y 1023 px.

## Verificación realizada

- Pruebas focalizadas de Inspector y preferencias de layout: 49 correctas.
- Pruebas focalizadas de recuperación, repositorio, Home, barra superior y métricas: 41 correctas.
- Build de producción correcto.
- Recorrido Edge contra el build en X2 1440/1280, M1 1100/1024 y K0 390x844, 844x390 y 768x1024: sin fallos ni overflow horizontal. También verificó el barrido K0/M1/X2, teclado virtual y rotación.

## Límite de publicación

La evidencia valida el árbol local. GitHub Pages continúa en su revisión publicada anterior hasta que exista una autorización explícita para publicar.
