# StructureCo Studio — dirección visual

**Clasificación:** `CANONICAL`

## Product intent

La revisión Studio, autorizada el 5 de septiembre de 2026, reorganiza la experiencia como un estudio de ingeniería. La presentación usa papel frío, paneles blancos, navegación azul profunda y controles planos de alta legibilidad. La portada reúne proyecto abierto, proyectos recientes, herramientas y biblioteca. El editor deja más atención al plano y permite concentración reversible.

La dirección sustituye la anterior apariencia de marfil y volumen clay. El código y las pruebas vigentes concretan esta dirección; brand/** conserva procedencia.

## Non-negotiable boundaries

- Preserve solver mathematics, signs, units, topology, workers, command semantics, ProjectModel, project persistence, import/export formats, undo/redo, and numerical results.
- Do not make a visual rearrangement by changing physical coordinates or analysis data.
- Preserve the existing explicit `{ kind, id }` selection authority and responsive composition broker.
- Preserve foreign work and the untracked mobile-density test log.
- Do not push or publish the source branch without explicit user approval.

## Visual grammar

- Interface/display: Instrument Sans Variable, bundled locally.
- Technical values: Geist Mono, bundled locally.
- Day: app `#F5F7F8`, canvas `#FFFFFF`, surface `#FFFFFF`, ink `#14232E`.
- Night: app `#101820`, canvas `#131F29`, surface `#1B2833`, ink `#EDF3F7`.
- Primary action: `#007D61` with white text.
- Technical colors in both themes: axial/point `#2F73C8`, shear `#168A6C`, distributed `#65A323`, result moment `#D85C4A`, applied moment `#C65F86`, deformation/selection `#7657D5`, influence `#B26B91`.
- Four surface depths: base, inset, raised, floating. Use thin borders and restrained single contact shadows; remove sculpted clay bevels.
- Motion uses controlled springs. Structural hero assembly lasts 400-600 ms and then stops. Reduced motion removes translation, morphing, and dock magnification.

## Structural illustration system

Create ten families with four topology variants each: portals, beams, cantilevers, trusses, slabs, space frames, supports, loads, sections, and connections. Product-facing illustrations are transparent Three.js-rendered PNG assets with deterministic Day/Night counterparts. The parametric vector renderer remains only as an editable studio/export fallback; it is never the primary image on Home, project cards, Generator, or template selection.

Home picks one portal illustration once per session. Project thumbnails use a curated library variant by project type, not a canvas screenshot.

## Home

Home has real views for Inicio, Proyectos, Plantillas, Aula entry, Importar, and Space 3D. Settings is a footer utility. Desktop uses a stable sidebar, tablet a compact rail, and mobile a header menu with no persistent bottom navigation.

Inicio muestra un título de tarea, Continuar/Nuevo, una ilustración estructural, hasta tres proyectos recientes reales y accesos Importar/Aula/Space 3D. Un directorio inferior lleva a Plantillas, Biblioteca y Estudio. Buscar herramientas se abre con botón o Cmd/Ctrl+K; Plantillas permite búsqueda sin acentos y filtros de familia. No se inventan personas, planes, métricas ni estado de análisis. Navegación lateral azul profunda, rail en tablet y menú en móvil.

## Illustration Studio

Settings contains a parameter editor for family, topology, visual proportions, material, camera, detail, and theme preview. Factory presets are immutable. Personal presets are stored separately from ProjectModel and can be renamed, duplicated, deleted, restored, and exported as transparent SVG or PNG at 1x/2x/4x.

## Workspace

El modo Concentración permite despejar controles secundarios y volver a la composición anterior. Home y Analizar permanecen accesibles.

Top Bar is one clean row: Home/project identity left; undo/redo, export, Analyze, status, and overflow right. Analyze is always visible, green, and white-labeled. Canvas-local controls move out of Top Bar.

The floating dock has four groups: Navigate, Create, Loads, Review. It is compact, uses structural icons, magnifies for fine pointers, auto-collapses on touch, and never exposes duplicate Cargas/Vista/Resultados text buttons. View contains grid, snap, camera, and layers.

Selection only highlights. Inspector owns actions and properties: 320-460 px resizable/pinnable on desktop, right overlay on tablet, 35/55/85% bottom sheet on mobile. Delete is last. No selection closes the Inspector.

Results shares the right slot on desktop, retains a large canvas diagram, uses one quantity bar, stacked compact cards, and a mobile carousel that rests collapsed and expands to at most 55%. Diagram and numeric semantics do not change.

## Other surfaces and copy

Datasheet, Model Doctor, Import Center, Generator, Project Hub, and Space 3D receive task-appropriate layouts with the same visual system. Aula conserva sus flujos internos y recibe los tokens comunes y la entrada revisada.

Spanish uses direct professional international wording and the term Modelo rather than Mesa. English remains semantically equivalent. UI errors say what happened and what to do without exposing internal codes. Technical logs retain diagnostic details.

## Acceptance

Every checkpoint provides six Day/Night captures: 1440x900, 834x1112, and 390x844. Chromium and WebKit must pass. Existing protected, command, selection, load presentation, import/export, Workspace, and numerical tests remain green. New behavior follows test-first red-green-refactor.
