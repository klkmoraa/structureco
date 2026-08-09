import { useCallback, useEffect, useState } from 'react';

export const WORKSPACE_LAYOUT_STORAGE_KEY = 'structureco:workspace-layout:v1';

export type InspectorDetent = 'compact' | 'medium' | 'large';

export interface WorkspaceLayoutPreferences {
  inspectorCollapsed: boolean;
  fullCanvas: boolean;
  toolRailCompact: boolean;
  inspectorWidth: number;
  inspectorDetent: InspectorDetent;
}

export const MIN_INSPECTOR_WIDTH = 280;
export const MAX_INSPECTOR_WIDTH = 480;
export const DEFAULT_INSPECTOR_WIDTH = 320;

export const normalizeInspectorDetent = (
  detent: InspectorDetent,
  viewport: { width: number; height: number },
): InspectorDetent => {
  if (viewport.height < 340) return 'compact';
  if (detent === 'large' && (viewport.width > viewport.height || viewport.height < 560)) return 'medium';
  return detent;
};

export const clampInspectorWidth = (value: number) => Math.min(
  MAX_INSPECTOR_WIDTH,
  Math.max(MIN_INSPECTOR_WIDTH, Math.round(value)),
);

const DEFAULT_PREFERENCES: WorkspaceLayoutPreferences = {
  inspectorCollapsed: false,
  fullCanvas: false,
  toolRailCompact: false,
  inspectorWidth: DEFAULT_INSPECTOR_WIDTH,
  inspectorDetent: 'medium',
};

const readPreferences = (): WorkspaceLayoutPreferences => {
  if (typeof window === 'undefined') return DEFAULT_PREFERENCES;
  try {
    const stored = JSON.parse(window.localStorage.getItem(WORKSPACE_LAYOUT_STORAGE_KEY) ?? '{}') as Partial<WorkspaceLayoutPreferences>;
    return {
      inspectorCollapsed: typeof stored.inspectorCollapsed === 'boolean' ? stored.inspectorCollapsed : false,
      fullCanvas: typeof stored.fullCanvas === 'boolean' ? stored.fullCanvas : false,
      toolRailCompact: typeof stored.toolRailCompact === 'boolean' ? stored.toolRailCompact : false,
      inspectorWidth: typeof stored.inspectorWidth === 'number' && Number.isFinite(stored.inspectorWidth)
        ? clampInspectorWidth(stored.inspectorWidth)
        : DEFAULT_INSPECTOR_WIDTH,
      inspectorDetent: stored.inspectorDetent === 'compact' || stored.inspectorDetent === 'medium' || stored.inspectorDetent === 'large'
        ? stored.inspectorDetent
        : 'medium',
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
  ) => setPreferences((current) => ({
    ...current,
    [key]: key === 'inspectorWidth' ? clampInspectorWidth(value as number) : value,
  })), []);

  const togglePreference = useCallback((key: keyof WorkspaceLayoutPreferences) => {
    setPreferences((current) => ({ ...current, [key]: !current[key] }));
  }, []);

  return { preferences, setPreference, togglePreference };
};
