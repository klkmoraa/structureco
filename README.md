# structureCo — Contexto único del proyecto

## Qué es

structureCo es una aplicación web local-first para modelar, analizar y explicar estructuras planas 2D. Corre completamente en el navegador con React, TypeScript y Vite: no depende de un backend. El modelo se guarda localmente y puede intercambiarse como JSON, SVG, PNG, PDF y expedientes `.structureco`.

La fuente de verdad es el código bajo `src/`; este archivo concentra el contexto humano vigente. Se retiraron los reportes, propuestas, fases, capturas y documentos históricos que duplicaban o describían estados ya superados.

## Lo que está implementado

### Modelado y edición

- Editor gráfico para nodos, barras, apoyos, conexiones, cargas puntuales, distribuidas y momentos.
- Elementos de marco, viga y armadura; liberaciones, offsets rígidos, resortes, rótulas, cortes, cotas, selección múltiple, snapping y deshacer/rehacer.
- Propiedades de material y sección, perfiles normalizados, unidades métricas e imperiales y validación de entradas.
- Persistencia local con recuperación ante datos corruptos y migración de versiones de proyecto.

### Análisis estructural

- Método directo de rigidez para estructuras 2D, con formulaciones Euler–Bernoulli y Timoshenko.
- Casos y combinaciones de carga, asentamientos, temperatura, deformaciones iniciales, vínculos rígidos y mecanismos.
- Cálculo de desplazamientos, reacciones, acciones internas, equilibrio, compatibilidad, condición numérica y auditoría independiente de cargas.
- Diagramas N/V/M y deformada, envolventes, análisis P-Delta y líneas de influencia con trenes de carga.

### Resultados, exportación y aprendizaje

- Panel de resultados trazable con tablas, diagramas, extremos y explicaciones del método.
- Exportación SVG, PNG, CSV, PDF y expediente portable; importación validada de JSON, `.structureco` y PDF compatible.
- Modo Aula con ejercicios, guías, predicciones y progreso local.
- Interfaz en español e inglés, tema claro/oscuro, navegación por teclado, foco en diálogos y diseño responsive para escritorio, tablet y móvil.

## Arquitectura vigente

```text
src/main.tsx
  └─ App.tsx
      └─ ProjectProvider
          └─ AppShell
              ├─ bienvenida
              └─ WorkspaceShell (carga diferida)
                  ├─ barra superior y herramientas
                  ├─ canvas estructural
                  ├─ inspector
                  ├─ resultados
                  ├─ importación/exportación
                  └─ modo Aula
```

- `src/features/`: superficies de interfaz por dominio.
- `src/design-system/`: tokens, tipografía, componentes e iconografía.
- `src/engine/`: solver, diagramas, envolventes, influencia, P-Delta y verificaciones numéricas.
- `src/workers/`: análisis asíncrono con fallback seguro en el hilo principal.
- `src/data/`, `src/store/` y `src/types.ts`: modelo, migraciones, persistencia, historial y contratos.
- `src/utils/`: formato numérico, importación/exportación y construcción de PDFs.

## Contratos que no se deben romper

Las rutas `src/engine/**`, `src/workers/**`, `src/data/**`, `src/store/ProjectContext.tsx` y `src/types.ts` son la frontera protegida. En ellas viven el solver, unidades, signos, topología, IDs, formatos de archivo, migraciones, persistencia, historial y resultados matemáticos.

Una tarea visual o de mantenimiento no debe modificar esa frontera sin autorización explícita. `scripts/protected-baseline.sha256` guarda los hashes que verifica el gate local.

Los assets de `public/` son parte del producto: favicon, manifiesto, iconos y fuentes IBM Plex. No se eliminan como artefactos históricos.

## Calidad y comandos

En PowerShell usa los ejecutables `.cmd`:

```powershell
npm.cmd run lint
npm.cmd test
npm.cmd run build
npm.cmd run verify
npm.cmd run qa
npm.cmd run qa:webkit
```

`npm.cmd run verify` ejecuta lint, frontera protegida, suite de Vitest, build y presupuesto de rendimiento. La verificación más reciente previa a esta consolidación aprobó 99 archivos de prueba y 741 pruebas.

## Contenido deliberadamente retirado

Se eliminaron reportes de sesiones, propuestas, planes, fases, matrices de QA históricas, capturas comparativas, PDFs de entrega y scripts que solo generaban esos documentos. También se limpiaron los directorios generados `dist/`, `qa-artifacts/` y `output/` cuando no contienen código fuente.

Se conservan los wrappers locales de Sites y los respaldos externos al producto porque son recursos de publicación o recuperación, no documentación duplicada. No forman parte del build, lint ni tests de la aplicación principal.

## Estado de consolidación

Esta es la única documentación humana vigente del repositorio. Para saber qué hace una parte concreta, usa el código y sus pruebas cercanas; para validar cambios, ejecuta el gate completo antes de declarar éxito.
