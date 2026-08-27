#!/bin/sh
set -eu

version=0.7.90
motion_dir=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
command=${1:-}
composition=${2:-}

case "$command" in
  preview|check|render|publish) ;;
  *)
    echo "usage: npm run <dev|check|render|publish> -- <composition>" >&2
    exit 2
    ;;
esac

case "$composition" in
  [0-9][0-9]-*) ;;
  *)
    echo "composition must be a directory name such as 01-brand-reveal" >&2
    exit 2
    ;;
esac

project="$motion_dir/$composition"
if [ ! -f "$project/index.html" ] || [ ! -f "$project/meta.json" ]; then
  echo "unknown or incomplete composition: $composition" >&2
  exit 2
fi

config="$project/hyperframes.json"
cleanup() {
  rm -f "$config"
}
trap cleanup EXIT HUP INT TERM
cp "$motion_dir/hyperframes.template.json" "$config"

cd "$project"
npx --yes "hyperframes@$version" "$command"
