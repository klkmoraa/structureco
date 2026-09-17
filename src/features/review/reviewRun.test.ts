import { describe, expect, it } from 'vitest';
import { resolveReviewPassState, startReviewPass, type ReviewPassBusy, type ReviewPassFailures } from './reviewRun';

const idle: ReviewPassBusy = { analysis: false, comparison: false, certificate: false };
const noFailures: ReviewPassFailures = { analysis: false, comparison: false, certificate: false };

describe('resolveReviewPassState', () => {
  it('keeps a requested pass running until every evidence executor is idle', () => {
    expect(resolveReviewPassState(false, idle, noFailures)).toBe('idle');
    expect(resolveReviewPassState(false, { ...idle, analysis: true }, noFailures)).toBe('running');
    expect(resolveReviewPassState(true, { ...idle, analysis: true }, noFailures)).toBe('running');
    expect(resolveReviewPassState(true, { ...idle, comparison: true }, noFailures)).toBe('running');
    expect(resolveReviewPassState(true, { ...idle, certificate: true }, noFailures)).toBe('running');
    expect(resolveReviewPassState(true, idle, { ...noFailures, certificate: true })).toBe('failed');
    expect(resolveReviewPassState(true, idle, noFailures)).toBe('complete');
  });
});

describe('startReviewPass', () => {
  it('starts analysis, coverage, and certificate in one pass', () => {
    const calls: string[] = [];

    const failures = startReviewPass({
      analyze: () => calls.push('analysis'),
      compare: () => calls.push('comparison'),
      certificate: () => calls.push('certificate'),
    });

    expect(calls).toEqual(['analysis', 'comparison', 'certificate']);
    expect(failures).toEqual(noFailures);
  });

  it('continues the pass and records a synchronous executor failure', () => {
    const calls: string[] = [];

    const failures = startReviewPass({
      analyze: () => { calls.push('analysis'); throw new Error('analysis unavailable'); },
      compare: () => calls.push('comparison'),
      certificate: () => calls.push('certificate'),
    });

    expect(calls).toEqual(['analysis', 'comparison', 'certificate']);
    expect(failures).toEqual({ analysis: true, comparison: false, certificate: false });
  });
});
