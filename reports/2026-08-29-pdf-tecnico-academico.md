# PDF técnico: retiro de anexo y diagramas académicos

## Alcance

- Se mantuvo intacto el análisis estructural: solver, unidades, signos, topología, resultados y payload portable no cambian.
- La exportación y la vista previa ya no anexan automáticamente las páginas del acompañante ReportLab.
- La sección de diagramas se sustituyó por hojas de cálculo por miembro y por tramo. Cada intervalo exacto del solver contiene el cuerpo libre izquierdo, las cargas reales hasta el corte, N/V/M en el corte y sus tres ecuaciones con sustitución.

## Motivo de diseño

Las referencias proporcionadas priorizan procedimiento por tramo, geometría real, cortes locales y valores calculados. Se descartó el tratamiento verde de "anexo vectorial" porque introducía un documento separado y una jerarquía ajena a la memoria de cálculo.

## Validación focalizada

- `npm.cmd test -- --run src/features/pdf-preview/PdfPreviewDialog.test.tsx src/utils/calculationPdf.test.ts`
- `npm.cmd run typecheck`

La revisión visual final debe realizarse con una exportación del modelo del usuario, pues la forma de los diagramas depende de su geometría y cargas reales.
