import type { ReactNode } from "react";

import { WorkspaceSidebar } from "./workspace-sidebar";

type WorkspaceShellProps = {
  children: ReactNode;
  showSidebar?: boolean;
};

export function WorkspaceShell({ children, showSidebar = false }: WorkspaceShellProps) {
  return (
    <div className="min-h-screen bg-background">
      <div
        className={`mx-auto min-h-screen max-w-[1600px] ${
          showSidebar ? "grid lg:grid-cols-[280px_minmax(0,1fr)]" : ""
        }`}
      >
        {showSidebar ? <WorkspaceSidebar /> : null}
        <div
          className={`flex min-w-0 flex-col ${showSidebar ? "lg:border-l lg:border-border/60" : ""}`}
        >
          <main
            className={`flex-1 ${showSidebar ? "px-4 py-6 lg:px-8" : "px-4 py-5 lg:px-6 lg:py-6"}`}
          >
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
