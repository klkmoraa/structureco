# CRI-139 — categorías técnicas localizadas en el Inspector

El Inspector dejaba expuestos los valores internos `permanent`, `variable`, `accidental` y `other` debajo de cada caso de carga. Ahora traduce esa categoría en el borde de presentación: Permanente, Variable, Accidental u Otro en español; sus equivalentes en inglés cuando el proyecto está en inglés.

La categoría persistida y su uso por combinaciones no cambian. La corrección sólo interpreta el enum en el componente que lo muestra, usando el catálogo tipado de la aplicación.

Validación focal: `Inspector.test.tsx` (36 pruebas) y `tsc --noEmit`; la regresión inglesa comprueba que ya no se renderizan los tokens internos.

Pendiente para cierre: revisión transversal del español en captura/dispositivo y la auditoría completa de catálogos durante los gates de publicación.
