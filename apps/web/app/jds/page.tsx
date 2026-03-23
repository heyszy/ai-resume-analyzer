import { WorkspacePlaceholder } from "@/components/workspace/workspace-placeholder";
import { WorkspaceShell } from "@/components/workspace/workspace-shell";

export default function JobDescriptionsPage() {
  return (
    <WorkspaceShell>
      <WorkspacePlaceholder
        eyebrow="职位"
        title="职位"
        description="职位信息和岗位要求会在这里展示。"
      />
    </WorkspaceShell>
  );
}
