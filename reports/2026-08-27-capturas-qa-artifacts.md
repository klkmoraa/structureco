# Capturas de QA en el directorio común de artefactos

La herramienta de capturas expone ahora el comando `npm run qa:captures` y
escribe tanto los PNG temporales como `capturas.zip` bajo
`qa-artifacts/capturas/`. La ruta raíz histórica `/capturas/` también queda
ignorada para impedir que salidas locales antiguas entren accidentalmente en
Git.

Se revisaron las referencias de documentación y automatización: ninguna usa
el antiguo directorio raíz ni invoca directamente `capturas.mjs`; las demás
menciones a capturas describen evidencias independientes y conservan sus rutas.
