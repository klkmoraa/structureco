# StructureCo · Clay Compact y Generator · Fase 4

**Clasificación:** `AUDIT/TEMPORARY`

## Objetivo aprobado

Corregir los defectos visuales reales del Workspace sin tocar motor, modelo, solver, persistencia, comandos estructurales, import/export ni resultados. La autoridad visual es el Brandbook adjunto: Clay mate, superficies sólidas, relieve corto y definido, fondo marfil en Día, noche profunda funcional, sin glassmorphism.

## Evidencia de los defectos

- En M1 el shell resuelve correctamente un riel compacto de `76px`, pero una regla CSS tardía vuelve a reservar `164px`. El contenido icon-only mide aproximadamente `47px`, por lo que quedan unos `108px` inutilizables.
- `Cargas`, `Vista` y `Resultados` son rutas reales hacia superficies del broker, pero se renderizan como botones HTML sin componente ni jerarquía visual, flotando encima del lienzo.
- Generator vive fuera del broker: en X2 flota correctamente, pero en M1 y K0 queda por debajo del Inspector porque usa `z-index: 25` y el Inspector `z-index: 31`.

## Diseño

### 4A · Riel y navegación de superficies

- X2 conserva riel etiquetado.
- M1 usa exactamente el token compacto de `76px`, botones icon-only de 48px, tooltips por hover/foco y sin columna vacía.
- K0 conserva el dock inferior y la hoja táctil `Más`.
- Cargas de análisis, Vista y Resultados pasan a ser acciones Clay dentro del grupo de navegación del riel. En K0 aparecen dentro de `Más`; no flotan sobre el canvas.
- Se mantienen separados de las herramientas de colocación de carga: “Cargas de análisis” abre casos/combinaciones; las herramientas Puntual/Distribuida/Momento siguen creando cargas.

### 4B · Generator como superficie del Workspace

- El broker incorpora `generator` como herramienta invocada y conserva su borrador mientras esté suspendida.
- X2: panel flotante a la derecha, con el ghost visible.
- M1: panel `inset` que gana la ranura contextual y suspende temporalmente Inspector/Resultados/Vista, evitando superposición.
- K0: hoja media sobre el dock, conservando al menos media pantalla de canvas para el ghost.
- Cerrar Generator reanuda la superficie anterior y devuelve el foco al lanzador.

### Identidad visual de Generator

- Selector de familias mediante tarjetas Clay con ilustraciones vectoriales transparentes para las cinco familias ya funcionales: viga continua, pórtico, marco multinivel, cercha y retícula.
- Selección hundida, borde técnico, presión física breve y sin brillo.
- Formularios agrupados en Geometría, Colocación y Propiedades; revisión y confirmación existentes se conservan.
- No se inventan Viga simple, Voladizo, Losa ni Marco espacial: requieren decisiones estructurales de apoyos/topología y serán una fase funcional separada.

## Accesibilidad y movimiento

- Objetivos táctiles mínimos de 44px, nombres accesibles, foco visible y retorno de foco.
- La animación física sigue habilitada por defecto. `prefers-reduced-motion` conserva el override de seguridad del sistema.
- Las superficies suspendidas permanecen montadas, pero no visibles ni enfocables.

## Fuera de alcance

- Ningún cambio de matemática, signos, unidades, IDs, solver, resultados, persistencia o formatos.
- Ninguna nueva familia estructural funcional.
- Ningún merge a `main`.
