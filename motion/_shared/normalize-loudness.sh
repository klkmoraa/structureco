#!/usr/bin/env bash
# structureCo — campaign loudness normalisation
#
# Renders come out between roughly -13 and -20 LUFS depending on how many sound
# marks a piece carries. Across one campaign that swing is audible when the
# viewer moves from one video to the next, so every master is brought to a
# single integrated target. Video is stream-copied — only audio is re-encoded.
#
# Target: -15 LUFS integrated, -1.5 dBTP ceiling, 11 LU range. Chosen over the
# -14 broadcast/streaming convention to keep a little headroom for the quiet
# openings these pieces rely on.
#
# Usage: ./normalize-loudness.sh <input.mp4> [output.mp4]
#        (with no output path, the file is normalised in place)

set -euo pipefail

IN="${1:?input mp4 required}"
OUT="${2:-}"
TARGET_I=-15
TARGET_TP=-1.5
TARGET_LRA=11

INPLACE=0
if [ -z "$OUT" ]; then
  INPLACE=1
  OUT="${IN%.mp4}.norm.mp4"
fi

# Pass 1 — measure. loudnorm prints its JSON at info level, so the log level
# has to stay at info for the measurement to be readable at all.
MEASURED=$(ffmpeg -v info -i "$IN" \
  -af "loudnorm=I=$TARGET_I:TP=$TARGET_TP:LRA=$TARGET_LRA:print_format=json" \
  -f null - 2>&1 | tr -d '\n' | grep -o '{[^{}]*"input_i"[^{}]*}')

get() { echo "$MEASURED" | grep -o "\"$1\"[^,}]*" | sed 's/.*: *"//; s/"//'; }

I=$(get input_i)
TP=$(get input_tp)
LRA=$(get input_lra)
THRESH=$(get input_thresh)
OFFSET=$(get target_offset)

# Pass 2 — apply, with the measured values so the correction is exact and
# deterministic rather than the single-pass estimate.
ffmpeg -y -v error -i "$IN" \
  -af "loudnorm=I=$TARGET_I:TP=$TARGET_TP:LRA=$TARGET_LRA:measured_I=$I:measured_TP=$TP:measured_LRA=$LRA:measured_thresh=$THRESH:offset=$OFFSET:linear=true:print_format=summary" \
  -c:v copy -c:a aac -b:a 192k "$OUT" 2>/dev/null

if [ "$INPLACE" = "1" ]; then
  mv -f "$OUT" "$IN"
  OUT="$IN"
fi

echo "normalised $(basename "$OUT")  (was ${I} LUFS → ${TARGET_I} LUFS)"
