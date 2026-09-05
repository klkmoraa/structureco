# Reporte de Arquitectura — Motor Completo de Diseño de Acero Estructural (ANSI/AISC 360-16 / 360-22 LRFD)

**Fecha:** 2026-09-05  
**Autor:** Antigravity  
**Estado:** Completado y Verificado  

---

## 1. Resumen Ejecutivo

Se completó con éxito la implementación del **Motor Completo de Diseño Normativo de Acero Estructural** bajo la especificación **ANSI/AISC 360-16 / 360-22 (LRFD)** para StructureCo.

Siguiendo estrictamente la arquitectura canónica de StructureCo:
$$\text{ProjectModel} \to \text{Analysis Engine} \to \text{AnalysisResult} \to \text{Design Module} \to \text{DesignResult}$$

El motor de diseño es una **proyección funcional pura** que nunca muta el solver, las unidades del proyecto, las coordenadas topológicas, el almacenamiento persistente ni los workers. Implementa una arquitectura **fail-closed**, exigiendo análisis numéricamente confiable, trazabilidad de catálogos y consistencia geométrica sin extrapolaciones no certificadas.

---

## 2. Alcance Normativo Implementado

Se implementaron analíticamente los capítulos principales del estándar ANSI/AISC 360 LRFD:

1. **Capítulo D — Miembros en Tensión (§D2):**
   - Resistencia nominal por fluencia en la sección bruta: $P_n = F_y \cdot A_g$.
   - Factor de resistencia a tensión: $\phi_t = 0.90$.
   - Verificación de esbeltez recomendada (§D1): $L/r \le 300$.

2. **Capítulo E — Miembros en Compresión (§E3):**
   - Esbeltez elástica gobernante: $KL/r = K \cdot L / \min(r_x, r_y) \le 200$.
   - Tensión de pandeo elástico de Euler: $F_e = \frac{\pi^2 E}{(KL/r)^2}$.
   - Umbral de pandeo inelástico vs. elástico: $4.71\sqrt{E/F_y}$:
     - Inelástico ($KL/r \le 4.71\sqrt{E/F_y}$): $F_{cr} = [0.658^{F_y/F_e}] F_y$ (Eq. E3-2).
     - Elástico ($KL/r > 4.71\sqrt{E/F_y}$): $F_{cr} = 0.877 F_e$ (Eq. E3-3).
   - Resistencia de diseño a compresión: $P_c = \phi_c F_{cr} A_g$ con $\phi_c = 0.90$.

3. **Capítulo F — Miembros en Flexión (§F2):**
   - Momento plástico nominal: $M_p = F_y \cdot Z_x$.
   - Longitudes límite para pandeo lateral-torsional (LTB):
     - Límite plástico: $L_p = 1.76 r_y \sqrt{E/F_y}$ (Eq. F2-5).
     - Límite elástico: $L_r$ calculado analíticamente con el radio de giro efectivo $r_{ts}$ y constante torsional de St. Venant $J$ (Eq. F2-6).
   - Resistencia nominal por zonas:
     - Zona 1 ($L_b \le L_p$): $M_n = M_p$.
     - Zona 2 ($L_p < L_b \le L_r$): $M_n = C_b [M_p - (M_p - 0.7 F_y S_x)((L_b - L_p)/(L_r - L_p))] \le M_p$.
     - Zona 3 ($L_b > L_r$): Pandeo elástico $M_n = F_{cr} S_x \le M_p$.
   - Resistencia de diseño: $M_c = \phi_b M_n$ con $\phi_b = 0.90$.

4. **Capítulo G — Cortante en el Alma (§G2.1):**
   - Resistencia nominal al cortante: $V_n = 0.6 F_y A_w C_{v1}$ donde $A_w = d \cdot t_w$.
   - Factor de resistencia $\phi_v = 1.00$ o $0.90$ según la esbeltez del alma $h/t_w \le 2.24\sqrt{E/F_y}$.

5. **Capítulo H — Fuerzas Combinadas e Interacción (§H1.1):**
   - Ecuaciones de interacción flexo-compresión y flexo-tensión:
     - Para $P_u / P_c \ge 0.2$: $\frac{P_u}{P_c} + \frac{8}{9}\left(\frac{M_{ux}}{M_{cx}}\right) \le 1.0$ (Eq. H1-1a).
     - Para $P_u / P_c < 0.2$: $\frac{P_u}{2 P_c} + \left(\frac{M_{ux}}{M_{cx}}\right) \le 1.0$ (Eq. H1-1b).

---

## 3. Interfaz de Usuario Fluida y Capacidades Profesionales

Para ofrecer una experiencia intuitiva, interactiva y educativa equivalente a paquetes de software estructural de vanguardia (RISA-3D, SAP2000, Tekla Tedds), se integraron los siguientes componentes de UI:

1. **Arquitectura Multi-Pestaña Integrada:**
   - **Vista General (`overview`):** Medidor continuo de utilización estilo tacómetro/gauge con umbrales normativos ($\le 0.90$ Seguro / $0.90-1.00$ Advertencia / $> 1.00$ Sobreesfuerzo), tarjetas métricas de Demanda ($P_u, M_u, V_u$), Capacidad ($\phi P_n, \phi M_n, \phi V_n$) y holgura de reserva de resistencia.
   - **Diagrama Proporcional de Sección Transversal (`AiscCrossSectionDiagram.tsx`):**
     - Renderizado SVG en tiempo real proporcional a las dimensiones reales ($d, b_f, t_w, t_f$).
     - Cotas acotadas dinámicamente con flechas de ingeniería.
     - Representación de los ejes principales ($X-X$ e $Y-Y$).
     - Resaltado semántico contextual: patines destacados en flexión, alma destacada en cortante, sección completa en carga axial.
   - **Estados Límite (`limits`):** Tarjetas individuales para cada capítulo (D, E, F, G, H) con barra de progreso propia, ratio individual, demanda vs. capacidad y estado normativo.
   - **Memoria de Cálculo Paso a Paso (`sheet`):**
     - Visualización estilo MathCAD con citaciones exactas a cláusulas AISC.
     - Desglose de fórmulas simbólicas, variables numéricas sustituidas y ratio calculado.
     - Indicador didáctico de la ecuación gobernante.
   - **Dimensionador Inteligente / Smart Sizer (`sizer`):**
     - Algoritmo de optimización (`aiscOptimizer.ts`) que evalúa en milisegundos todo el catálogo de perfiles W del sistema.
     - Clasificación por peso propio lineal ($kg/m$).
     - Comparativa de ratio resultante y ahorro porcentual de peso ($\Delta\text{peso}\% = \frac{w_{\text{nuevo}} - w_{\text{actual}}}{w_{\text{actual}}} \times 100$).
     - Botón de adopción en 1 clic que actualiza la sección en el modelo mediante la acción transaccional `updateMemberSection`.

2. **Sincronización Bi-direccional con el Lienzo (Canvas Sync):**
   - Si el usuario selecciona una barra en el lienzo de trabajo, la tarjeta de diseño actualiza automáticamente el miembro visualizado.
   - Si el usuario navega entre miembros desde la tarjeta de diseño, el botón **"Enfocar en canvas"** sincroniza la selección activa en el lienzo.

3. **Cumplimiento Estricto del Sistema de Diseño:**
   - Tipografía Geist Mono para todos los valores numéricos.
   - Cumplimiento de la política numérica corporativa (`formatFixed`, sin uso de `.toFixed()` directo).
   - Compatibilidad Day/Night basada en tokens CSS de StructureCo.
   - Soporte bilingüe completo (español e inglés).

---

## 4. Componentes Creados e Integrados

1. **`src/design/aiscSteel360Types.ts`:**
   - Tipos inmutables para el motor (`AiscCheckKind`, `AiscCheckDetail`, `AiscVariable`, `AiscMemberDesignResult`, `AiscProjectDesignSummary`).
2. **`src/design/aiscSteel360.ts`:**
   - Motor matemático puro con evaluadores independientes por capítulo y evaluador integral `evaluateAiscSteel360Project`.
3. **`src/design/aiscSteel360.test.ts`:**
   - 15 pruebas unitarias exhaustivas (fluencia, pandeo inelástico/elástico, LTB, interacción H1-1a/b, fail-closed ante inconsistencias).
4. **`src/design/aiscOptimizer.ts` & `src/design/aiscOptimizer.test.ts`:**
   - Motor analítico de dimensionamiento óptimo con 4 pruebas unitarias que validan selección segura, ahorro de peso y rechazo de perfiles insuficientes.
5. **`src/features/design/AiscCrossSectionDiagram.tsx`:**
   - Diagrama SVG proporcional con cotas y resaltado semántico.
6. **`src/features/design/aiscSteelDesignCard.css`:**
   - Hoja de estilos con arquitectura de tarjetas de ingeniería, pestañas fluidas y medidor continuo.
7. **`src/features/design/AiscSteelDesignCard.tsx`:**
   - Componente React multi-pestaña interactivo con adopción de secciones y sincronización de canvas.
8. **`src/features/design/AiscSteelDesignCard.test.tsx`:**
   - 8 pruebas de interfaz con interacción simulada (cambio de pestañas, adopción de sección y sincronización).
9. **`src/features/results/ResultSummary.tsx`:**
   - Integración fluida en el panel de resultados de StructureCo.
10. **`src/features/import-export/ImportCenterDialog.tsx` & `src/features/model-doctor/ModelDoctor.test.tsx`:**
    - Corrección de condiciones de carrera de foco para garantizar estabilidad del 100% de la suite de pruebas.

---

## 5. Estado de los Gates de Verificación

- `oxlint`: Aprobado (**0 errores, 0 advertencias** en 784 archivos).
- `tsc -b --noEmit`: Aprobado (**0 errores** de tipado TypeScript).
- `bun scripts/check-protected-baseline.mjs`: Aprobado (**55 archivos protegidos intactos**).
- `bun test scripts/check-docs.test.mjs && bun scripts/check-docs.mjs`: Aprobado (**23 documentos canónicos** clasificados y con enlaces válidos).
- `bun test scripts/check-i18n-usage.test.mjs && bun scripts/check-i18n-usage.mjs`: Aprobado (**2.246 claves i18n** verificadas).
- `bun run build`: Aprobado (compilación de producción en 1.01s).
- `bun scripts/check-performance-budget.mjs`: Aprobado (**1.359.999 bytes** / 372.414 gzip, por debajo del presupuesto máximo de 1.400.000 / 380.000).
- **Suite completa de pruebas Vitest:** **318 archivos de prueba aprobados (2.790 pruebas aprobadas, 0 fallos)**.

