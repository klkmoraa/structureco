import { describe, expect, it } from 'vitest';
import { resolveReviewPassState, startReviewPass, type ReviewPassBusy } from './reviewRun';

const idle: ReviewPassBusy = { analysis: false, comparison: false, certificate: false };

describe('resolveReviewPassState', () => {
  it('keeps a requested pass running until every evidence executor is idle', () => {
    expect(resolveReviewPassState(false, idle)).toBe('idle');
    expect(resolveReviewPassState(true, { ...idle, analysis: true })).toBe('running');
    expect(resolveReviewPassState(true, { ...idle, comparison: true })).toBe('running');
    expect(resolveReviewPassState(true, { ...idle, certificate: true })).toBe('running');
    expect(resolveReviewPassState(true, idle)).toBe('complete');
  });
});

describe('startReviewPass', () => {
  it('starts analysis, coverage, and certificate in one pass', () => {
    const calls: string[] = [];

    startReviewPass({
      analyze: () => calls.push('analysis'),
      compare: () => calls.push('comparison'),
      certificate: () => calls.push('certificate'),
    });

    expect(calls).toEqual(['analysis', 'comparison', 'certificate']);
  });
});
