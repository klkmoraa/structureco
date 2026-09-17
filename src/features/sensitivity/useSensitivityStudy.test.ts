// @vitest-environment jsdom
import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createHibbelerTributaryBeam } from '../../data/defaultProject';
import { useSensitivityStudy } from './useSensitivityStudy';

afterEach(() => vi.unstubAllGlobals());

describe('useSensitivityStudy', () => {
  it('uses the deferred fallback when a browser worker is unavailable', async () => {
    vi.stubGlobal('Worker', undefined);
    const { result } = renderHook(() => useSensitivityStudy(createHibbelerTributaryBeam(), null));

    act(() => result.current.run('AB', 'I'));
    await waitFor(() => expect(result.current.result?.upper.inputValue).toBeGreaterThan(0), { timeout: 10_000 });

    expect(result.current.busy).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.result?.upper.percent).toBe(10);
  }, 15_000);
});
