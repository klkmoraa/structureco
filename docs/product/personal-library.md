# Biblioteca personal — contrato de interacción seguro

**Clasificación:** `REFERENCE`

**Estado:** contrato aprobado para CRI-40; la implementación debe conservar Model v6 y la especificación visual canónica.

## Decisión

La Biblioteca será una vista top-level de Home, hermana de Proyectos y Plantillas. Sirve para buscar y administrar favoritos personales. Project Hub no los posee ni los copia dentro de un proyecto.

Workspace ofrece dos puntos compactos de uso:

- Inspector de miembro: guardar y aplicar material, sección o par material-sección.
- Vista: guardar y aplicar un conjunto puramente visual del canvas.

La administración completa —crear, buscar, renombrar, duplicar, borrar y restaurar— vive en Biblioteca. Inspector/Vista conservan una acción primaria: **Aplicar**; guardar usa un nombre explícito y no abre otra superficie.

## Enfoques considerados

| Enfoque | Ventaja | Riesgo | Decisión |
|---|---|---|---|
| Biblioteca Home + uso compacto en Workspace | Separa administración personal del proyecto y mantiene aplicación en contexto | Dos presentaciones deben compartir el mismo repositorio | **Elegido** |
| Modal de biblioteca dentro del Workspace | Todo ocurre sin salir del modelo | Crea otra autoridad de superficie y compite con Inspector/Results | Descartado |
| Favoritos sólo dentro de los selects | Mínima UI | No resuelve búsqueda, papelera, pares ni preferencias visuales | Descartado |

## Límites de dominio

- Un favorito no es catálogo normativo, receta, miembro ni fuente de verdad del solver.
- Materiales y secciones favoritos guardan IDs explícitos de los catálogos actuales; nunca guardan coincidencias de E, G, densidad, A o I.
- Aplicar resuelve el ID vigente y copia propiedades numéricas + identidad mediante los comandos explícitos existentes.
- Un par se aplica como una operación atómica y un solo paso de undo.
- No se guardan cargas, combinaciones, apoyos, geometría, liberaciones, resortes, efectos iniciales ni modos de análisis.
- Una vista favorita sólo contiene `theme` y el contrato vigente `CanvasViewSettings`; no contiene selección, herramienta, resultados, análisis ni layout del broker.
- La biblioteca usa su propia clave de `localStorage`; nunca se serializa en `ProjectModel`, JSON, `.structureco` o IndexedDB de proyectos.
- Renombrar, duplicar, borrar o restaurar un favorito no recorre ni modifica proyectos.
- Borrar mueve a papelera. Restaurar exige que el nombre vuelva a ser único; un conflicto se presenta y no sobrescribe.
- La desaparición de una entrada de catálogo deja el favorito como no disponible. No intenta recuperar identidad por números o nombres parecidos.

## Modelo persistido

```ts
type PersonalFavorite =
  | PersonalMaterialFavorite
  | PersonalSectionFavorite
  | PersonalPairFavorite
  | PersonalViewFavorite;

interface PersonalFavoriteBase {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
  unitsAtSave: UnitSystemId;
}

interface PersonalMaterialFavorite extends PersonalFavoriteBase {
  kind: 'material';
  materialId: string;
}

interface PersonalSectionFavorite extends PersonalFavoriteBase {
  kind: 'section';
  sectionId: string;
}

interface PersonalPairFavorite extends PersonalFavoriteBase {
  kind: 'pair';
  materialId: string;
  sectionId: string;
}

interface PersonalViewFavorite extends PersonalFavoriteBase {
  kind: 'view';
  theme: ThemeMode;
  view: CanvasViewSettings;
}
```

Clave: `structureCo.personal-library.v1`. Envelope: `{ schemaVersion: 1, favorites: PersonalFavorite[] }`.

No se inventa una versión de catálogo. La UI muestra **Catálogo integrado**, IDs explícitos, unidades al guardar y fecha de actualización. Si los catálogos publican una versión verificable en el futuro, requiere una migración de schema propia.

## Operaciones

### Crear/guardar

- El nombre se recorta y es obligatorio.
- Los nombres activos son únicos sin distinguir mayúsculas/minúsculas.
- Material/sección/par sólo se crean si todos los IDs existen en los catálogos actuales.
- Inspector sólo permite guardar identidad `catalog`; un miembro `custom`, `imported` o `legacy` explica por qué no está disponible.
- Vista captura exactamente el estado visible al confirmar.

### Aplicar

- La acción siempre nombra el destino: «Aplicar a M4» o «Aplicar esta vista».
- Material y sección usan `member.material.apply` y `member.section.apply`.
- Par usa `selection.bulk.apply` con un solo miembro, ambas identidades y el snapshot vigente; no hay dos commits de historial.
- Vista usa una actualización explícita de `CanvasViewSettings` y `setTheme`; no invalida resultados.
- Si el miembro cambió o desapareció antes de confirmar un par, el snapshot rechaza la operación y la UI pide reintentar.

### Renombrar/duplicar

- Renombrar no cambia el payload técnico.
- Duplicar genera un ID nuevo, conserva el payload y solicita/propone un nombre único.
- Ninguna operación se aplica automáticamente al proyecto abierto.

### Borrar/restaurar

- Borrar sólo añade `deletedAt` y saca el favorito de los aplicadores.
- Papelera muestra el contenido técnico para reconocerlo.
- Restaurar limpia `deletedAt`. Si el nombre activo ya existe, devuelve conflicto sin alterar la biblioteca.

### Buscar

La búsqueda normalizada cubre nombre, tipo, ID de material/sección, nombre de catálogo, familia/estándar y unidades. Los filtros son Todos, Materiales, Secciones, Pares, Vistas y Papelera.

## Navegación y flujos

### Home

`Biblioteca` aparece en navegación principal después de Plantillas. La vista usa:

```text
┌ Biblioteca personal ──────────────────────────────────────┐
│ [Buscar…________________] [Todos][Material][Sección]…     │
│                                                         │
│ Nombre                Tipo     Origen / IDs      Acciones│
│ Acero + IPE 300       Par      a992 · ipe-300   ⋯       │
│ Vista de diagramas    Vista    kN-m · 24 ago    ⋯       │
│                                                         │
│ [+ Crear favorito]          [Papelera 1]                │
└─────────────────────────────────────────────────────────┘
```

En K0 cada fila se apila en dos líneas contenidas; no se convierte en una tarjeta hero. Buscar y filtros permanecen antes de la lista.

### Inspector de miembro

```text
Biblioteca personal
[Favorito________________▼] [Aplicar]
[Nombre__________________] [Guardar material/sección/par]
Origen: catálogo · IDs explícitos
```

Sólo aparecen material, sección y par activos/resolubles. Aplicar mantiene la selección y usa la autoridad de comandos del proyecto.

### Vista

```text
Vistas guardadas
[Vista____________________▼] [Aplicar]
[Nombre__________________] [Guardar vista actual]
```

## Estados y copy

| Estado | Copy/acción |
|---|---|
| Vacío | «Todavía no guardas favoritos. Créalo aquí o desde el Inspector.» |
| Sin resultados de búsqueda | «No hay favoritos que coincidan con esta búsqueda.» |
| Identidad no catalogada | «Este miembro no tiene una identidad de catálogo explícita. Selecciona un material o sección antes de guardarlo.» |
| Catálogo ausente | «La referencia guardada ya no está disponible. El favorito no se aplicó.» |
| Nombre duplicado | «Ya existe un favorito activo con ese nombre.» |
| Restauración en conflicto | «No se restauró porque ese nombre ya está en uso. Renombra uno de los dos.» |
| Almacenamiento no disponible | «No se pudo guardar la biblioteca en este dispositivo. El proyecto no cambió.» |
| Aplicación obsoleta | «El miembro cambió antes de aplicar el par. Revisa y vuelve a intentarlo.» |
| Borrado | «Favorito movido a Papelera. Los proyectos no cambiaron.» |

## Responsive y accesibilidad

- X2/M1/K0 derivan del shell/Home vigente; la Biblioteca no introduce breakpoints propios contradictorios.
- Targets táctiles visibles miden al menos 44 px bajo puntero coarse.
- La lista usa `ul/li` o tabla sólo cuando todas las columnas permanecen legibles; en K0 usa lista semántica.
- Menús de acciones tienen nombre visible/accesible y Escape devuelve foco al disparador.
- Los filtros son botones con `aria-pressed`; el resultado de búsqueda se anuncia con `aria-live=polite` sin releer toda la lista.
- Errores usan `role=alert`; estados exitosos usan `role=status`.
- Día/Noche usan tokens actuales. Material, sección, error y papelera no dependen sólo de color.
- Reduced motion elimina transiciones no esenciales.

## Criterios de aceptación

1. CRUD, papelera, restauración, búsqueda y persistencia tienen pruebas puras y de UI.
2. Un favorito corrupto/futuro no rompe la app ni se reescribe silenciosamente.
3. Un error de escritura no modifica la clave del proyecto.
4. Aplicar material/sección/par conserva IDs explícitos; reescribir floats nunca recupera identidad.
5. El par produce un solo paso de undo/redo.
6. Borrar o editar el favorito después de aplicarlo deja el proyecto byte-for-byte igual.
7. Vista favorita cambia sólo theme/`CanvasViewSettings` y no invalida `AnalysisResult`.
8. Home y Workspace pasan ES/EN, Día/Noche, X2/M1/K0, teclado, overflow y targets táctiles.
9. `verify:protected`, tests de ProjectCommand/Inspector/Home, build y gates de documentación pasan.

## Fuera de alcance

- Sincronización cloud, cuentas, colaboración o compartir bibliotecas.
- Import/export de favoritos.
- Catálogos personalizados con propiedades numéricas editables.
- Presets de cargas, combinaciones, apoyos, miembros completos o cálculo.
- Modificar o migrar proyectos existentes cuando cambia la biblioteca.
