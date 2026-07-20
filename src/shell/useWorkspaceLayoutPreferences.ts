import { useCallback, useEffect, useState } from 'react';

export const WORKSPACE_LAYOUT_STORAGE_KEY = 'structureco:workspace-layout:v1';

export interface WorkspaceLayoutPreferences {
  inspectorCollapsed: boolean;
  fullCanvas: boolean;
  toolRailCompact: boolean;
}

const DEFAULT_PREFERENCES: WorkspaceLayoutPreferences = {
  inspectorCollapsed: false,
  fullCanvas: false,
  toolRailCompact: false,
};

const readPreferences = (): WorkspaceLayoutPreferences => {
  if (typeof window === 'undefined') return DEFAULT_PREFERENCES;
  try {
    const stored = JSON.parse(window.localStorage.getItem(WORKSPACE_LAYOUT_STORAGE_KEY) ?? '{}') as Partial<WorkspaceLayoutPreferences>;
    return {
      inspectorCollapsed: typeof stored.inspectorCollapsed === 'boolean' ? stored.inspectorCollapsed : false,
      fullCanvas: typeof stored.fullCanvas === 'boolean' ? stored.fullCanvas : false,
      toolRailCompact: typeof stored.toolRailCompact === 'boolean' ? stored.toolRailCompact : false,
    };
  } catch {
    return DEFAULT_PREFERENCES;
  }
};

export const useWorkspaceLayoutPreferences = () => {
  const [preferences, setPreferences] = useState<WorkspaceLayoutPreferences>(readPreferences);

  useEffect(() => {
    try {
      window.localStorage.setItem(WORKSPACE_LAYOUT_STORAGE_KEY, JSON.stringify(preferences));
    } catch {
      // Layout persistence is optional and must never interrupt the editor.
    }
  }, [preferences]);

  const setPreference = useCallback(<Key extends keyof WorkspaceLayoutPreferences>(
    key: Key,
    value: WorkspaceLayoutPreferences[Key],
  ) => setPreferences((current) => ({ ...current, [key]: value })), []);

  const togglePreference = useCallback((key: keyof WorkspaceLayoutPreferences) => {
    setPreferences((current) => ({ ...current, [key]: !current[key] }));
  }, []);

  return { preferences, setPreference, togglePreference };
};

