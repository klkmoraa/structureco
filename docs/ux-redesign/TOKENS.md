# Tokens visuales - Fase 2

Fecha: 2026-07-17  
Fuente: referencias B y C del PDF rector de Fase 2.  
Implementación: `src/styles/tokens.css`.

## Taxonomía

1. **Primitivos:** paleta base, escala espacial y duraciones.
2. **Semánticos:** fondo, superficie, texto, borde, acción, foco, selección, estado, Aula y magnitudes técnicas.
3. **Layout y controles:** alturas, anchos de regiones, gutters y targets.
4. **Aliases temporales:** mantienen compatibles los nombres heredados mientras cada superficie migra por función.

## Roles de color

| Rol | Claro | Oscuro | Uso |
| --- | --- | --- | --- |
| Acción primaria | `#087A5B` | `#2BB98A` | Marca y acciones primarias. |
| Fondo de app | `#F3F5F4` | `#0D1110` | Fondo global. |
| Fondo de canvas | `#F8FAF9` | `#0A0E0D` | Lienzo técnico. |
| Superficie 1 | `#FFFFFF` | `#151A18` | Paneles. |
| Superficie 2 | `#EDF1EF` | `#1C2320` | Controles y agrupación. |
| Borde | `#D7DEDA` | `#2C3632` | Separadores. |
| Texto principal | `#17201C` | `#F2F6F4` | Lectura principal. |
| Texto secundario | `#5F6C66` | `#AAB5B0` | Apoyo y metadatos. |
| Foco/info | `#2867E8` | `#6EA0FF` | Focus ring e información. |
| Éxito | `#1C9560` | `#45C98A` | Estado resuelto. |
| Advertencia | `#D88408` | `#F0AA3C` | Advertencias y stale. |
| Error | `#D44848` | `#F26B6B` | Error/mecanismo. |
| Aula | `#7357D8` | `#9A83F0` | Identidad educativa secundaria. |
| Cargas | `#E25D32` | `#FF825C` | Magnitud técnica, separada de error. |

Los roles axial, cortante, momento, deformada, reacción, dimensión y ejes tienen tokens técnicos propios. Ningún estado reutiliza esos tokens como fuente de verdad semántica.

## Escalas

- Espacio: 4, 8, 12, 16, 20, 24, 32 y 40 px.
- Radio: 8, 10, 14 y 20 px.
- Tipografía: técnico/label 12 px, cuerpo/control 14 px, panel 17 px y pantalla 26 px.
- Controles: 36 px pequeño, 40 px desktop y 44 px touch.
- Movimiento: 140, 220 y 360 ms; todos se neutralizan con `prefers-reduced-motion`.
- Layout: TopBar, rail, inspector, resultados y gutter se exponen como tokens semánticos.

## Política de migración

Los aliases heredados (`--accent`, `--surface`, `--text`, `--force`, etc.) apuntan a roles `--sc-*`. No contienen una segunda paleta. Se retirarán sólo cuando las superficies restantes migren en fases posteriores; esta fase no realiza un rewrite global.
