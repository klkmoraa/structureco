# Design QA — ACM estructural continuo

Source visual truth: `C:\Users\crisd\.codex\codex-remote-attachments\01a04b91-4c1b-79f0-8947-9112814763a9\30AEB190-AF32-422F-B7EF-46D0FF453216\2-Foto-2.jpg`.

Implementation evidence: browser-rendered StructureCo workspace using the analyzed `Pórtico de ejemplo` with ACM active.

- Desktop viewport: 1280x900 CSS px, density 1. Reference is a beam and the implementation is a pórtico, so only the requested reading grammar is compared: original structure separate above; complete N/V/M diagrams outside it; exact curves, values and fills below/alongside it.
- Mobile viewport: 390x844 CSS px, density 1. ACM displays the original pórtico followed by N, V and M full-structure replicas down the canvas. Zoom controls remain below the final diagram.
- Interaction tested: analyze example, close results overlay, enable ACM.
- Console: no warnings or errors during the visual checks.

**Comparison history**

- [P1] Earlier implementation used three framed mini-card replicas. Fixed by removing panel frames, preserving the complete topology in every diagram and switching wide pórticos to full-width side-by-side replicas.
- [P1] Earlier mobile reading could be mistaken for chart cards. Fixed by vertically sequencing the three complete diagrams without frames or overlays.

**Required fidelity surfaces**

- Fonts and typography: existing StructureCo Instrument Sans/Geist hierarchy remains; only compact technical labels are added.
- Spacing and layout rhythm: N/V/M share a consistent lane rhythm; mobile retains a dedicated camera-control shelf.
- Colors and visual tokens: fills use StructureCo technical axial, shear and moment colors; no green vector-analysis layer was added.
- Image quality and asset fidelity: this is a live solver-driven structural SVG visualization, not a decorative image; it renders exact result segments and jumps.
- Copy and content: labels are N, V, M plus the existing localized quantity names and solved readings.

final result: passed
