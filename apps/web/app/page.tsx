import { WorkspaceHome } from "@/components/workspace/workspace-home";
import { WorkspaceShell } from "@/components/workspace/workspace-shell";

export default function Home() {
  return (
    <WorkspaceShell>
      <WorkspaceHome />
    </WorkspaceShell>
  );
}
