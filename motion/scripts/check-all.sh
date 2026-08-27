#!/bin/sh
set -eu

motion_dir=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
for composition in "$motion_dir"/[0-9][0-9]-*; do
  [ -d "$composition" ] || continue
  "$motion_dir/scripts/run-hyperframes.sh" check "${composition##*/}"
done
