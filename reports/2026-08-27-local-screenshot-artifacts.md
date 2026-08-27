# Capturas locales no versionadas

- Se retiraron del índice los PNG generados por el QA visual de CRI-91 y por el
  recorrido del prototipo iOS.
- Ambos scripts crean sus directorios de salida de forma recursiva, por lo que
  no necesitan archivos `.gitkeep`.
- Los destinos `validation/cri-91/evidence/` y
  `prototypes/ios-app/screenshots/` quedan ignorados explícitamente y sus README
  documentan los comandos de regeneración local.
