# structureCo — Colección de 10 Videos Motion Graphics

Documentación de preproducción para la campaña de marca. Fuente de verdad visual: `src/design-system/tokens.css` (tema Noche por defecto) y las capturas en `docs/design-review/final/` y `docs/ux-redesign/evidence/`.

## Sistema visual compartido (aplica a los 10 videos)

**Paleta (modo Noche — base de campaña):**
- Fondo app `#08110e` · Fondo canvas `#060b09` · Superficie `#101915` / `#16231d`
- Verde acción (marca) `#39d4a2` · Logo sólido `#157A55` con glifo "S" blanco
- Miembros/estructura `#f1f5f4` (líneas casi blancas sobre negro) · Retícula `#202a2b` / `#2c3539`
- Carga puntual/distribuida `#ff7d66` · Axial `#6bcbf1` · Cortante `#78dc94` · Momento `#ff79ac` · Deformada `#5bdae2` · Reacción `#9baaff` · Cota/dimensión `#ffd56a` · Modo Aula `#9a83f0` · Selección/foco `#78a8ff`
- Paleta día (para escenas que lo requieran) definida en `:root` de `tokens.css` — verde `#007a67`, miembros `#16211c`, carga `#c85a45`.

**Tipografía:** Inter (UI y títulos), monoespaciada `ui-monospace/SFMono/Cascadia Mono` para valores numéricos y coordenadas. Tracking técnico ligero, números tabulares.

**Curvas de movimiento:** `cubic-bezier(.22,1,.36,1)` (entradas), `cubic-bezier(.4,0,1,1)` (salidas), spring suave `cubic-bezier(.3,1.18,.35,1)` para paneles. Nunca linear, nunca rebote exagerado.

**Elementos UI reales confirmados** (no inventar nada fuera de esta lista):
Topbar (logo S, nombre de proyecto, "Local", "Casos activos", selector de unidades kN·m, deshacer/rehacer, sincronía, descarga, botón "Analizar"); rail de herramientas (Navegar: Seleccionar/Desplazar; Crear: Nodo/Miembro/Apoyo; Cargas: Puntual/Distribuida/Momento; Anotar: Cota/Corte; Editar: Dividir miembro); canvas con retícula, snap/grid, nodos etiquetados (N1, N2…), apoyos (símbolo de pin/rodillo), acotaciones ámbar; Centro Analítico inferior (Estado: Resumen/Reacciones; Esfuerzos: Axial/Cortante/Momento; Forma: Deformada; Avanzado: Influencia; Comprender: Aprender; Avisos); Inspector derecho (propiedades, valores derivados N máx/V máx/M máx); Modo Aula (pasos Construye→Define→Predice→Analiza→Compara→Concluye, tarjeta "Tu hipótesis antes del cálculo"); Centro de Importación (pasos Archivo→Inspección→Contenido→Destino→Confirmar→Resultado; formatos JSON structureCo, PDF inteligente, Expediente .structureco); footer de aviso ("herramienta educativa y de apoyo... no sustituye la revisión de un profesional responsable").

**Diseño sonoro compartido:** pulso grave de 40-60Hz para golpes de marca; clic seco y corto al colocar nodo; "snap" metálico suave al conectar miembro; barrido de aire (whoosh filtrado, sin silbido agudo) en transiciones de cámara; tono ascendente breve de dos notas al ejecutar análisis; impacto contenido (sin reverberación larga) al revelar el logotipo. Sin música épica de librería genérica, sin SFX de videojuego.

**Regla de formatos:** todo texto y elemento crítico vive dentro del 80% central del frame (safe area) para sobrevivir el recorte de 16:9 a 9:16/1:1. Las adaptaciones verticales/cuadradas reencuadran el mismo timeline (mismo timing, distinta composición de cámara), no son videos nuevos.

---

## VIDEO 01 — Revelación de Marca (12–15s)

1. **Concepto:** de la oscuridad total a la claridad estructural; la retícula técnica se convierte en el símbolo de la marca.
2. **Objetivo:** presentar el logotipo con una animación memorable y elegante para abrir cualquier pieza de campaña.
3. **Guion por segundos:**
   - 0.0–2.0s — Negro casi total, retícula `#202a2b` apenas visible parpadea una vez.
   - 2.0–5.5s — Nodos verdes (`#39d4a2`) aparecen uno a uno (6–8 nodos) con easing de entrada; cada aparición dispara un clic seco.
   - 5.5–8.5s — Líneas estructurales blancas (`#f1f5f4`) se dibujan entre nodos (stroke-dasharray animado), formando una armadura geométrica simple.
   - 8.5–11.0s — Cámara hace dolly-in lento; la armadura se simplifica (los miembros sobrantes se desvanecen) hasta revelar el glifo "S" del logo.
   - 11.0–13.5s — El isotipo `#157A55` se solidifica con un fill limpio (sin partículas ni explosión); brillo verde sutil se expande y se apaga.
   - 13.5–15.0s — Wordmark "structureCo" + tagline.
4. **Escenas:** (1) Retícula en negro, (2) Nodos apareciendo, (3) Trazado de líneas/armadura, (4) Dolly-in + simplificación a "S", (5) Logo sólido + brillo, (6) Texto final.
5. **Textos en pantalla:** "structureCo" · "De lo complejo a lo claro."
6. **Transiciones:** disolución por retícula (crossfade con máscara de grid), sin cortes duros.
7. **Recursos visuales:** glifo del logo (`public/favicon.svg` vectorizado), retícula técnica, nodos y líneas del design system.
8. **Diseño sonoro:** silencio con ruido de sala mínimo → clics de nodos → whoosh corto en el dolly → impacto grave contenido al solidificar el logo → resonancia corta al texto final.
9. **Horizontal/Vertical:** 16:9 centra la armadura con espacio negativo lateral; 9:16/1:1 acercan el encuadre a la armadura (menos ancho de retícula visible) y suben el wordmark para que quede en el tercio inferior seguro.

---

## VIDEO 02 — Del Modelo al Resultado (25–30s)

1. **Concepto:** flujo de trabajo completo de principio a fin, como una sola toma continua.
2. **Objetivo:** comunicar el pipeline modelar → analizar → comprender sin cortes que rompan la continuidad del modelo.
3. **Guion por segundos:**
   - 0–3s — Retícula vacía en canvas oscuro, indicador de ejes X/Y verde en la esquina.
   - 3–7s — Aparecen 4 nodos (N1–N4) con clic por cada uno; texto "Modela."
   - 7–11s — Se trazan miembros (columnas verticales + viga horizontal) con dibujado progresivo; aparecen símbolos de apoyo (pin/rodillo).
   - 11–15s — Entran cargas: flecha puntual roja (`#ff7d66`) y carga distribuida (flechas verdes cortas) con sus etiquetas "P = 20.00 kN" / "w = 15.00 kN/m".
   - 15–18s — Se pulsa "Analizar" (barrido de luz sobre el botón); texto "Analiza."
   - 18–22s — La estructura responde: deformada sutil en turquesa (`#5bdae2`), reacciones en los apoyos (`#9baaff`).
   - 22–26s — El panel "Centro Analítico" se despliega desde abajo mostrando pestañas Axial/Cortante/Momento; se dibuja el diagrama de momento en magenta (`#ff79ac`).
   - 26–30s — Resultados se organizan en el Inspector derecho; texto "Comprende." → cierre.
4. **Escenas:** Retícula vacía · Nodos · Miembros+Apoyos · Cargas · Ejecutar análisis · Deformada+Reacciones · Diagramas · Organización en Inspector.
5. **Textos:** "Modela." / "Analiza." / "Comprende." · Cierre: "Todo el comportamiento estructural, en un mismo espacio."
6. **Transiciones:** barridos técnicos horizontales (línea de escaneo) entre bloques; sin cortes — todo sobre el mismo modelo persistente.
7. **Recursos:** captura de referencia `04-canvas/03-workspace-1440-dark.png`, `06-results/04-results-1440-dark.png`.
8. **Sonido:** clics de colocación, snap de conexión, barrido al abrir panel de resultados, doble tono ascendente al analizar.
9. **Horizontal/Vertical:** 16:9 mantiene canvas + inspector lateral visibles a la vez; vertical apila el canvas arriba y el panel de resultados desliza desde abajo ocupando el tercio inferior (patrón "hoja" que ya usa la propia UI).

---

## VIDEO 03 — Cómo Viaja una Carga (25s)

1. **Concepto:** educativo — visualizar el recorrido físico de una fuerza desde su aplicación hasta el apoyo.
2. **Objetivo:** enseñar de forma visual el concepto de transmisión de cargas, apoyado en la lectura de diagramas real de la app.
3. **Guion por segundos:**
   - 0–3s — Viga simple sobre dos columnas, vacía, retícula tenue.
   - 3–6s — Cae una carga puntual (flecha roja `#ff7d66`, etiqueta "P = 40.00 kN"); texto "Una carga nunca actúa sola."
   - 6–12s — Pulso de luz recorre la viga hacia las columnas (línea animada siguiendo el eje del miembro); las columnas se iluminan en secuencia.
   - 12–16s — Llega a los apoyos; aparecen reacciones (`#9baaff`) con flechas hacia arriba y etiqueta de valor; texto "Viaja a través de cada elemento."
   - 16–21s — Debajo de la estructura se dibuja el diagrama de momento (curva magenta `#ff79ac`) de izquierda a derecha, con el pico resaltado con un punto y etiqueta.
   - 21–25s — Zoom suave al valor máximo; texto de cierre "structureCo hace visible ese recorrido." + logo pequeño.
4. **Escenas:** Viga vacía · Caída de carga · Pulso de transmisión · Reacciones en apoyos · Diagrama de momento dibujándose · Zoom a valor crítico.
5. **Textos:** "Una carga nunca actúa sola." / "Viaja a través de cada elemento." / "structureCo hace visible ese recorrido."
6. **Transiciones:** continuidad total sobre el mismo modelo; el único "corte" es el zoom de cámara al cierre.
7. **Recursos:** paleta técnica de cargas/reacciones/momento de `tokens.css`; layout de diagrama de `06-results`.
8. **Sonido:** golpe grave suave al caer la carga, pulso ascendente/descendente sincronizado con la luz viajando, clic al fijar reacciones, trazo fino (sonido de lápiz técnico) al dibujar el diagrama.
9. **Horizontal/Vertical:** en vertical, el diagrama se ubica debajo de la viga en su propio "carril" a pantalla completa tras un pequeño scroll de cámara, en vez de compartir ancho con la estructura.

---

## VIDEO 04 — Instrumento de Precisión (20s)

1. **Concepto:** structureCo como instrumento profesional, no como app genérica.
2. **Objetivo:** transmitir rigor y control recorriendo la interfaz real panel por panel.
3. **Guion por segundos:**
   - 0–3s — Topbar en detalle: logo, nombre de proyecto, selector "kN·m", botón Analizar. Texto "Diseñado como un instrumento."
   - 3–6s — Pan lateral al rail de herramientas (Nodo/Miembro/Apoyo/Cargas) con foco progresivo en cada ícono.
   - 6–10s — Canvas: marcas de medición, cotas ámbar, indicador de escala "Escala 1.02×", coordenadas X/Y; texto "Precisión."
   - 10–13s — Inspector derecho: valores derivados (N máx, V máx, M máx) con números tabulares contando hacia su valor final.
   - 13–16s — Centro Analítico: pestañas de resultados y diagramas; texto "Control."
   - 16–18s — Exportación: ícono de descarga con leve destello; texto "Trazabilidad."
   - 18–20s — Cierre con logo: "structureCo — análisis estructural con claridad."
4. **Escenas:** Topbar · Rail de herramientas · Canvas con acotaciones · Inspector · Centro Analítico · Exportación · Cierre.
5. **Textos:** "Diseñado como un instrumento." / "Precisión." / "Control." / "Trazabilidad." / "structureCo — análisis estructural con claridad."
6. **Transiciones:** desplazamientos de cámara panorámicos (paneo/zoom) entre paneles, profundidad por parallax de capas.
7. **Recursos:** capturas reales `03-workspace`, `04-results`, `06-import-center`.
8. **Sonido:** clics discretos de "foco" al detenerse en cada panel, tono técnico limpio al mostrar números.
9. **Horizontal/Vertical:** vertical recorre los mismos paneles en orden pero en paneo vertical (topbar arriba → canvas → inspector como tarjeta inferior), en vez de barrido horizontal.

---

## VIDEO 05 — Laboratorio Nocturno (20–25s)

1. **Concepto:** inmersión en el modo oscuro como si fuera instrumentación científica de precisión.
2. **Objetivo:** posicionar el tema Noche como una experiencia de foco, no solo una opción estética.
3. **Guion por segundos:**
   - 0–4s — Estructura apenas visible en negro (`#060b09`); la retícula se enciende gradualmente (`#202a2b`→`#2c3539`).
   - 4–8s — Cargas aparecen en coral (`#ff7d66`), luego reacciones en azul-violeta (`#9baaff`); texto "Menos ruido."
   - 8–13s — La cámara se desplaza en profundidad por capas: geometría → cargas → resultados, cada capa con un ligero desenfoque de las demás (profundidad de campo simulada).
   - 13–17s — Aparecen diagramas (axial `#6bcbf1`, cortante `#78dc94`, momento `#ff79ac`) apilados, cada uno en su propio plano; texto "Más concentración."
   - 17–21s — Valor crítico se resalta en ámbar (`#ffd56a`) con una etiqueta que se fija; texto "Cada dato en su lugar."
   - 21–25s — Cierre: "Laboratorio Nocturno" + logo con glow verde sutil.
4. **Escenas:** Encendido de retícula · Cargas y reacciones · Recorrido por capas (parallax) · Diagramas apilados · Valor crítico · Cierre.
5. **Textos:** "Menos ruido." / "Más concentración." / "Cada dato en su lugar." / "Laboratorio Nocturno."
6. **Transiciones:** parallax continuo, sin cortes; cambios de foco (rack focus) entre capas.
7. **Recursos:** paleta completa modo oscuro de `tokens.css`; capturas dark de `04-canvas`, `06-results`.
8. **Sonido:** ambiente grave muy bajo, clics minimalistas, un único tono limpio al fijar el valor crítico.
9. **Horizontal/Vertical:** en vertical las "capas" se apilan de arriba a abajo en vez de en profundidad frontal, manteniendo la sensación de disección por planos.

---

## VIDEO 06 — Modo Aula y Aprendizaje (25–30s)

1. **Concepto:** aprendizaje estructural riguroso, sin infantilizar — nivel universitario.
2. **Objetivo:** mostrar el Modo Aula real (Construye→Define→Predice→Analiza→Compara→Concluye) como diferenciador educativo.
3. **Guion por segundos:**
   - 0–4s — Viga simple ya modelada; aparece el header "Modo Aula" en violeta (`#9a83f0`) con el stepper de 6 pasos.
   - 4–8s — Tarjeta conectada por línea fina a la carga: "Qué representa una carga."
   - 8–12s — Tarjeta conectada a un apoyo: "Cómo se identifican las reacciones."
   - 12–16s — Tarjeta conectada al tramo de la viga: "Qué significa el cortante."
   - 16–20s — Tarjeta conectada al diagrama de momento: "Qué representa el momento."
   - 20–24s — Punto crítico resaltado con etiqueta: "Dónde aparece el valor máximo."
   - 24–27s — Texto "No solo obtengas resultados." / "Entiende por qué ocurren."
   - 27–30s — Cierre: "Modo Aula — aprende directamente sobre el modelo."
4. **Escenas:** Header Modo Aula + stepper · Tarjeta carga · Tarjeta reacciones · Tarjeta cortante · Tarjeta momento · Valor máximo · Cierre.
5. **Textos:** los 5 conceptos citados + "No solo obtengas resultados." / "Entiende por qué ocurren." / "Modo Aula — aprende directamente sobre el modelo."
6. **Transiciones:** cada tarjeta entra con leve desplazamiento y línea de conexión que se dibuja hacia el elemento; salida por disolución antes de la siguiente.
7. **Recursos:** captura real `07-classroom/05-classroom-1440-dark.png` (stepper, tarjeta "Tu hipótesis antes del cálculo").
8. **Sonido:** clic suave por tarjeta, ausencia de música "infantil" — tono limpio y adulto.
9. **Horizontal/Vertical:** vertical presenta una tarjeta a la vez a pantalla más grande (menos densidad simultánea) en vez de varias conviviendo en el mismo plano.

---

## VIDEO 07 — Diagramas que Cobran Vida (20–25s)

1. **Concepto:** un mismo modelo, leído de cuatro formas distintas.
2. **Objetivo:** mostrar el valor analítico de structureCo a través de sus diagramas reales.
3. **Guion por segundos:**
   - 0–3s — Estructura ya analizada, quieta, en el centro del frame.
   - 3–7s — Diagrama axial se dibuja debajo (línea azul `#6bcbf1`) de origen a fin.
   - 7–11s — Transición manteniendo la estructura fija: diagrama de cortante (`#78dc94`) reemplaza al axial.
   - 11–15s — Transición: diagrama de momento (`#ff79ac`), con su valor máximo resaltado (punto + etiqueta + leve zoom de cámara).
   - 15–19s — Transición: deformada (`#5bdae2`) superpuesta sutilmente sobre la geometría original.
   - 19–22s — Texto "Una estructura." / "Diferentes formas de leerla."
   - 22–25s — Cierre: "Resultados que impulsan decisiones." + logo.
4. **Escenas:** Estructura fija · Axial · Cortante · Momento (+valor máx) · Deformada · Cierre.
5. **Textos:** "Una estructura." / "Diferentes formas de leerla." / "Resultados que impulsan decisiones."
6. **Transiciones:** cross-dissolve entre diagramas sobre la estructura fija (nunca se mueve la geometría, solo la lectura activa).
7. **Recursos:** `06-results/04-results-1440-dark.png` como referencia de trazado y tipografía numérica.
8. **Sonido:** trazo de línea (sonido técnico fino) por cada diagrama, tono de énfasis breve al resaltar el valor máximo.
9. **Horizontal/Vertical:** vertical coloca el diagrama activo a pantalla completa debajo de una estructura miniaturizada fija en la parte superior.

---

## VIDEO 08 — Importación y Exportación (20s)

1. **Concepto:** flujo de archivos entrando y saliendo de structureCo, con orden.
2. **Objetivo:** comunicar el ciclo import → trabajo → documento, usando únicamente los formatos reales.
3. **Guion por segundos:**
   - 0–3s — Tarjetas de archivo flotando: "JSON structureCo", "PDF inteligente", "Expediente .structureco" (según Centro de Importación real).
   - 3–6s — Las tarjetas convergen hacia el Centro de Importación (pasos Archivo→Inspección→Contenido→Destino→Confirmar→Resultado); texto "Importa."
   - 6–10s — El archivo se transforma en estructura editable sobre el canvas.
   - 10–13s — Se ejecuta el análisis (barrido breve); texto "Trabaja."
   - 13–17s — Resultados se organizan automáticamente en tarjetas: Modelo · Tablas · Diagramas · Resumen.
   - 17–20s — Emerge un documento técnico (memoria/expediente) desde la interfaz; texto "Documenta." → cierre "Del modelo al expediente, sin perder claridad."
4. **Escenas:** Tarjetas de archivo · Centro de Importación · Estructura editable · Análisis · Organización de resultados · Documento emergente.
5. **Textos:** "Importa." / "Trabaja." / "Documenta." / "Del modelo al expediente, sin perder claridad."
6. **Transiciones:** las tarjetas usan movimiento de convergencia (múltiples orígenes → un punto); el documento final emerge con profundidad (parallax hacia cámara).
7. **Recursos:** `08-import-export/06-import-center-1440-light.png` (única referencia confirmada de formatos: JSON, PDF, .structureco).
8. **Sonido:** swipe suave por tarjeta, clic de confirmación al importar, sonido de "papel/documento" discreto al emerger el expediente.
9. **Horizontal/Vertical:** vertical apila el flujo de arriba (archivos) hacia abajo (documento final) en vez de izquierda-derecha.

---

## VIDEO 09 — Antes y Después del Análisis (20–25s)

1. **Concepto:** contraste entre información dispersa y un espacio unificado — sin señalar a otras herramientas por nombre.
2. **Objetivo:** posicionar a structureCo como el lugar donde todo el proceso convive.
3. **Guion por segundos:**
   - 0–4s — Lado izquierdo: fragmentos de croquis sueltos, notas sin jerarquía, ventanas desalineadas (representación abstracta, no UI real de terceros); texto "Cuando toda la información está separada…"
   - 4–8s — El desorden se intensifica levemente (más fragmentos, ligera vibración/caos controlado).
   - 8–12s — Línea de barrido vertical cruza el frame de izquierda a derecha como transición.
   - 12–16s — Lado derecho: estructura organizada dentro de structureCo — Inspector, cargas, resultados, diagramas — todo alineado a la retícula; texto "…entender el modelo se vuelve más difícil." (aparece justo antes del giro).
   - 16–20s — Todo se asienta con alineación perfecta a la grilla; halo verde sutil.
   - 20–25s — Cierre: "structureCo reúne el proceso en un solo espacio." + logo.
4. **Escenas:** Caos (izquierda) · Intensificación · Barrido de transición · Orden (derecha) · Asentamiento a grilla · Cierre.
5. **Textos:** "Cuando toda la información está separada…" / "…entender el modelo se vuelve más difícil." / "structureCo reúne el proceso en un solo espacio."
6. **Transiciones:** barrido de línea vertical única (split-screen que se resuelve en un solo estado, nunca dos ventanas simultáneas final).
7. **Recursos:** paleta neutra/gris para el lado "caos" (sin marcas ni logos de terceros), paleta structureCo completa para el lado "orden".
8. **Sonido:** ruido de fondo ligeramente disonante en el caos (bajo volumen), barrido limpio en la transición, resolución armónica al llegar al orden.
9. **Horizontal/Vertical:** vertical convierte el split izquierda/derecha en un split arriba/abajo con el mismo barrido, ahora horizontal.

---

## VIDEO 10 — Teaser Cinematográfico (30s)

1. **Concepto:** pieza de presentación general de la marca con ritmo cinematográfico, resumen de toda la campaña.
2. **Objetivo:** ser el video ancla para YouTube/presentaciones — narrativa completa en 30 segundos.
3. **Guion por segundos:**
   - 0–4s — Pantalla oscura, impacto grave sutil, una sola línea estructural aparece.
   - 4–8s — La línea se conecta con nodos y forma una estructura completa (armadura simple).
   - 8–12s — Aparecen cargas (coral) y apoyos (símbolos técnicos).
   - 12–17s — Paneles de la interfaz real entran suavemente alrededor del modelo (topbar, rail, inspector).
   - 17–22s — Se ejecuta el análisis: deformada, reacciones y diagramas aparecen en secuencia.
   - 22–26s — Recorrido de cámara por resultados, Inspector, Modo Aula y exportación (montaje rápido pero legible, sin transiciones bruscas).
   - 26–30s — Todo se desvanece excepto el modelo y el logotipo; texto final.
4. **Escenas:** Línea inicial · Estructura completa · Cargas/Apoyos · Interfaz construyéndose · Análisis y resultados · Montaje de recorrido · Cierre modelo+logo.
5. **Textos:** "No se trata solo de calcular." / "Se trata de comprender." · Cierre: "structureCo" / "Modela. Analiza. Comprende."
6. **Transiciones:** dibujado progresivo → ensamblaje de UI por paneles → barridos de resultado → disolución final a negro con logo.
7. **Recursos:** todas las capturas de referencia (workspace, results, classroom, import-export) + logo vectorizado.
8. **Sonido:** impacto grave inicial → clics de ensamblaje → barridos de cámara → doble tono de análisis → impacto final contenido en el logo.
9. **Horizontal/Vertical:** vertical comprime el montaje de recorrido (22–26s) a 2 paneles en vez de 4, priorizando canvas + resultado, para no saturar el ancho reducido.

---

## Plan de producción

1. **Piloto:** Video 01 completo en 16:9 (HyperFrames) para validar look, tipografía, paleta y ritmo antes de escalar.
2. **Lote:** una vez aprobado el piloto, producir Videos 02–10 en 16:9 con el mismo sistema visual/proyecto compartido.
3. **Segunda pasada:** adaptar cada master aprobado a 9:16 y 1:1 reencuadrando dentro del área segura ya definida por video.
