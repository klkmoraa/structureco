/**
 * Vocabulario de movimiento del sistema.
 * ---------------------------------------------------------------------------
 * Antes cada superficie escribía sus propios números —`stiffness: 380`,
 * `duration: 0.15`, `[0.16, 1, 0.3, 1]`— y el resultado era que dos hojas
 * hermanas entraban con dos físicas distintas. Aquí viven los cuatro muelles
 * que el producto usa y las variantes derivadas.
 *
 * Los valores no son un gusto: son los que reproducen la sensación de UIKit.
 * `sheet` es el muelle de una `UISheetPresentationController` (recorrido largo,
 * asentamiento sin rebote visible); `snappy` es el de un control que responde
 * bajo el dedo; `gentle` es el de un contenido que aparece sin llamar la
 * atención; `pop` es el único con rebote y está reservado a lo que confirma
 * una acción del usuario.
 *
 * REGLA: ninguna animación de este producto interpola `width`, `height`, `top`
 * o `left`. Sólo `transform` y `opacity`, que son las dos propiedades que el
 * compositor puede animar sin volver a maquetar cada fotograma —la diferencia
 * entre 120 fps en un iPhone y un arrastre a tirones.
 */
import type { Transition, Variants } from 'motion/react';

export const springs = {
  /** Controles y hojas bajo el dedo: llega y para. */
  snappy: { type: 'spring', stiffness: 420, damping: 34, mass: 0.9 },
  /** Contenido que entra sin pedir turno. */
  gentle: { type: 'spring', stiffness: 260, damping: 30, mass: 1 },
  /** Presentación de hoja: recorrido largo, aterrizaje limpio. */
  sheet: { type: 'spring', stiffness: 340, damping: 36, mass: 1.05 },
  /** Confirmación: el único muelle con rebote perceptible. */
  pop: { type: 'spring', stiffness: 520, damping: 22, mass: 0.8 },
} satisfies Record<string, Transition>;

/** Curva de salida de iOS. Una salida nunca usa muelle: se va y no vuelve. */
export const easeOutIos: Transition = { duration: 0.22, ease: [0.32, 0.72, 0, 1] };
export const easeInIos: Transition = { duration: 0.16, ease: [0.4, 0, 1, 1] };

/** Transición degradada cuando el usuario pidió menos movimiento. */
export const reducedTransition: Transition = { duration: 0.001 };

/** Contenido que entra desde abajo, la entrada por defecto del producto. */
export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 6 },
};

/** Escala + desvanecido, para lo que nace de un punto (popover, menú). */
export const popIn: Variants = {
  hidden: { opacity: 0, scale: 0.94, y: -6 },
  visible: { opacity: 1, scale: 1, y: 0 },
  exit: { opacity: 0, scale: 0.96, y: -4 },
};

/**
 * Escalonado de una lista. `0.045` es el intervalo con el que una tarjeta
 * todavía se lee como parte del grupo; por encima de `0.08` la lista se
 * convierte en un desfile y hay que esperarla.
 */
export const staggerContainer = (step = 0.045, delay = 0.02): Variants => ({
  hidden: {},
  visible: { transition: { staggerChildren: step, delayChildren: delay } },
});

/** Elige entre una transición y su versión reducida en un solo sitio. */
export const motionSafe = <T extends Transition>(transition: T, reduced: boolean): Transition =>
  (reduced ? reducedTransition : transition);
