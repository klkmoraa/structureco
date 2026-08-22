# Cierre visual de utilidades, Influencia y entrada a Space 3D

**Fecha:** 2026-08-22 08:18
**Agente:** Codex
**Rama:** codex/clay-workspace-phase-2

## Qué cambió
Se cerraron tres superficies que todavía rompían la identidad nueva: la entrada de Space 3D en Inicio, la paleta global de comandos y el acceso a resultados densos. Space 3D ahora presenta una escena estructural real y una composición propia; la paleta funciona como un centro compacto de comandos con cierre táctil; y el menú de Reacciones, Influencia y Aprender ya no queda recortado por el panel compacto.

También se corrigió una contradicción cromática: Influencia usaba el violeta de Deformada pese a contar con su propio rosa arcilla. La interfaz y la superposición del lienzo consumen ahora `--sc-color-influence-line`, con la misma identidad en Día y Noche. El selector DXF nativo se integró al lenguaje Clay y se humanizaron los textos principales de Influencia en español e inglés.

## Por qué
La auditoría visual en navegador mostró dos defectos objetivos: la tarjeta genérica de Space 3D dejaba una gran zona sin propósito y el menú de resultados densos sólo hacía visible «Reacciones» porque la contención de pintura recortaba las otras opciones. Además, el color de Influencia contradecía la decisión explícita del rediseño de reservar el rosa para esa herramienta.

## Archivos tocados
- `src/features/welcome/WelcomeScreen.tsx` — nueva entrada funcional de Space 3D con imagen estructural, capacidades y textos bilingües.
- `src/features/welcome/totalHome.css` — composición responsive de Space 3D para escritorio y móvil.
- `src/features/welcome/welcomeFlow.test.tsx` — contrato de imagen estructural y apertura directa de Space 3D.
- `src/features/workspace/CommandPalette.tsx` — cabecera visible, cierre táctil y jerarquía de centro de comandos.
- `src/features/workspace/CommandPalette.test.tsx` — contrato del cierre explícito.
- `src/features/workspace/phase1.css` — menú de resultados densos desplegado hacia el lienzo, sin quedar cortado.
- `src/features/results/InfluenceLineView.test.tsx` — expectativas actualizadas para la voz más humana.
- `src/i18n/catalogs.ts` — microcopy de Influencia en español e inglés.
- `src/import/dxf/dxfImport.css` — selector de archivo DXF con materia, borde y estados Clay.
- `src/styles.css` — paleta compacta en dos columnas, rosa propio de Influencia y correcciones de tokens/contención.

## Cómo verificar
- `npm.cmd run typecheck`
- `npm.cmd run verify:protected`
- `npm.cmd test -- src/i18n/catalogs.test.ts src/features/results/InfluenceLineView.test.tsx src/features/workspace/CommandPalette.test.tsx src/features/welcome/welcomeFlow.test.tsx src/design-system/tokens.test.ts src/design-system/totalRedesignFoundation.test.ts`
- Revisión visual real en `http://127.0.0.1:5173/`: Space 3D en Día/Noche y 390 × 844; paleta en escritorio/móvil; menú completo de resultados densos; Influencia en rosa arcilla; DXF en Noche.

## Pendiente / siguiente paso
El bloque queda cerrado. La siguiente fase del plan puede concentrarse en la certificación visual transversal y en pulir cualquier discrepancia que aparezca durante el recorrido final de todas las rutas. No se tocó motor, solver, persistencia, formatos ni canvas estructural.
