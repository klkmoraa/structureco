# 2026-08-27 — CRI-140 · seguimiento de recuperación multitab

Estado: cambios locales sin commit. No se hizo push ni publicación.

## Alcance aplicado

- La biblioteca de proyectos se lee como una instantánea coherente de proyectos y recuperaciones.
- Restaurar una recuperación conserva una copia manual, reemplaza la revisión activa y resuelve la recuperación original en una misma transacción.
- Las pestañas notifican guardados, congelan la escritura ante una divergencia y convierten la edición local en una recuperación antes de mostrar el resolvedor.
- El Home muestra horas, conteos, caso activo, estado de análisis almacenado y diferencias resumidas entre la revisión guardada y la recuperada. La decisión se confirma explícitamente.
- La otra revisión se abre como una geometría de sólo lectura con nudos, barras y resumen de cargas; no dispone de acciones de edición ni de guardado.
- Las métricas locales y opcionales registran sólo agregados de recuperación y decisión.

## Verificación realizada

- Pruebas focalizadas finales de repositorio, Home, barra superior y métricas: 41 correctas. La pasada focalizada anterior de aplicación completó 76 pruebas.
- Build de producción correcto.
- Recorrido Edge contra el build: dos pestañas y escrituras alternadas, cierre abrupto, vista de geometría sólo lectura, duplicación de ambas versiones, restauración con backup manual, migración histórica de IndexedDB y recarga offline. Todo correcto.

## Límites aún explícitos

- La comparación no inventa resultados: el análisis no se persiste y se comunica como no almacenado.
- La vista de sólo lectura se limita deliberadamente a la geometría y metadatos de la revisión; no abre un segundo editor ni altera el modelo activo.

## Nota de gate

La suite completa de Vitest se inició con ejecución serial, pero quedó detenida después del aviso jsdom `Not implemented: navigation to another Document`, sin emitir casos. Se detuvo ese proceso propio tras confirmar la inmovilidad; no se considera un resultado verde. Las pruebas focalizadas y el recorrido real sí completaron correctamente.
