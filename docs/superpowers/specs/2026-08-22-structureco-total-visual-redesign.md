# StructureCo Total Visual Redesign

**Clasificación:** `CANONICAL`

## Product intent

Replace the complete presentation layer with a hard matte structural-instrument identity derived from the user-supplied reference boards. The repository Brandbook and earlier Clay visual plans are historical for visual decisions in this project. They remain useful only for implementation provenance and nonvisual safety contracts.

The product must feel precise, tactile, compact, and structurally grounded. Day uses warm ivory; Night uses deep petroleum. Technical colors do not change between themes. There is no glassmorphism, decorative glow, glossy chrome, or generic SaaS dashboard composition.

## Non-negotiable boundaries

- Preserve solver mathematics, signs, units, topology, workers, command semantics, ProjectModel, project persistence, import/export formats, undo/redo, and numerical results.
- Do not make a visual rearrangement by changing physical coordinates or analysis data.
- Preserve the existing explicit `{ kind, id }` selection authority and responsive composition broker.
- Preserve foreign work and the untracked mobile-density test log.
- Do not push or publish the source branch without explicit user approval.
- Preview publication through Sites is authorized for review checkpoints. Email delivery to `crisdlm302@gmail.com` is authorized for those checkpoint links and image packs.

## Visual grammar

- Interface/display: Instrument Sans Variable, bundled locally.
- Technical values: Geist Mono, bundled locally.
- Day: app `#F3EEE4`, canvas `#FBF8F2`, surface `#F7F1E8`, ink `#102B2D`.
- Night: app `#07161B`, canvas `#0B1D23`, surface `#112830`, ink `#F3F0E8`.
- Primary action: `#007D61` with white text.
- Technical colors in both themes: axial/point `#2F73C8`, shear `#168A6C`, distributed `#65A323`, result moment `#D85C4A`, applied moment `#C65F86`, deformation/selection `#7657D5`, influence `#B26B91`.
- Four surface depths: base, inset, raised, floating. Use short contact shadows and defined borders.
- Motion uses controlled springs. Structural hero assembly lasts 400-600 ms and then stops. Reduced motion removes translation, morphing, and dock magnification.

## Structural illustration system

Create ten families with four topology variants each: portals, beams, cantilevers, trusses, slabs, space frames, supports, loads, sections, and connections. Each illustration is a transparent parametric SVG with `hero`, `card`, and `compact` detail levels, automatic Day/Night rendering, material choice, deterministic geometry, and SVG/PNG export.

Home picks one of all forty illustrations once per session. Project thumbnails use a curated library variant by project type, not a canvas screenshot.

## Home

Home has real views for Inicio, Proyectos, Plantillas, Aula entry, Importar, and Space 3D. Settings is a footer utility. Desktop uses a stable sidebar, tablet a compact rail, and mobile a header menu with no persistent bottom navigation.

Inicio shows compact Continue/New actions, one random structural hero, exactly three recent projects with name and last edit only, and compact Import/Aula/Space 3D access. It must not show invented people, plans, metrics, reliability, or analysis status.

## Illustration Studio

Settings contains a parameter editor for family, topology, visual proportions, material, camera, detail, and theme preview. Factory presets are immutable. Personal presets are stored separately from ProjectModel and can be renamed, duplicated, deleted, restored, and exported as transparent SVG or PNG at 1x/2x/4x.

## Workspace

Top Bar is one clean row: Home/project identity left; undo/redo, export, Analyze, status, and overflow right. Analyze is always visible, green, and white-labeled. Canvas-local controls move out of Top Bar.

The floating dock has four groups: Navigate, Create, Loads, Review. It is compact, uses structural icons, magnifies for fine pointers, auto-collapses on touch, and never exposes duplicate Cargas/Vista/Resultados text buttons. View contains grid, snap, camera, and layers.

Selection only highlights. Inspector owns actions and properties: 320-460 px resizable/pinnable on desktop, right overlay on tablet, 35/55/85% bottom sheet on mobile. Delete is last. No selection closes the Inspector.

Results shares the right slot on desktop, retains a large canvas diagram, uses one quantity bar, stacked compact cards, and a mobile carousel that rests collapsed and expands to at most 55%. Diagram and numeric semantics do not change.

## Other surfaces and copy

Datasheet, Model Doctor, Import Center, Generator, Project Hub, and Space 3D receive task-appropriate layouts with the same visual system. Aula's internal redesign is deferred; only global compatibility and its current entry are preserved.

Spanish uses direct professional international wording and the term Modelo rather than Mesa. English remains semantically equivalent. UI errors say what happened and what to do without exposing internal codes. Technical logs retain diagnostic details.

## Acceptance

Every checkpoint provides six Day/Night captures: 1440x900, 834x1112, and 390x844. Chromium and WebKit must pass. Existing protected, command, selection, load presentation, import/export, Workspace, and numerical tests remain green. New behavior follows test-first red-green-refactor.
