# Corpus de validación de Space 3D

Este directorio contiene la evidencia numérica de S3D-1. No es código de
producto: nada bajo `validation/` viaja en el bundle.

```
derive-expected.py        deriva los esperados desde las formas cerradas (no usa el solver)
emit-oracle-inputs.py     genera los modelos nativos OpenSees/Frame3DD desde los JSON
build-manifest.py         reconstruye manifest.json con hashes y observables
manual-cases.md           entrada completa y derivación de cada caso
oracles/manifest.json     índice versionado de casos, observables y corridas externas
oracles/expected/*.json   modelo y resultado esperado de cada caso
oracles/opensees/*.tcl    modelos nativos OpenSees (ndm 3, ndf 6)
oracles/frame3dd/*.3dd    modelos nativos Frame3DD
```

La prueba `src/space3d/engine/oracleComparison.test.ts` consume el manifiesto:
ejecuta el solver sobre cada modelo y compara **todos** los grados de libertad
declarados. Si un valor del archivo esperado no está cubierto por ningún
observable, la prueba falla — no existe la posibilidad de que un número quede
sin comparar en silencio.

## Regenerar el corpus

Desde la raíz del repositorio, en este orden:

```bash
python validation/space3d/derive-expected.py
python validation/space3d/emit-oracle-inputs.py
python validation/space3d/build-manifest.py
npx vitest run src/space3d/engine/oracleComparison.test.ts --maxWorkers=1
```

## Estado de los oráculos

| Fuente | Estado | Evidencia |
| --- | --- | --- |
| Formas cerradas manuales (5 casos) | **PASS** | `oracleComparison.test.ts`, corrida en verde |
| OpenSees | **NOT_RUN** | ejecutable no disponible en el entorno |
| Frame3DD | **NOT_RUN** | ejecutable no disponible en el entorno |

`NOT_RUN` significa exactamente eso: los archivos `.tcl` y `.3dd` están
escritos y versionados, pero **nunca se han ejecutado**. En consecuencia:

- la equivalencia de convenciones de ejes de esos archivos es una afirmación
  **no verificada**, no un hecho comprobado;
- `manifest.json` mantiene `output`, `outputSha256` y `version` en `null`;
- las pruebas correspondientes aparecen como `skipped` con la razón
  `oracle executable unavailable`, nunca como aprobadas.

### Cómo ejecutarlos cuando estén disponibles

OpenSees (Tcl, distribución oficial de opensees.berkeley.edu):

```bash
cd validation/space3d/oracles/opensees
OpenSees S3D-AXIAL-001.tcl
```

Frame3DD (distribución oficial de frame3dd.sourceforge.net):

```bash
cd validation/space3d/oracles/frame3dd
frame3dd -i S3D-AXIAL-001.3dd -o output/S3D-AXIAL-001.out
```

Para cada corrida hay que registrar en `manifest.json`: comando exacto,
versión del ejecutable, sistema operativo, rutas de entrada y salida,
`inputSha256`, `outputSha256`, mapa de signos y unidades. Sólo entonces
`status` pasa de `NOT_RUN` a `RUN` y la comparación deja de omitirse.

No se copia código GPL de ninguno de los dos proyectos al repositorio: sólo
archivos de entrada propios y, en su día, las salidas de texto que produzcan.

## Convenciones de traducción a los modelos nativos

- **OpenSees**: `geomTransf Linear $tag vecxz` — la documentación define
  `y_local = vecxz × x_local`. Con la terna diestra de S3D-1 eso se satisface
  tomando `vecxz = ẑ_local`, que es lo que emite `emit-oracle-inputs.py`.
  `element elasticBeamColumn` recibe las propiedades en el orden
  `A E G J Iy Iz`, con el mismo significado que en structureCo.
- **Frame3DD**: se emiten `Asy = Asz = 0` para desactivar la deformación por
  cortante e igualar la hipótesis Euler–Bernoulli. El ángulo `roll` se emite en
  grados, que es la unidad que espera el formato.
