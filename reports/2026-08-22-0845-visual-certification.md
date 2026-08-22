# Certificación visual transversal y alineación de contratos

**Fecha:** 2026-08-22 08:45
**Agente:** Codex
**Rama:** codex/clay-workspace-phase-2

## Qué cambió
Se recorrieron en navegador las superficies principales del rediseño: Inicio, Proyectos, Plantillas, Aula, Importar, Space 3D, Workspace, paleta de comandos y modos Día/Noche. La revisión no encontró desbordes horizontales ni una discrepancia visual que justificara modificar estilos sin evidencia.

Durante la certificación apareció una expectativa antigua en `WelcomeScreen.test.tsx`: el flujo ya mostraba «Construye en tres dimensiones» / «Build in three dimensions», pero dos pruebas todavía buscaban «Modelo espacial» / «Spatial model». Se alinearon esas expectativas con el texto visible actual.

## Por qué
La verificación debe comprobar la interfaz real después de los cambios de voz y de Space 3D. El fallo era del contrato de prueba, no de la interacción: la sección se abría, la imagen estructural estaba presente y el botón «Abrir Space 3D» seguía ejecutando la acción explícita.

## Archivos tocados
- `src/features/welcome/WelcomeScreen.test.tsx` — nombres accesibles actualizados al copy vigente de Space 3D.

## Cómo verificar
- Auditoría en navegador a 1280 px: Inicio, Proyectos, Plantillas, Aula, Importar y Space 3D sin overflow horizontal.
- Revisión visual de Workspace en Día/Noche y de Inicio en Día/Noche.
- `npm.cmd test -- src/features/welcome/WelcomeScreen.test.tsx src/features/welcome/WelcomeHeader.test.tsx src/features/welcome/welcomeFlow.test.tsx src/features/workspace/CommandPalette.test.tsx src/features/results/DenseResultsSurface.test.tsx src/features/results/ResultsPanel.test.tsx src/features/results/InfluenceLineView.test.tsx src/features/import-export/ImportCenterDialog.test.tsx src/features/space3d/Space3DWorkspace.test.tsx` — 9 archivos, 98 pruebas aprobadas y 3 omisiones existentes.
- `npm.cmd run typecheck`
- `npm.cmd run verify:protected` — 38 archivos verificados.

## Pendiente / siguiente paso
La certificación transversal queda cerrada para esta rama. Lo siguiente es la revisión visual del usuario y, si aparece una discrepancia concreta, una corrección puntual. No se tocó motor, solver, persistencia, formatos ni canvas estructural.
