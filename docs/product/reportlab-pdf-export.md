# Exportación PDF con ReportLab

StructureCo conserva dos capas deliberadamente separadas:

1. El navegador compone la memoria completa: portada, contenido, cálculo por método, fórmulas con sustituciones reales, materiales, resultados y el payload portable firmado.
2. El acompañante local de ReportLab permite componer una lámina técnica adicional desde la línea de comandos. No resuelve ni modifica el modelo.

La exportación normal y su vista previa producen siempre una sola memoria web cohesiva. Así no aparece un anexo automático con una dirección gráfica distinta. La separación es necesaria porque la publicación de StructureCo es una aplicación web estática y Python no puede ejecutarse dentro del navegador.

## Iniciar el acompañante

Las dependencias están declaradas en `requirements-reportlab.txt`. Se necesita Python con ReportLab 4 y pypdf 6.

```powershell
npm.cmd run pdf:reportlab-service
```

El servicio escucha únicamente en `127.0.0.1:8765` para el uso local explícito. La vista previa normal muestra `Generador web` porque no incorpora páginas de un proceso externo.

Para usar otro intérprete de Python:

```powershell
$env:STRUCTURECO_PYTHON = 'C:\ruta\python.exe'
npm.cmd run pdf:reportlab-service
```

## Uso por línea de comandos

Un PDF nativo de StructureCo ya contiene `structureco-payload.json`, por lo que puede mejorarse sin exportar archivos intermedios:

```powershell
npm.cmd run pdf:reportlab -- entrada.pdf salida.pdf
```

## Autoridad y respaldo

- Los números provienen del `ProjectModel` y `AnalysisResult` embebidos por el navegador.
- ReportLab sólo dibuja y pagina; no recalcula reacciones, esfuerzos ni desplazamientos.
- La lámina técnica opcional traza N, V y M siguiendo la geometría real de la estructura, con segmentos polinomiales, discontinuidades, estaciones críticas y ecuaciones numéricas por miembro.
- El PDF mejorado conserva el documento original, sus marcadores, metadatos y el adjunto portable.
- El servicio local no participa en la exportación habitual, así que su disponibilidad no condiciona la memoria PDF.
