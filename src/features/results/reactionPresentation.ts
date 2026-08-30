import type { SupportDefinition } from '../../types';

export type ReactionDof = 'x' | 'y' | 'r';

const COMPONENT_EPSILON = 1e-12;

const positive = (value: number | undefined): boolean => typeof value === 'number' && Number.isFinite(value) && value > 0;

const springRestrains = (support: SupportDefinition, dof: ReactionDof): boolean => {
  const spring = support.spring;
  if (!spring) return false;
  if (dof === 'r') return positive(spring.kr);
  const angle = ((spring.angleDeg ?? 90) * Math.PI) / 180;
  const normalComponent = Math.abs(dof === 'x' ? Math.cos(angle) : Math.sin(angle));
  return (dof === 'x' ? positive(spring.kx) : positive(spring.ky))
    || (positive(spring.kNormal) && normalComponent > COMPONENT_EPSILON);
};

/**
 * Maps the support definition to the global component displayed in Results.
 * This is only a visual emphasis rule; it does not decide which reactions the
 * engine assembles or changes any result value.
 */
export const isReactionDofConstrained = (support: SupportDefinition, dof: ReactionDof): boolean => {
  const direct = support.type === 'fixed'
    || (support.type === 'pin' && dof !== 'r')
    || (support.type === 'roller' && dof !== 'r' && Math.abs((dof === 'x' ? Math.cos : Math.sin)(((support.angleDeg ?? 90) * Math.PI) / 180)) > COMPONENT_EPSILON)
    || (support.type === 'custom' && Boolean(dof === 'x' ? support.restrainX : dof === 'y' ? support.restrainY : support.restrainR));
  return direct || springRestrains(support, dof);
};
