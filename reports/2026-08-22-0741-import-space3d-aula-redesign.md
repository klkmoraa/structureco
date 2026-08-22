# Import Center, Space 3D y Aula — cierre visual

**Clasificación:** AUDIT/TEMPORARY

**Fecha:** 2026-08-22 07:41

**Rama:** `codex/clay-workspace-phase-2`

## Qué cambió

- Import Center concentra sus seis estados internos en tres fases visibles: **Revisar, Decidir y Abrir**. La lógica de lectura, comparación, guardado e importación no cambió.
- Space 3D prioriza el lienzo. En móvil, proyecto y capas viven dentro de **Controles 3D**; en escritorio, Modelo e Inspector comparten una única bandeja lateral.
- Los códigos internos de diagnósticos 3D dejaron de mostrarse como texto de interfaz, pero siguen disponibles como atributos de datos para soporte técnico.
- Aula dejó de ser una tarjeta vacía: muestra una entrada visual, accesos directos a viga, armadura y pórtico, y un constructor de ejercicios con miniaturas estructurales reales.
- El constructor de Aula se adaptó a teléfono como hoja inferior con carrusel horizontal y parámetros compactos.
- Se humanizó la voz de Import Center, Space 3D y Aula, y las acciones verdes usan texto blanco.

## Por qué

La composición anterior dedicaba demasiado espacio a controles secundarios y convertía varias superficies en formularios apilados. Esta fase recupera la jerarquía acordada: estructura y lienzo primero, comandos compactos, profundidad clay mate y decisiones progresivas sin duplicar funciones.

## Archivos tocados

- `src/features/import-export/ImportCenterDialog.tsx`
- `src/features/import-export/ImportCenterDialog.test.tsx`
- `src/features/space3d/Space3DWorkspace.tsx`
- `src/features/space3d/Space3DWorkspace.test.tsx`
- `src/features/space3d/space3d.css`
- `src/features/welcome/WelcomeScreen.tsx`
- `src/features/welcome/NewExerciseDialog.tsx`
- `src/features/welcome/NewExerciseDialog.test.tsx`
- `src/features/welcome/welcomeFlow.test.tsx`
- `src/features/welcome/totalHome.css`
- `src/features/welcome/newExerciseDialog.css`
- `src/i18n/catalogs.ts`
- `src/styles.css`

## Cómo verificar

```powershell
npm.cmd test -- src/features/import-export/ImportCenterDialog.test.tsx src/features/space3d/Space3DWorkspace.test.tsx src/features/welcome/NewExerciseDialog.test.tsx src/features/welcome/welcomeFlow.test.tsx src/features/welcome/totalRedesignHome.test.tsx --reporter=dot
npm.cmd run typecheck
npm.cmd run verify:protected
```

Resultado observado:

- 5 archivos de prueba, 60 pruebas aprobadas.
- TypeScript sin errores.
- Frontera protegida intacta: 38 archivos verificados.
- Revisión visual manual en 390 × 844 y 1440 × 960.

## Pendientes

- No se hizo `push`; requiere confirmación explícita del usuario.
- El archivo ajeno `reports/evidence/2026-08-21-clay-mobile-density-phase-5/full-test.log` permanece sin seguimiento y fuera de este cambio.
