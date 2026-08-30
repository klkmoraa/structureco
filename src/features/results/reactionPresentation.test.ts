import { describe, expect, it } from 'vitest';
import { isReactionDofConstrained } from './reactionPresentation';

describe('reaction presentation emphasis', () => {
  it('marks only the translational pin degrees of freedom', () => {
    expect(isReactionDofConstrained({ type: 'pin' }, 'x')).toBe(true);
    expect(isReactionDofConstrained({ type: 'pin' }, 'y')).toBe(true);
    expect(isReactionDofConstrained({ type: 'pin' }, 'r')).toBe(false);
  });

  it('projects a roller direction onto the displayed global components', () => {
    expect(isReactionDofConstrained({ type: 'roller', angleDeg: 90 }, 'x')).toBe(false);
    expect(isReactionDofConstrained({ type: 'roller', angleDeg: 90 }, 'y')).toBe(true);
    expect(isReactionDofConstrained({ type: 'roller', angleDeg: 45 }, 'x')).toBe(true);
    expect(isReactionDofConstrained({ type: 'roller', angleDeg: 45 }, 'y')).toBe(true);
    expect(isReactionDofConstrained({ type: 'roller', angleDeg: 45 }, 'r')).toBe(false);
  });

  it('keeps custom and spring restrictions visible without changing the model', () => {
    expect(isReactionDofConstrained({ type: 'custom', restrainR: true }, 'r')).toBe(true);
    expect(isReactionDofConstrained({ type: 'custom', spring: { kNormal: 10, angleDeg: 0 } }, 'x')).toBe(true);
    expect(isReactionDofConstrained({ type: 'custom', spring: { kNormal: 10, angleDeg: 0 } }, 'y')).toBe(false);
    expect(isReactionDofConstrained({ type: 'none' }, 'x')).toBe(false);
  });
});
