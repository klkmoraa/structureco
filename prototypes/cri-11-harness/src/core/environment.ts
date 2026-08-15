/**
 * Sensor de entorno (capa 3 de CRI-9) · D-05.
 *
 * **Éste es el único módulo del prototipo que puede leer `matchMedia` o el
 * tamaño de la ventana.** Ninguna superficie consulta su propio ancho, ninguna
 * pregunta `isMobile` y ninguna decide su presentación (R-3). Si aparece un
 * segundo lector, la arquitectura ya se rompió y F-01 vuelve a ser posible.
 *
 * El harness añade una vuelta de tuerca: el «entorno» puede venir de un marco
 * simulado en lugar de la ventana real. Por eso el sensor observa una caja
 * —la que se le pase— y no `window` directamente, salvo en modo ventana real.
 */

import { useEffect, useState } from 'react';
import type { Viewport } from './resolver';

export type PointerCapability = 'fine' | 'coarse' | 'mixed';

export interface EnvironmentSnapshot {
  viewport: Viewport;
  orientation: 'portrait' | 'landscape';
  /** Capacidad real del dispositivo, antes de cualquier override del harness. */
  pointer: PointerCapability;
  prefersReducedMotion: boolean;
  prefersDark: boolean;
  /** Fuente del viewport: marco simulado o ventana real. */
  source: 'frame' | 'window';
}

const readMedia = (query: string): boolean =>
  typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia(query).matches;

const readPointer = (): PointerCapability => {
  if (readMedia('(any-pointer: fine) and (any-pointer: coarse)')) return 'mixed';
  if (readMedia('(pointer: coarse)')) return 'coarse';
  return 'fine';
};

const readCapabilities = () => ({
  pointer: readPointer(),
  prefersReducedMotion: readMedia('(prefers-reduced-motion: reduce)'),
  prefersDark: readMedia('(prefers-color-scheme: dark)'),
});

/** Consultas observadas. Cualquier otra lectura de `matchMedia` es un error. */
const WATCHED = ['(pointer: coarse)', '(any-pointer: fine) and (any-pointer: coarse)', '(prefers-reduced-motion: reduce)', '(prefers-color-scheme: dark)'];

export const useDeviceCapabilities = () => {
  const [capabilities, setCapabilities] = useState(readCapabilities);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const update = () => setCapabilities(readCapabilities());
    const lists = WATCHED.map((query) => window.matchMedia(query));
    for (const list of lists) list.addEventListener('change', update);
    return () => {
      for (const list of lists) list.removeEventListener('change', update);
    };
  }, []);

  return capabilities;
};

/**
 * Tamaño observado de un elemento. En el harness es el marco del dispositivo;
 * en modo ventana real, la ventana. `ResizeObserver` da resize continuo de
 * verdad — que es justo lo que U-13 (histéresis) necesita medir.
 */
export const useObservedSize = (element: HTMLElement | null, fallback: Viewport): Viewport => {
  const [size, setSize] = useState<Viewport>(fallback);

  useEffect(() => {
    if (!element) {
      setSize(fallback);
      return;
    }
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const box = entry.contentRect;
      setSize({ width: Math.round(box.width), height: Math.round(box.height) });
    });
    observer.observe(element);
    return () => observer.disconnect();
    // `fallback` sólo se usa cuando no hay elemento; observarlo reiniciaría el
    // observer en cada render del marco.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [element]);

  return size;
};

export const useWindowSize = (enabled: boolean): Viewport => {
  const [size, setSize] = useState<Viewport>(() => ({
    width: typeof window === 'undefined' ? 1440 : window.innerWidth,
    height: typeof window === 'undefined' ? 900 : window.innerHeight,
  }));

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return;
    const update = () => setSize({ width: window.innerWidth, height: window.innerHeight });
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, [enabled]);

  return size;
};

export const orientationOf = (viewport: Viewport): 'portrait' | 'landscape' =>
  viewport.height >= viewport.width ? 'portrait' : 'landscape';
