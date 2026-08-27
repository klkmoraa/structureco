# Extracción cohesiva de módulos visuales

Se dividió el catálogo bilingüe en dominios de espacio de trabajo, análisis, modelado, resultados e intercambio, conservando `catalogs.ts` como contrato agregado y todas las claves. El gate de uso i18n ahora descubre los módulos españoles del catálogo.

En la interfaz se extrajeron las tarjetas internas del editor de datasheet, los controles de historial y configuración P-Delta de la barra superior, y las capas visuales/equipo de interacción estable del canvas. Los coordinadores conservan sus props, callbacks y el registro central de comandos.

La frontera protegida se verificó después de cada extracción. No se modificaron archivos protegidos, solver, modelo, persistencia, IDs, unidades, signos ni resultados.
