"use client";

import { ChevronLeft, ChevronRight, Search, Table2 } from "lucide-react";
import { startTransition } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

import { UploadPanel } from "@/components/upload/upload-panel";

import { CandidateStatusBadge } from "./workspace-badges";
import {
  formatDateTime,
  type WorkspaceCandidate,
  type WorkspaceCandidateSummary,
} from "./workspace-model";

type CandidateListPanelProps = {
  candidates: WorkspaceCandidateSummary[];
  total: number;
  page: number;
  pageSize: number;
  selectedCandidateId: string | null;
  searchKeyword: string;
  isUploadPanelOpen: boolean;
  isCandidateTableOpen: boolean;
  isLoading: boolean;
  errorMessage: string | null;
  onSearchChange: (value: string) => void;
  onSelectCandidate: (candidateId: string) => void;
  onPageChange: (page: number) => void;
  onUploadPanelOpenChange: (isOpen: boolean) => void;
  onCandidateTableOpenChange: (isOpen: boolean) => void;
  onCandidateCreated: (candidate: WorkspaceCandidate) => void;
  onUploadBatchCompleted: (candidates: WorkspaceCandidate[]) => void;
};

export function CandidateListPanel({
  candidates,
  total,
  page,
  pageSize,
  selectedCandidateId,
  searchKeyword,
  isUploadPanelOpen,
  isCandidateTableOpen,
  isLoading,
  errorMessage,
  onSearchChange,
  onSelectCandidate,
  onPageChange,
  onUploadPanelOpenChange,
  onCandidateTableOpenChange,
  onCandidateCreated,
  onUploadBatchCompleted,
}: CandidateListPanelProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <section className="space-y-3">
      <UploadPanel
        isOpen={isUploadPanelOpen}
        onOpenChange={onUploadPanelOpenChange}
        onCandidateCreated={onCandidateCreated}
        onUploadBatchCompleted={onUploadBatchCompleted}
      />

      <Card className="overflow-hidden">
        <div className="border-b border-border px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-slate-950">候选人列表</p>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                aria-pressed={isCandidateTableOpen}
                onClick={() => onCandidateTableOpenChange(true)}
              >
                <Table2 className="size-4" />
                表格视图
              </Button>
            </div>
          </div>

          <div className="mt-3 space-y-2">
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
              <Input
                id="candidate-search"
                value={searchKeyword}
                onChange={(event) => onSearchChange(event.target.value)}
                placeholder="搜索姓名、技能、城市"
                className="pl-9"
              />
            </div>
          </div>
        </div>

        <div className="max-h-[calc(100vh-260px)] space-y-2 overflow-y-auto px-3 py-3">
          {errorMessage ? <ListError message={errorMessage} /> : null}

          {isLoading && candidates.length === 0 ? (
            <CandidateSkeletonList />
          ) : candidates.length > 0 ? (
            candidates.map((candidate) => {
              const isSelected = candidate.id === selectedCandidateId;

              return (
                <button
                  key={candidate.id}
                  type="button"
                  onClick={() => startTransition(() => onSelectCandidate(candidate.id))}
                  className={`block w-full rounded-xl border px-3 py-3 text-left transition-colors ${
                    isSelected
                      ? "border-slate-900 bg-slate-950 text-white"
                      : "border-border bg-background hover:bg-muted/60"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-sm font-semibold">{candidate.displayName}</p>
                        <CandidateStatusBadge status={candidate.status} />
                      </div>
                      <p
                        className={`mt-1 text-xs ${
                          isSelected ? "text-white/70" : "text-muted-foreground"
                        }`}
                      >
                        上传时间：{formatDateTime(candidate.uploadedAt)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-base font-semibold">
                        {candidate.currentScore ? `${candidate.currentScore.totalScore}` : "--"}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })
          ) : (
            <div className="rounded-xl border border-dashed border-border bg-muted/50 px-4 py-8 text-center">
              <p className="text-sm font-medium text-slate-950">没有匹配到候选人</p>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-border px-4 py-3">
          <ButtonPager
            direction="prev"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
          />
          <p className="text-xs text-muted-foreground">{total} 条记录</p>
          <ButtonPager
            direction="next"
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
          />
        </div>
      </Card>
    </section>
  );
}

function ButtonPager({
  direction,
  disabled,
  onClick,
}: {
  direction: "prev" | "next";
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-muted/60 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {direction === "prev" ? <ChevronLeft className="size-3.5" /> : null}
      {direction === "prev" ? "上一页" : "下一页"}
      {direction === "next" ? <ChevronRight className="size-3.5" /> : null}
    </button>
  );
}

function CandidateSkeletonList() {
  return (
    <div className="space-y-2">
      {[
        "candidate-skeleton-1",
        "candidate-skeleton-2",
        "candidate-skeleton-3",
        "candidate-skeleton-4",
      ].map((key) => (
        <div key={key} className="rounded-xl border border-border bg-background px-3 py-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 space-y-2">
              <Skeleton className="h-4 w-32" />
              <div className="flex gap-2">
                <Skeleton className="h-5 w-14 rounded-full" />
                <Skeleton className="h-5 w-14 rounded-full" />
              </div>
            </div>
            <Skeleton className="h-5 w-10" />
          </div>
          <div className="mt-3 flex gap-2">
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

function ListError({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs leading-5 text-rose-700">
      {message}
    </div>
  );
}
