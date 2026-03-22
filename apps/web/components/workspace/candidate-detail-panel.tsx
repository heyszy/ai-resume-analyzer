import { AlertTriangle, FileText, TextQuote, Trash2 } from "lucide-react";
import dynamic from "next/dynamic";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getCandidateFileUrl } from "@/lib/candidates";

import {
  getCandidateStatusLabel,
  type WorkspaceCandidate,
  type WorkspaceCandidateStatus,
  type WorkspaceCandidateSummary,
  type WorkspaceProcessingStatus,
} from "./workspace-model";

type CandidateDetailView = Partial<WorkspaceCandidate> & WorkspaceCandidateSummary;

const CandidatePdfPreview = dynamic(
  () => import("./candidate-pdf-preview").then((module) => module.CandidatePdfPreview),
  {
    ssr: false,
  },
);

type CandidateDetailPanelProps = {
  candidate: CandidateDetailView | null;
  isUpdatingStatus: boolean;
  onStatusChange: (status: WorkspaceCandidateStatus) => void;
  isDeletingCandidate: boolean;
  onDeleteCandidate: (candidateId: string) => Promise<void>;
  isLoading: boolean;
  errorMessage: string | null;
};

export function CandidateDetailPanel({
  candidate,
  isUpdatingStatus,
  onStatusChange,
  isDeletingCandidate,
  onDeleteCandidate,
  isLoading,
  errorMessage,
}: CandidateDetailPanelProps) {
  const [activeTabState, setActiveTabState] = useState<{
    candidateId: string | null;
    value: "analysis" | "preview";
  }>({
    candidateId: null,
    value: "analysis",
  });
  const [deleteDialogState, setDeleteDialogState] = useState<{
    candidateId: string | null;
    open: boolean;
  }>({
    candidateId: null,
    open: false,
  });

  if (!candidate && isLoading) {
    return <CandidateDetailSkeleton />;
  }

  if (!candidate) {
    return (
      <Card className="flex min-h-[720px] items-center justify-center p-8 text-center">
        <div className="max-w-sm space-y-3">
          <div className="mx-auto flex size-14 items-center justify-center rounded-xl bg-slate-950 text-white">
            <FileText className="size-6" />
          </div>
          <h2 className="text-xl font-semibold text-slate-950">未选择候选人</h2>
        </div>
      </Card>
    );
  }

  const previewUrl = resolvePreviewUrl(candidate);
  const candidateId = candidate.id;
  const profile = "profile" in candidate ? candidate.profile : null;
  const activeTab = activeTabState.candidateId === candidateId ? activeTabState.value : "analysis";
  const isDeleteDialogOpen =
    deleteDialogState.candidateId === candidateId && deleteDialogState.open;

  async function handleConfirmDelete() {
    await onDeleteCandidate(candidateId);
    setDeleteDialogState({ candidateId: null, open: false });
  }

  return (
    <section className="space-y-3">
      <Card>
        <div className="flex items-center justify-between gap-4 border-b border-border px-4 py-4">
          <h2 className="min-w-0 truncate text-[28px] font-semibold text-slate-950">
            {candidate.displayName}
          </h2>
          <div className="flex w-full max-w-[360px] items-center justify-end gap-2">
            <Select
              value={candidate.status}
              onValueChange={(value) => onStatusChange(value as WorkspaceCandidateStatus)}
              disabled={isUpdatingStatus || isDeletingCandidate}
            >
              <SelectTrigger className="h-11 w-[220px] bg-background">
                <SelectValue placeholder="选择状态" />
              </SelectTrigger>
              <SelectContent>
                {CANDIDATE_STATUS_OPTIONS.map((status) => (
                  <SelectItem key={status} value={status}>
                    {getCandidateStatusLabel(status)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              type="button"
              variant="destructive"
              className="h-11 px-3"
              disabled={isDeletingCandidate || isUpdatingStatus}
              onClick={() => setDeleteDialogState({ candidateId, open: true })}
            >
              <Trash2 className="size-4" />
              删除
            </Button>
          </div>
        </div>

        <div className="space-y-4 px-4 py-4">
          <div className="inline-flex rounded-2xl border border-border bg-muted/50 p-1">
            <TabButton
              isActive={activeTab === "analysis"}
              label="简历解析"
              onClick={() => setActiveTabState({ candidateId: candidate.id, value: "analysis" })}
            />
            <TabButton
              isActive={activeTab === "preview"}
              label="简历预览"
              onClick={() => setActiveTabState({ candidateId: candidate.id, value: "preview" })}
            />
          </div>

          {activeTab === "analysis" ? (
            <div className="space-y-3">
              {errorMessage ? <InlineError message={errorMessage} /> : null}
              {"processingErrorMessage" in candidate && candidate.processingErrorMessage ? (
                <InlineError message={candidate.processingErrorMessage} />
              ) : null}

              <Card className="bg-muted/40">
                <div className="space-y-4 px-4 py-4">
                  {profile ? (
                    <div className="space-y-4">
                      <InfoGrid
                        items={[
                          ["姓名", profile.basicInfo.name ?? "待提取"],
                          ["电话", profile.basicInfo.phone ?? "待提取"],
                          ["邮箱", profile.basicInfo.email ?? "待提取"],
                          ["城市", profile.basicInfo.city ?? "待提取"],
                        ]}
                      />

                      <TagSection
                        title="技能标签"
                        tags={profile.skillTags}
                        emptyText="等待流式解析补充技能标签"
                      />
                      <TimelineSection
                        title="教育经历"
                        items={profile.educationHistory.map((item) => ({
                          title: `${item.school ?? "学校待提取"} · ${item.degree ?? "学历待提取"}`,
                          subtitle: `${item.major ?? "专业待提取"} · ${item.graduationTime ?? "毕业时间待提取"}`,
                          description: "",
                        }))}
                      />
                      <TimelineSection
                        title="工作经历"
                        items={profile.workExperiences.map((item) => ({
                          title: `${item.companyName ?? "公司待提取"} · ${item.position ?? "职位待提取"}`,
                          subtitle: item.timeRange ?? "时间段待提取",
                          description: item.summary ?? "",
                        }))}
                      />
                      <TimelineSection
                        title="项目经历"
                        items={profile.projectExperiences.map((item) => ({
                          title: item.projectName ?? "项目名称待提取",
                          subtitle: item.techStack.join(" / ") || "技术栈待提取",
                          description: [...item.responsibilities, ...item.highlights].join("；"),
                        }))}
                        emptyText="等待流式解析补充项目经历"
                      />

                      {profile.extractionNotes ? (
                        <div className="rounded-xl border border-border bg-background px-4 py-4">
                          <p className="flex items-center gap-2 text-sm font-medium text-slate-950">
                            <TextQuote className="size-4 text-slate-500" />
                            解析备注
                          </p>
                          <p className="mt-2 text-sm leading-7 text-slate-600">
                            {profile.extractionNotes}
                          </p>
                        </div>
                      ) : null}
                    </div>
                  ) : (
                    <ProcessingPlaceholder status={candidate.processingStatus} />
                  )}
                </div>
              </Card>
            </div>
          ) : previewUrl ? (
            <CandidatePdfPreview fileUrl={previewUrl} title={`${candidate.displayName} PDF 预览`} />
          ) : (
            <div className="flex min-h-[320px] items-center justify-center rounded-xl border border-dashed border-border bg-background px-6 text-center">
              <div className="max-w-sm space-y-2">
                <p className="text-sm font-medium text-slate-950">暂无预览</p>
              </div>
            </div>
          )}
        </div>
      </Card>

      <Dialog
        open={isDeleteDialogOpen}
        onOpenChange={(open) =>
          setDeleteDialogState({
            candidateId: open ? candidateId : null,
            open,
          })
        }
        title="确认删除这份简历？"
        description="删除后会同时移除候选人记录、结构化解析结果和原始 PDF，且无法恢复。"
        className="max-w-lg"
      >
        <div className="space-y-5">
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm leading-6 text-rose-700">
            当前操作对象：{candidate.displayName}
          </div>

          <div className="flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteDialogState({ candidateId: null, open: false })}
              disabled={isDeletingCandidate}
            >
              取消
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => void handleConfirmDelete()}
              disabled={isDeletingCandidate}
            >
              {isDeletingCandidate ? "删除中..." : "确认删除"}
            </Button>
          </div>
        </div>
      </Dialog>
    </section>
  );
}

function TabButton({
  isActive,
  label,
  onClick,
}: {
  isActive: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl px-4 py-2 text-sm font-medium transition-colors ${
        isActive ? "bg-white text-slate-950 shadow-sm" : "text-slate-500 hover:text-slate-950"
      }`}
    >
      {label}
    </button>
  );
}

function resolvePreviewUrl(candidate: CandidateDetailView) {
  if ("previewUrl" in candidate && candidate.previewUrl) {
    return candidate.previewUrl;
  }

  const originalFilePath = "originalFilePath" in candidate ? candidate.originalFilePath : undefined;

  if (typeof originalFilePath === "string" && /^(blob:|https?:)/.test(originalFilePath)) {
    return originalFilePath;
  }

  return getCandidateFileUrl(candidate.id);
}

const CANDIDATE_STATUS_OPTIONS: WorkspaceCandidateStatus[] = [
  "pending_review",
  "screening_passed",
  "interviewing",
  "hired",
  "rejected",
];

function InlineError({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
      <AlertTriangle className="mt-0.5 size-4 shrink-0" />
      <span>{message}</span>
    </div>
  );
}

function InfoGrid({ items }: { items: [string, string][] }) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {items.map(([label, value]) => (
        <div key={label} className="rounded-xl border border-border bg-background px-4 py-3">
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="mt-1 text-sm font-medium text-slate-950">{value}</p>
        </div>
      ))}
    </div>
  );
}

function TagSection({
  title,
  tags,
  emptyText,
}: {
  title: string;
  tags: string[];
  emptyText: string;
}) {
  const tagOccurrenceMap = new Map<string, number>();

  return (
    <div className="space-y-1.5">
      <p className="text-sm font-medium text-slate-950">{title}</p>
      <div className="flex flex-wrap gap-2">
        {tags.length > 0 ? (
          tags.map((tag) => {
            const occurrence = (tagOccurrenceMap.get(tag) ?? 0) + 1;
            tagOccurrenceMap.set(tag, occurrence);

            return (
              <span
                key={`${title}-${tag}-${occurrence}`}
                className="rounded-full border border-border bg-background px-3 py-1 text-xs text-slate-600"
              >
                {tag}
              </span>
            );
          })
        ) : (
          <p className="text-sm text-muted-foreground">{emptyText}</p>
        )}
      </div>
    </div>
  );
}

function TimelineSection({
  title,
  items,
  emptyText,
}: {
  title: string;
  items: { title: string; subtitle: string; description: string }[];
  emptyText?: string;
}) {
  const itemOccurrenceMap = new Map<string, number>();

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-slate-950">{title}</p>
      {items.length > 0 ? (
        <div className="space-y-2">
          {items.map((item) => {
            const itemSignature = `${item.title}-${item.subtitle}-${item.description}`;
            const occurrence = (itemOccurrenceMap.get(itemSignature) ?? 0) + 1;
            itemOccurrenceMap.set(itemSignature, occurrence);

            return (
              <div
                key={`${title}-${itemSignature}-${occurrence}`}
                className="rounded-xl border border-border bg-background px-4 py-4"
              >
                <p className="text-sm font-semibold text-slate-950">{item.title}</p>
                <p className="mt-1 text-xs text-muted-foreground">{item.subtitle}</p>
                {item.description ? (
                  <p className="mt-2 text-sm leading-7 text-slate-600">{item.description}</p>
                ) : null}
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">{emptyText ?? "暂无内容"}</p>
      )}
    </div>
  );
}

function getProcessingMessage(status: WorkspaceProcessingStatus) {
  const content = {
    uploaded: "文件已上传，等待后端开始解析。",
    parsing: "正在解析 PDF 内容。",
    extracting: "正在根据简历文本逐步提取结构化信息。",
    scoring: "正在生成岗位匹配评分。",
    ready: "简历解析已经完成。",
    failed: "解析或评分失败，请稍后重试。",
  } as const;

  return content[status];
}

function ProcessingPlaceholder({
  status,
  compact = false,
}: {
  status: WorkspaceProcessingStatus;
  compact?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border border-dashed border-border bg-background px-4 text-center ${
        compact ? "py-8" : "py-12"
      }`}
    >
      <p className="text-sm font-medium text-slate-950">{getProcessingMessage(status)}</p>
    </div>
  );
}

function CandidateDetailSkeleton() {
  return (
    <Card className="space-y-4 p-4">
      <div className="space-y-3 border-b border-border pb-4">
        <div className="h-6 w-48 rounded bg-muted" />
        <div className="h-4 w-72 rounded bg-muted" />
        <div className="grid gap-2 sm:grid-cols-3">
          <div className="h-16 rounded-xl bg-muted" />
          <div className="h-16 rounded-xl bg-muted" />
          <div className="h-16 rounded-xl bg-muted" />
        </div>
      </div>
      <div className="h-[520px] rounded-xl bg-muted" />
      <div className="grid gap-3 xl:grid-cols-2">
        <div className="h-80 rounded-xl bg-muted" />
        <div className="h-80 rounded-xl bg-muted" />
      </div>
    </Card>
  );
}
