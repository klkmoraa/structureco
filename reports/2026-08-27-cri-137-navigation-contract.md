# CRI-137 — navegación honesta en Inicio

Se separaron Ajustes y Estudio de ilustraciones. Ajustes abre preferencias reales de idioma, tema y diagnóstico local opcional; el Estudio queda como destino nombrado de la navegación primaria, también en móvil. Cada diálogo conserva semántica modal y devuelve el foco a su lanzador.

Space 3D declara su carácter experimental antes de abrirse, tanto desde Inicio como desde el editor 2D. La orientación dice si el modelo será independiente o derivado, que los datos sin equivalente se señalizarán sin inventar valores, y que volver a 2D no sobrescribe el proyecto. Inicio conserva además una acción explícita para continuar en 2D.

Validación focal: `App.test.tsx` (entradas Inicio/editor y retorno), `Space3DEntryDialog.test.tsx`, `totalRedesignHome.test.tsx`, `welcomeFlow.test.tsx` y `WelcomeNavigationContract.test.tsx`.

Pendiente para cierre: tree testing con 8 personas y capturas comparables antes/después. No se ha convertido el protocolo en evidencia de hallazgos reales.
