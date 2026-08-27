#!/bin/sh
set -eu

motion_dir=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
template="$motion_dir/hyperframes.template.json"

for composition in "$motion_dir"/[0-9][0-9]-*; do
  [ -d "$composition" ] || continue
  cp "$template" "$composition/hyperframes.json"
  printf 'prepared %s\n' "${composition##*/}/hyperframes.json"
done
