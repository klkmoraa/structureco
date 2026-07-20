import { forwardRef, type ReactNode } from 'react';

export interface AppShellLayoutProps {
  projectId: string;
  skipLabel: string;
  topBar: ReactNode;
  toolRail: ReactNode;
  workspace: ReactNode;
  inspector: ReactNode;
  footer?: ReactNode;
  backdrop?: ReactNode;
  floatingActions?: ReactNode;
  inspectorCollapsed?: boolean;
  fullCanvas?: boolean;
  toolRailCompact?: boolean;
}

/**
 * Visual composition boundary for the editor. Domain state and commands stay in
 * WorkspaceShell and are injected through slots so this component can only
 * arrange existing surfaces.
 */
export const AppShellLayout = forwardRef<HTMLDivElement, AppShellLayoutProps>(function AppShellLayout({
  projectId,
  skipLabel,
  topBar,
  toolRail,
  workspace,
  inspector,
  footer,
  backdrop,
  floatingActions,
  inspectorCollapsed = false,
  fullCanvas = false,
  toolRailCompact = false,
}, ref) {
  return <div
    ref={ref}
    className="app-shell workspace-screen"
    data-project-id={projectId}
    data-inspector-collapsed={inspectorCollapsed || undefined}
    data-full-canvas={fullCanvas || undefined}
    data-tool-rail-compact={toolRailCompact || undefined}
  >
    <a className="app-shell-skip-link" href="#workspace-canvas">{skipLabel}</a>
    {topBar}
    <div className="workspace">
      {toolRail}
      <main id="workspace-canvas" className="center-stage" tabIndex={-1}>
        {workspace}
      </main>
      {backdrop}
      {inspector}
      {floatingActions}
    </div>
    {footer}
  </div>;
});

