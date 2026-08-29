import { useEffect, useRef, type ReactNode } from 'react';
import { DataSurfaceRetainedStateContext } from './dataSurfaceRetainedStateStore';

/**
 * Estado efímero que sobrevive sólo mientras se cambia entre herramientas de
 * datos. Las superficies siguen siendo independientes; el proveedor evita que
 * cerrar una para abrir otra descarte un borrador sin aplicar.
 */
export const DataSurfaceRetainedStateProvider = ({ children, resetVersion = 0 }: { children: ReactNode; resetVersion?: number }) => {
  const store = useRef<Map<string, unknown> | null>(null);
  store.current ??= new Map<string, unknown>();
  useEffect(() => {
    store.current?.clear();
  }, [resetVersion]);
  return <DataSurfaceRetainedStateContext.Provider value={store.current}>{children}</DataSurfaceRetainedStateContext.Provider>;
};
