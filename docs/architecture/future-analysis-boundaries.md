# Fronteras para capacidades de análisis futuras

**Clasificación:** `REFERENCE`

Este documento conserva sólo las decisiones de alcance que siguen vigentes para
posibles ampliaciones del motor. No afirma que esas capacidades estén
implementadas ni funciona como backlog. Cualquier iniciativa requiere una
petición de dominio explícita, contrato propio, benchmarks independientes y
gates fail-closed antes de aparecer como capacidad del producto.

## Regla común

- El análisis lineal 2D, P-Delta 2D y S3D-1 no implican soporte de buckling
  modal, dinámica, superficies ni no linealidad avanzada.
- Cada familia debe mantener tipos, resultados, procedencia, límites y estados
  de error explícitos; no basta con ampliar un `enum` o reutilizar una etiqueta.
- Una coincidencia local o con un único solver externo no equivale a
  certificación. La promoción exige corpus versionado, oráculos independientes,
  revisión estructural y comunicación visible del sobre validado.
- Fuera del sobre probado se bloquea el cálculo; nunca se rellena con una
  aproximación silenciosa ni con precisión aparente.

## Buckling elástico 2D

Debe plantearse como una capacidad futura independiente. Requiere separar
`K`/`K_G`, resolver restricciones homogéneas y extracción modal, y demostrar
tratamiento consistente de releases, offsets, condensación y valores propios
cercanos. Un factor o modo elástico no es resistencia de diseño, carga última
ni sustituto de imperfecciones y análisis no lineal.

## Modal, historia temporal y espectro

El orden obligatorio es: contrato versionado de masa, modal elástico, historia
temporal lineal y, sólo después, espectro de respuesta. Cada etapa se promueve
por separado. Deben quedar explícitos fuente y unidades de masa, matriz de masa,
constraints, amortiguamiento, procedencia de registros/espectros y presupuesto
de resultados. Ninguna de estas etapas implica dinámica no lineal ni diseño
normativo.

## Superficies, shells y diaphragms

Permanecen fuera del alcance actual. Los seis GDL de S3D-1 son compatibles pero
insuficientes: hacen falta formulación y estabilización, secciones, malla,
cargas, conexión con frames, postproceso y una arquitectura sparse adecuada.
Un diaphragm rígido por constraints, un membrane, una plate y un shell son
contratos distintos y no deben presentarse como sinónimos. No se reconsidera
esta familia hasta cerrar primero los gates de producción de Space 3D.

## Material no lineal, P-δ local y GMNIA

Son contratos distintos y dependientes de trayectoria. El P-Delta 2D vigente
no los implementa. Una iniciativa futura necesita estados trial/committed,
tangente consistente, historia incremental, rollback exacto, geometría e
imperfecciones versionadas, controles de trayectoria, resultados por sección y
gates separados para material, geometría, acoplamiento y diseño normativo.
Resultados no convergentes o fuera de alcance deben fallar de forma explícita.

## Space 3D

S3D-1 continúa experimental. Su eventual promoción mantiene este orden de
gates: contrato visible y smoke con worker/WebGL reales; WebKit, interacción y
accesibilidad; durabilidad y recuperación; validación numérica ampliada;
capacidad portable; y revisión independiente final. Ningún PASS local permite
saltar un gate, ampliar la física ni ocultar degradación por dispositivo.
