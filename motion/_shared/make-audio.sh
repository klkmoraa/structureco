#!/usr/bin/env bash
# structureCo — campaign audio bed generator
#
# Synthesises the shared low atmospheric bed used under every video in the
# 10-piece campaign. Deliberately synthesised rather than pulled from a stock
# library: the brief asks for "pulsos graves suaves" and explicitly rules out
# generic epic library music. Deterministic — same args always produce the
# same file.
#
# Usage: ./make-audio.sh <seconds> <output.mp3>

set -euo pipefail

DUR="${1:?duration in seconds required}"
OUT="${2:?output path required}"

FADE_IN=2.0
FADE_OUT=2.5
FADE_OUT_START=$(awk "BEGIN{printf \"%.3f\", $DUR - $FADE_OUT}")

# Three stacked low partials (A1, E2, A2) — a hollow fifth, no third, so the
# bed reads as instrumentation rather than as music with a key/mood.
# Lowpass at 320Hz keeps it under the SFX; the slow tremolo keeps it breathing.
ffmpeg -y -v error \
  -f lavfi -i "sine=frequency=55:duration=$DUR:sample_rate=48000" \
  -f lavfi -i "sine=frequency=82.41:duration=$DUR:sample_rate=48000" \
  -f lavfi -i "sine=frequency=110:duration=$DUR:sample_rate=48000" \
  -filter_complex "\
    [0:a]volume=0.50[a0]; \
    [1:a]volume=0.22[a1]; \
    [2:a]volume=0.11[a2]; \
    [a0][a1][a2]amix=inputs=3:normalize=0[mix]; \
    [mix]lowpass=f=320,\
      tremolo=f=0.14:d=0.22,\
      volume=0.10,\
      afade=t=in:st=0:d=$FADE_IN,\
      afade=t=out:st=$FADE_OUT_START:d=$FADE_OUT,\
      aformat=sample_fmts=s16:channel_layouts=stereo[out]" \
  -map "[out]" -t "$DUR" -c:a libmp3lame -b:a 128k "$OUT"

echo "bed → $OUT (${DUR}s)"
