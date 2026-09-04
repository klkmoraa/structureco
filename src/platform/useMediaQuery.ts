import { useEffect, useState } from 'react';

/**
 * Suscribe un componente a una media query.
 *
 * Existe porque hay decisiones de composición que no puede tomar el CSS: en
 * Inicio, los controles de idioma y tema tienen que estar *dentro* de la barra
 * compacta en teléfono y dentro de la línea superior en escritorio, y duplicar
 * dos `<select>` con `display:none` deja dos controles de formulario reales en
 * el árbol de accesibilidad.
 *
 * El valor inicial se resuelve en el primer render, no en un efecto: así el
 * primer pintado ya es el correcto y no hay un salto de composición.
 */
export const useMediaQuery = (query: string): boolean => {
  const [matches, setMatches] = useState(() =>
    typeof window === 'undefined' ? false : window.matchMedia?.(query).matches === true);

  useEffect(() => {
    const media = window.matchMedia?.(query);
    if (!media) return undefined;
    setMatches(media.matches);
    const onChange = (event: MediaQueryListEvent) => setMatches(event.matches);
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, [query]);

  return matches;
};

/** Teléfono o tableta en vertical: la composición compacta de Inicio. */
export const COMPACT_HOME_QUERY = '(max-width: 760px), (hover: none) and (pointer: coarse) and (max-width: 1023px)';
