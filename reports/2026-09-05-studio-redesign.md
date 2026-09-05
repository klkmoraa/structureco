# StructureCo Studio

**Clasificación:** `AUDIT/TEMPORARY`

Rama: `codex/structureco-studio-redesign`. Base: `f433d428d2dafebc08c9c70554d402976b03b772`. Rediseño solicitado el 5 de septiembre de 2026.

## Entrega

- Inicio reorganizado: proyecto abierto, recientes reales, accesos y directorio; navegación profunda azul, rail en tablet y menú móvil.
- Búsqueda de herramientas con Cmd/Ctrl+K, selección con flechas/Enter, Escape, retorno del foco y coincidencias sin acentos.
- Plantillas con búsqueda, familias Vigas/Pórticos/Armaduras y restablecimiento de filtros.
- Tokens Day/Night renovados; superficies planas, bordes finos y sombras cortas en editor, inspector y resultados.
- Concentración accesible desde Top Bar, reutilizando la preferencia existente y conservando Inicio/Analizar. Resultados móviles limitados a 42dvh/360px; Analizar conserva 44px.
- 14 skills oficiales de Superpowers instaladas globalmente en `~/.codex/skills`, fuera del repositorio. Sin nuevas dependencias del producto.

No se modificaron solver, ProjectModel, formatos, persistencia, undo/redo ni cálculos. No se publicó la rama.

## Revisión visual

Referencias generadas y capturas comparadas directamente, conservadas fuera de Git en el almacenamiento de imágenes de Codex y temporales de QA.

| Criterio | Implementación y comprobación |
| --- | --- |
| Jerarquía | Título principal, proyecto abierto y Continuar/Nuevo dominan Inicio. |
| Composición | Recientes y herramientas forman dos columnas; se apilan en móvil. |
| Navegación | Sidebar azul en escritorio, rail con nombres accesibles en tablet, menú en móvil. |
| Color | Papel frío/blanco y grafito nocturno; verde principal #007D61 y acento nocturno legible #76CBB5. |
| Densidad | Controles compactos, targets móviles de 44px, resultados con desplazamiento interno. |
| Teclado | Búsqueda, Escape, foco restituido al lanzador persistente y concentración reversible. |
| Modelo real | Pórtico con 4 nodos y 3 miembros analizado; momento absoluto 36.3484 kN·m en M2. |

Desviaciones intencionales: se conserva el logo vectorial vigente y la biblioteca de ilustraciones deterministas en lugar de la ilustración conceptual; los recientes son datos locales reales. El editor conserva dock y broker responsivo existentes en lugar de convertir la referencia conceptual en una barra lateral fija. No se usa una imagen generada como interfaz.

## Validación

- `npm run verify`: aprobado, incluyendo lint, documentación, contratos protegidos, PWA, puente nativo, i18n, CSS, pruebas, tipado/build y rendimiento. Entrada: 1.349.984 bytes / 370.425 gzip, dentro de 1.400.000 / 380.000.
- Revisión independiente aprobada después de corregir columnas K0 y mínimos táctiles de 44px.
- Chromium y WebKit: búsqueda, filtros, concentración, análisis y ausencia de errores en 1440×900, 834×1112 y 390×844, con temas claro/oscuro.
- QA WebKit existente: iPhone 13 e iPad Pro 11 pasan importación JSON/PDF inteligente, desplazamiento de Inicio, diálogos y controles táctiles visibles.
- Suite completa final: 313 archivos aprobados; 2.753 pruebas correctas y 5 omitidas. Hoja de datos: 15/15. Una ejecución anterior mostró tres fallos intermitentes de foco en esta suite sin cambios; la repetición completa y la ejecución aislada pasaron.

Script reproducible: `node scripts/qa-studio-redesign.mjs` y la variante `--chromium`, después de `npm run build`; capturas y JSON quedan en el directorio temporal del sistema. La copia de entrega está en `reports/evidence/studio-2026-09-05/` (ignorada por Git). Se reutiliza el aislamiento de actualizaciones PWA del runner existente para evitar recargas externas durante los recorridos. El gate de PWA se ejecuta por separado.

## Límites

La instalación global requiere iniciar una sesión nueva de Codex para garantizar que todas las skills se carguen. Los flujos internos de Aula, importadores y herramientas especializadas conservan su comportamiento y reciben los tokens compartidos. La validación móvil usa emulación de navegador; no representa una ejecución nativa en un iPhone físico.
