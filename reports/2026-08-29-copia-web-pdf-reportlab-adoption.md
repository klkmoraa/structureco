# Adopción de PDF de Copia-web y anexo ReportLab

## Alcance

Se compararon `claude/pdfs-calculos-reales-5ebh2j`, `claude/pdf-diagrams-improvements-2vopp2`, `claude/pdf-formulas-katex-svg-muzav1` y `claude/pdf-preview-before-download-5r1bp3`. Las dos últimas ya son ancestros de la rama de diagramas y la rama de cálculos reales coincide con `main` en el punto portado.

## Resultado

- Se portó la arquitectura completa de la memoria: portada, índice, partes fluidas, marcadores, fórmulas vectoriales, sustituciones reales, once métodos, DCL por paso, materiales/secciones, resultados y adjunto portable.
- Se eliminaron los módulos antiguos que quedaron supersedidos y se añadió `sectionDimension` como unidad de presentación de perfiles.
- La vista previa permite activar o desactivar diagramas, alcance, procedimiento, DCL del método, materiales, anexo y traza educativa.
- ReportLab 4 genera un anexo vectorial adicional sin tocar el solver: DCL global, cargas nodales y de miembro, reacciones, diagramas N-V-M por miembro, saltos, extremos, estaciones y ecuaciones polinomiales con coeficientes reales.
- La aplicación intenta el acompañante local y conserva el PDF web completo como respaldo para GitHub Pages u operación sin Python.

## Verificación acotada

- `npm.cmd run typecheck`: correcto.
- Pruebas focales: 35/35 correctas (`calculationPdf`, `PdfPreviewDialog`, `TopBar`).
- `npm.cmd run build`: correcto; Vite conserva MathJax y el exportador como chunks diferidos.
- Servicio HTTP: `POST /enhance` devolvió un PDF válido de 17 páginas.
- Artefacto final: A4, 17 páginas, no cifrado, payload portable conservado.
- Inspección visual: portada, contenido, procedimiento, fórmulas, materiales, portada ReportLab, DCL global y diagramas exactos revisados en PNG.

## Fronteras

No se modificaron ecuaciones del solver, signos, topología, resultados ni workers para construir el PDF. ReportLab es una capa de dibujo local opcional porque Python no forma parte del runtime de una web estática.

## Ajuste visual técnico - 2026-08-29

La referencia aportada orientó el anexo hacia una memoria técnica didáctica, no una interfaz de tarjetas. Se redibujaron la portada, cabeceras, DCL, apoyos, acciones, tabla de reacciones y las gráficas individuales con la paleta y superficies mate de StructureCo. Se añadió una lámina global N-V-M: cada curva se dibuja en la orientación física de su barra, sobre la geometría completa, con relleno vectorial y valores de extremo.

Verificación mínima: `npm.cmd run pdf:reportlab -- tmp\\pdfs\\structureco-reportlab-base.pdf output\\pdf\\structureco-reportlab-restyled.pdf` completó correctamente. El PDF resultante es A4, contiene 18 páginas y sus cinco páginas ReportLab se revisaron como PNG; no hubo cambios en cálculo ni en el contrato portable.
