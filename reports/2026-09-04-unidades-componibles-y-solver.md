# Unidades componibles y tres mejoras del solver

## Unidades

Un sistema de unidades deja de ser una tabla escrita a mano y pasa a ser una combinación de seis unidades elementales —fuerza, longitud, longitud de sección, dimensión de perfil, tensión y densidad— de la que `engine/unitSystems` deriva las doce magnitudes que el producto imprime. Momento = fuerza · longitud y carga distribuida = fuerza / longitud quedan garantizados por construcción; la tabla anterior no lo cumplía en `kip-ft`, donde el momento y el producto fuerza × longitud diferían en 3,4e-9 relativo porque el factor de `kip` estaba redondeado por debajo de su definición exacta.

Los cuatro sistemas históricos conservan etiquetas y factores (salvo esa corrección) y se suman cuatro presets: `tonf-m` (Tn · m, secciones en cm, E en kgf/cm²), `kip-in`, `MN-m` y `lbf-in`.

Además, el proyecto puede declarar sus propios sistemas en `settings.customUnitSystems`: se componen desde la barra superior eligiendo cada unidad elemental, viajan con el archivo, se validan contra el catálogo al importar —un archivo no puede inyectar un factor de conversión arbitrario— y un identificador huérfano cae al preset base en vez de dejar el proyecto sin unidades resolubles. El registro que resuelve esas definiciones es de presentación: el solver, los workers y la persistencia siguen trabajando en unidades base y no lo leen.

## Solver

1. **Residuo con productos exactos.** `b − A x` se calcula con productos de Dekker y suma compensada de Neumaier. El producto escalar ingenuo acumulaba un error mayor que el propio residuo que medía, de modo que el aviso «precisión limitada del sistema lineal» describía el ruido de su propia aritmética y el refinamiento iterativo se estancaba antes de lo que la factorización permitía. El refinamiento reutiliza ahora ese mismo vector como término independiente de la corrección, así que además ahorra un producto matriz-vector por iteración.

2. **Reúso de la factorización.** `solveLinearSystem` se separa en `factorizeLinearSystem` + `solveFactorized`, y una caché explícita de una entrada permite a las series de análisis que comparten rigidez —envolvente de casos y combinaciones, barrido de línea de influencia— pagar una sola factorización y una sola estimación de condición. La identidad se comprueba comparando la matriz elemento a elemento, no con una firma que pudiera colisionar. Medido en una viga continua de 980 GDL con ocho términos independientes: 5,6 s → 4,2 s, con desplazamientos idénticos bit a bit. La condensación estática de conexiones semirrígidas factoriza también una vez Kbb para sus siete resoluciones.

3. **Muestreo de la deformada invariante de escala.** La poligonal dibujada se refinaba contra `max(1, L, |u|, |v|)`, una escala absoluta sin relación con la forma: en un modelo en metros con flechas de centímetros bajaba hasta el tope de profundidad, unos 2000 puntos por miembro. Ahora se mide contra la separación de la curva respecto a su propia cuerda, con tolerancia 1e-4. Cada intervalo usa además la cota rigurosa de interpolación lineal `(b-a)² max|p''| / 8`; así una cuártica que cruza su cuerda justo en el punto medio ya no se confunde con una recta. La deformada exacta sigue viviendo en los polinomios de `segments` y en las raíces de `deformationCriticalPoints`, que es de donde salen todas las lecturas numéricas.

Perfil de una viga continua de 980 GDL, mismo modelo y misma máquina:

| Fase | Antes | Después |
|---|---|---|
| Deformada | 308 ms | 12 ms |
| Total | 617 ms | 269 ms |

## Correcciones de revisión

- El límite de 32 sistemas propios es ahora una constante compartida por la interfaz y los códecs. La barra superior desactiva la creación al alcanzarlo y la mutación vuelve a comprobarlo, de modo que la UI ya no puede producir un proyecto que luego la persistencia rechaza.
- Space 3D sube su esquema portable a la versión 3 y guarda `customUnitSystems` junto al identificador activo. Los esquemas 1 y 2 se migran; si un archivo antiguo sólo conserva un id propio irrecuperable, vuelve de forma explícita a `kN-m`. El esquema actual rechaza ids huérfanos, definiciones duplicadas o unidades atómicas fuera del catálogo.
- El puente 2D → 3D clona las definiciones propias y las incluye al detectar divergencia, por lo que reentrar en Space 3D no reutiliza silenciosamente una composición anterior.
- La prueba intermitente del shell se alineó con el contrato vigente: un análisis exitoso invoca automáticamente Resultados en estado recogido. Ahora espera ese efecto antes de expandir el panel; pasó cinco ejecuciones consecutivas aisladas.

## Verificación

`npm run lint`, `tsc -b --noEmit`, `npm test`, `npm run build`, `verify:docs`, `verify:protected` (base actualizada), `verify:pwa`, `verify:i18n`, `verify:i18n-entry`, `verify:styles`, `verify:perf`, `verify:space3d` y `validate:ci`.

La corrida completa cerró con **311 archivos y 2739 pruebas aprobadas** (5 omitidas justificadas); Space 3D, con **22 archivos y 261 pruebas aprobadas** (5 omitidas), mantuvo la capacidad publicada de 150 nudos / 300 barras. El bundle de entrada quedó en 1.318.394 bytes / 362.551 gzip, dentro del presupuesto 1.400.000 / 380.000.

Pruebas añadidas: coherencia de las magnitudes derivadas y sistemas propios (`units.test.ts`), reúso de factorización y residuo compensado (`math.test.ts`), densidad y fidelidad de la deformada (`diagram.test.ts`), persistencia y validación de los sistemas propios (`migrate.test.ts`), composición y límite desde la barra superior (`TopBar.test.tsx`), y portabilidad de unidades propias en Space 3D (`codec.test.ts`, `bridge2d.test.ts`, `validation.test.ts`).

Se descartó una aceleración de Aitken de la iteración P-Delta: medida sobre pórticos hasta λ_cr ≈ 1,08, la sucesión de fuerzas axiales se contrae con razón ~1e-5 y el criterio de extrapolación no llegaba a activarse nunca. Las iteraciones cerca de la crítica las gasta el escalonado de carga, no la convergencia dentro del paso.
