import { WorkspacePlaceholder } from "@/components/workspace/workspace-placeholder";
import { WorkspaceShell } from "@/components/workspace/workspace-shell";

export default function CandidatesPage() {
  return (
    <WorkspaceShell>
      <WorkspacePlaceholder
        eyebrow="候选人"
        title="候选人"
        description="候选人列表、详情和筛选结果会在这里展示。"
      />
    </WorkspaceShell>
  );
}
