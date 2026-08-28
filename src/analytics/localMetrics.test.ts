import { describe, expect, it } from 'vitest';
import { clearLocalMetrics, exportLocalMetrics, getLocalMetrics, localRecoveryMetrics, recordLocalMetric, setLocalMetricsOptIn } from './localMetrics';

class MemoryStorage {
  private values = new Map<string, string>();
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.values.set(key, value); }
}

describe('local product metrics', () => {
  it('is opt-in and persists only the allowlisted aggregate event fields', () => {
    const storage = new MemoryStorage();
    recordLocalMetric(storage, { name: 'start_blank', route: 'blank', code: 'ignored-before-opt-in' });
    expect(getLocalMetrics(storage).events).toEqual([]);

    setLocalMetricsOptIn(storage, true);
    recordLocalMetric(storage, { name: 'analysis_started', route: 'blank' }, '2026-08-27T00:00:00.000Z');
    expect(getLocalMetrics(storage)).toEqual({ version: 1, optIn: true, events: [{ version: 1, name: 'analysis_started', route: 'blank', at: '2026-08-27T00:00:00.000Z' }] });
  });

  it('can erase local observations without changing consent', () => {
    const storage = new MemoryStorage();
    setLocalMetricsOptIn(storage, true);
    recordLocalMetric(storage, { name: 'recovery_decision' });
    expect(clearLocalMetrics(storage)).toEqual({ version: 1, optIn: true, events: [] });
  });

  it('exports the local diagnostic record without adding unallowlisted fields', () => {
    const storage = new MemoryStorage();
    setLocalMetricsOptIn(storage, true);
    recordLocalMetric(storage, { name: 'doctor_action_completed', code: 'no-supports' }, '2026-08-27T00:00:00.000Z');
    const exported = JSON.parse(exportLocalMetrics(storage));
    expect(exported).toMatchObject({ scope: 'local-only', version: 1, optIn: true, events: [{ name: 'doctor_action_completed', code: 'no-supports' }] });
    expect(exported.events[0]).not.toHaveProperty('query');
  });

  it('aggregates opt-in recovery rates, discrepancy, abandonment and decision time', () => {
    const storage = new MemoryStorage();
    setLocalMetricsOptIn(storage, true);
    recordLocalMetric(storage, { name: 'recovery_opened', code: 'conflict' }, '2026-08-27T00:00:00.000Z');
    recordLocalMetric(storage, { name: 'recovery_opened', code: 'conflict' }, '2026-08-27T00:01:00.000Z');
    recordLocalMetric(storage, { name: 'recovery_decision', code: 'restore', entityDelta: 4, recoveryAgeMinutes: 3 }, '2026-08-27T00:03:00.000Z');
    recordLocalMetric(storage, { name: 'recovery_abandoned', code: 'discard', entityDelta: -1, recoveryAgeMinutes: 5 }, '2026-08-27T00:05:00.000Z');

    expect(localRecoveryMetrics(getLocalMetrics(storage).events)).toEqual({
      opened: 2, decisions: 1, abandoned: 1, decisionRate: 0.5,
      averageEntityDelta: 4, averageDecisionMinutes: 3,
    });
  });
});
