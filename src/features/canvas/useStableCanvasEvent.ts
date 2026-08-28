import { useCallback, useLayoutEffect, useRef } from 'react';

/** Keeps heavyweight canvas layers stable while dispatching through the latest handler. */
export const useStableCanvasEvent = <Args extends unknown[], Result>(callback: (...args: Args) => Result) => {
  const callbackRef = useRef(callback);
  useLayoutEffect(() => { callbackRef.current = callback; }, [callback]);
  return useCallback((...args: Args) => callbackRef.current(...args), []);
};
