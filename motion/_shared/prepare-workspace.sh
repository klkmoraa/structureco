#!/usr/bin/env bash
set -euo pipefail

usage() {
  echo "Usage: $0 <composition> <temporary-workspace>" >&2
  exit 64
}

[[ $# -eq 2 ]] || usage

script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
motion_dir="$(dirname -- "$script_dir")"
composition="${1%/}"
destination="$2"
source_dir="$motion_dir/$composition"

[[ "$composition" != */* && -f "$source_dir/index.html" ]] || {
  echo "Unknown motion composition: $composition" >&2
  exit 66
}

rm -rf -- "$destination"
mkdir -p -- "$destination/motion/_shared/vendor" "$destination/motion/$composition"
cp -a -- "$source_dir/." "$destination/motion/$composition/"
cp -- "$script_dir/vendor/gsap.min.js" "$destination/motion/_shared/vendor/gsap.min.js"

test -r "$destination/motion/$composition/../_shared/vendor/gsap.min.js"
printf '%s\n' "$destination/motion/$composition"
