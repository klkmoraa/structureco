# Reportes de trabajo

**Clasificación:** `AUDIT/TEMPORARY`

Esta carpeta guarda sólo el handoff breve del trabajo activo: qué cambió, por qué, cómo se verificó y qué queda abierto. No es una fuente de verdad del producto.

- Crea un único reporte por cambio cohesivo.
- Las capturas y salidas regenerables de QA van en `reports/evidence/`, que está ignorado por Git.
- Los reportes, planes y capturas de fases cerradas se consultan desde el historial de Git, no desde el árbol operativo.
- Un handoff sólo permanece mientras su trabajo abierto pueda comprobarse en el árbol vigente. Al cerrarlo se elimina en el mismo cambio; no se acumulan bitácoras.
- El reporte de una consolidación documental es transitorio: registra el inventario en el commit que retira los reportes y debe salir del árbol en la siguiente consolidación.
- Confirma siempre cualquier afirmación con código, pruebas y gates actuales.

La jerarquía documental vive en [docs/README.md](../docs/README.md).
