import { createContext, useCallback, useContext, useState, type Dispatch, type SetStateAction } from 'react';

export const DataSurfaceRetainedStateContext = createContext<Map<string, unknown> | null>(null);

/** Falls back to ordinary component state when a panel is mounted by itself. */
export const useDataSurfaceRetainedState = <T,>(key: string, initial: T): [T, Dispatch<SetStateAction<T>>] => {
  const store = useContext(DataSurfaceRetainedStateContext);
  const [value, setValue] = useState<T>(() => store?.has(key) ? store.get(key) as T : initial);
  const commit = useCallback<Dispatch<SetStateAction<T>>>((next) => {
    setValue((current) => {
      const resolved = typeof next === 'function' ? (next as (previous: T) => T)(current) : next;
      store?.set(key, resolved);
      return resolved;
    });
  }, [key, store]);
  return [value, commit];
};
