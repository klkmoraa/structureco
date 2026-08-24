import assert from 'node:assert/strict';
import test from 'node:test';

test('reports the latest QA stage when progress stops', async () => {
  const watchdogModule = await import('./qa-stage-watchdog.mjs').catch(() => ({}));
  assert.equal(typeof watchdogModule.createStageWatchdog, 'function');

  let resolveTimeout;
  const timedOut = new Promise((resolve) => { resolveTimeout = resolve; });
  const watchdog = watchdogModule.createStageWatchdog({
    timeoutMs: 40,
    onTimeout: resolveTimeout,
  });

  watchdog.mark('preparación');
  await new Promise((resolve) => setTimeout(resolve, 10));
  watchdog.mark('geometría responsive 390x844');

  const diagnostic = await Promise.race([
    timedOut,
    new Promise((_, reject) => setTimeout(() => reject(new Error('watchdog did not fire')), 500)),
  ]);
  watchdog.clear();

  assert.deepEqual(diagnostic, {
    stage: 'geometría responsive 390x844',
    timeoutMs: 40,
  });
});
