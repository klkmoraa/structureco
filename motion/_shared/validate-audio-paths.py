#!/usr/bin/env python3
"""Validate local MP3 references in every motion HTML composition."""

from pathlib import Path
import re
import sys

MOTION_ROOT = Path(__file__).resolve().parent.parent
AUDIO_SRC = re.compile(r'<audio\b[^>]*\bsrc=["\']([^"\']+\.mp3)["\']', re.IGNORECASE)
errors: list[str] = []
references = 0

for html in sorted(MOTION_ROOT.rglob("*.html")):
    source = html.read_text(encoding="utf-8")
    for match in AUDIO_SRC.finditer(source):
        references += 1
        src = match.group(1)
        if "://" in src or src.startswith("data:"):
            errors.append(f"{html.relative_to(MOTION_ROOT)}: non-local MP3 reference: {src}")
            continue
        target = (html.parent / src).resolve()
        try:
            target.relative_to(MOTION_ROOT)
        except ValueError:
            errors.append(f"{html.relative_to(MOTION_ROOT)}: path leaves motion/: {src}")
            continue
        if not target.is_file():
            errors.append(f"{html.relative_to(MOTION_ROOT)}: missing MP3: {src}")

for asset in sorted(MOTION_ROOT.glob("[0-9][0-9]-*/assets/*.mp3")):
    if asset.name != "bed.mp3":
        errors.append(f"local shared-effect copy remains: {asset.relative_to(MOTION_ROOT)}")

if errors:
    print("Audio path validation failed:", file=sys.stderr)
    for error in errors:
        print(f"- {error}", file=sys.stderr)
    raise SystemExit(1)

print(f"Validated {references} local MP3 references; every target exists.")
