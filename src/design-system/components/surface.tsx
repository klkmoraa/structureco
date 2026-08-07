import type { HTMLAttributes, ReactElement } from 'react';

/**
 * Niveles de elevación clay.
 *
 * `flat` no aplica volumen y es el nivel de las zonas técnicas densas —tablas
 * de resultados, filas del inspector, el lienzo—: darles relieve a cada una
 * convierte una rejilla de datos en un montón de fichas y se lee peor.
 * `raised` es la tarjeta normal. `floating` es la elevación de lo que se
 * despega del plano: popovers, hojas, menús.
 */
export type SurfaceLevel = 'flat' | 'raised' | 'floating';

export interface SurfaceProps extends HTMLAttributes<HTMLElement> {
  level?: SurfaceLevel;
  /** Invierte la iluminación. El estilo vive en CSS; aquí sólo se expone el estado. */
  pressed?: boolean;
  as?: 'div' | 'section' | 'article' | 'aside' | 'button' | 'header' | 'nav';
}

/**
 * Envoltorio de elevación clay. Es CSS tras una API tipada: no gestiona estado
 * ni conoce el dominio, y por eso puede vivir en la librería sin cruzar la
 * frontera que `dependencyBoundary.test.ts` protege.
 */
export const Surface = ({
  level = 'raised',
  pressed = false,
  as: Tag = 'div',
  className = '',
  children,
  ...rest
}: SurfaceProps): ReactElement => (
  <Tag
    className={`sc-surface${className ? ` ${className}` : ''}`}
    data-level={level}
    data-pressed={pressed ? 'true' : undefined}
    {...rest}
  >
    {children}
  </Tag>
);
