#!/usr/bin/env bash
#
# Compila la web y la deja dentro del paquete iOS.
#
# `ios/StructureCo/Web` es salida de build y no se versiona: es exactamente el
# mismo `dist/` que se publica en la web, así que duplicarlo en Git significaría
# dos copias del producto que se pueden desincronizar sin que nadie lo note.
#
#   ./ios/Scripts/sync-web.sh          compila y sincroniza
#   ./ios/Scripts/sync-web.sh --skip-build   sólo sincroniza el dist existente
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
DIST="$ROOT/dist"
TARGET="$ROOT/ios/StructureCo/Web"

if [[ "${1:-}" != "--skip-build" ]]; then
  echo "→ npm run build"
  (cd "$ROOT" && npm run build)
fi

if [[ ! -f "$DIST/index.html" ]]; then
  echo "No hay build web en $DIST. Ejecuta 'npm run build' primero." >&2
  exit 1
fi

rm -rf "$TARGET"
mkdir -p "$TARGET"
cp -R "$DIST/." "$TARGET/"

# El service worker es de la PWA y aquí sobra: dentro del shell nativo el
# contenido ya viaja en el paquete, y un worker cacheando un esquema propio sólo
# añade una segunda copia y un aviso de actualización que nunca llega.
rm -f "$TARGET/sw.js"

echo "✓ Web sincronizada en ios/StructureCo/Web ($(find "$TARGET" -type f | wc -l | tr -d ' ') archivos)"
