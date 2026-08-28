# CRI-141 — Inspector contextual coordinado con Resultados

El Inspector de detalle ahora tiene tres estados de presentación locales: oculto, resumen y edición completa. El encabezado del detalle siempre ofrece cierre visible y accesible; en el resumen ofrece también «Editar todo». Ambos controles conservan la misma autoridad de selección y no cambian geometría, propiedades ni historial.

Al abrir Resultados con el Inspector de detalle ya abierto, el Inspector cede una vez a su resumen de 200 px. Así conserva el objeto y los resultados rápidos seleccionados, pero quita formularios y la vista previa de la ruta visual. Si la persona elige editar, el editor completo vuelve y esa decisión ya no se sobrescribe mientras Resultados siga abierto. La elección se persiste sólo en la preferencia local de layout, no en el proyecto.

Validación focal: `Inspector.test.tsx`, `AppShellLayout.test.tsx` y `useWorkspaceLayoutPreferences.test.tsx` (50 pruebas), además de `tsc --noEmit`.

Pendiente para cierre: validación E2E de los anchos 1024/1365/1920, lectura táctil con dispositivo y una sesión de uso para medir el flujo localizar→editar→resultados. No se modificó el modelo, el solver ni las unidades.
