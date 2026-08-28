# Retiro de barra flotante de selección

- Se eliminó la barra inferior del lienzo que mostraba «Editar selección», «Borrar» y el menú de acciones.
- El Inspector conserva las rutas explícitas de edición y borrado; los atajos de teclado de copiar, pegar, duplicar, repetir y borrar no cambiaron.
- Se retiraron la superficie derivada, estilos y pruebas que sólo sostenían esa barra.

## Validación

- `npm.cmd run verify:i18n` pasó sin claves sin consumidor.
- `npx.cmd vitest run src/App.test.tsx --maxWorkers=1 --pool=threads --no-file-parallelism --testNamePattern "keeps selection actions"` pasó (1 prueba).
- `npm.cmd exec vitest run src/features/workspace/surfacePresentation.test.ts --maxWorkers=1 --pool=threads --no-file-parallelism` pasó (15 pruebas).
- `npm.cmd run build` pasó.
- La comprobación visual automatizada no se ejecutó porque Chrome/Chromium no está instalado en este equipo; no se añadieron dependencias.
