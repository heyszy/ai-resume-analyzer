"use client";

import { ArrowDownUp, ChevronLeft, ChevronRight, LoaderCircle, Search, Trash2 } from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { CandidateStatusBadge } from "./workspace-badges";
import {
  getCandidateStatusLabel,
  type WorkspaceCandidateStatus,
  type WorkspaceCandidateSummary,
} from "./workspace-model";

type CandidateTableDialogProps = {
  open: boolean;
  candidates: WorkspaceCandidateSummary[];
  total: number;
  page: number;
  pageSize: number;
  sortKey: "uploadedAt" | "name" | "score";
  statusFilter: WorkspaceCandidateStatus | "all";
  searchKeyword: string;
  deletingCandidateId: string | null;
  onOpenChange: (open: boolean) => void;
  onSortChange: (value: "uploadedAt" | "name" | "score") => void;
  onStatusFilterChange: (value: WorkspaceCandidateStatus | "all") => void;
  onSearchChange: (value: string) => void;
  onPageChange: (page: number) => void;
  onSelectCandidate: (candidateId: string) => void;
  onDeleteCandidate: (candidateId: string) => void;
};

export function CandidateTableDialog({
  open,
  candidates,
  total,
  page,
  pageSize,
  sortKey,
  statusFilter,
  searchKeyword,
  deletingCandidateId,
  onOpenChange,
  onSortChange,
  onStatusFilterChange,
  onSearchChange,
  onPageChange,
  onSelectCandidate,
  onDeleteCandidate,
}: CandidateTableDialogProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <Dialog open={open} onOpenChange={onOpenChange} title="候选人表格视图" className="max-w-6xl">
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex shrink-0 items-center gap-3">
            <div className="w-40 shrink-0">
              <Select
                value={sortKey}
                onValueChange={(value) => onSortChange(value as typeof sortKey)}
              >
                <SelectTrigger id="candidate-table-sort" className="h-9 bg-background">
                  <div className="flex items-center gap-2">
                    <ArrowDownUp className="size-3.5 text-slate-400" />
                    <SelectValue />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="uploadedAt">按上传时间</SelectItem>
                  <SelectItem value="name">按姓名</SelectItem>
                  <SelectItem value="score">按分数</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="w-40 shrink-0">
              <Select
                value={statusFilter}
                onValueChange={(value) =>
                  onStatusFilterChange(value as WorkspaceCandidateStatus | "all")
                }
              >
                <SelectTrigger id="candidate-table-status" className="h-9 bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部状态</SelectItem>
                  <SelectItem value="pending_review">
                    {getCandidateStatusLabel("pending_review")}
                  </SelectItem>
                  <SelectItem value="screening_passed">
                    {getCandidateStatusLabel("screening_passed")}
                  </SelectItem>
                  <SelectItem value="interviewing">
                    {getCandidateStatusLabel("interviewing")}
                  </SelectItem>
                  <SelectItem value="hired">{getCandidateStatusLabel("hired")}</SelectItem>
                  <SelectItem value="rejected">{getCandidateStatusLabel("rejected")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="relative w-full max-w-sm shrink-0">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
            <Input
              id="candidate-table-search"
              value={searchKeyword}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="搜索姓名、技能、城市"
              className="h-9 pl-9"
            />
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-border">
          <div className="max-h-[70vh] overflow-auto">
            <table className="min-w-full table-fixed border-separate border-spacing-0 text-sm">
              <thead className="sticky top-0 z-10 bg-slate-50">
                <tr className="text-left text-xs font-medium tracking-[0.14em] text-slate-500 uppercase">
                  <TableHeadCell className="w-40">名称</TableHeadCell>
                  <TableHeadCell className="w-24">状态</TableHeadCell>
                  <TableHeadCell className="w-16">评分</TableHeadCell>
                  <TableHeadCell className="w-36 whitespace-nowrap">学校</TableHeadCell>
                  <TableHeadCell>技能</TableHeadCell>
                  <TableHeadCell className="w-28 whitespace-nowrap">所在城市</TableHeadCell>
                  <TableHeadCell className="w-20 text-right whitespace-nowrap">操作</TableHeadCell>
                </tr>
              </thead>

              <tbody className="bg-background">
                {candidates.length > 0 ? (
                  candidates.map((candidate) => {
                    const isDeleting = deletingCandidateId === candidate.id;

                    return (
                      <tr key={candidate.id} className="border-t border-border align-top">
                        <TableBodyCell className="font-medium text-slate-950">
                          <button
                            type="button"
                            onClick={() => {
                              onSelectCandidate(candidate.id);
                              onOpenChange(false);
                            }}
                            className="block w-full truncate text-left transition-colors hover:text-slate-700 cursor-pointer"
                          >
                            {candidate.displayName}
                          </button>
                        </TableBodyCell>
                        <TableBodyCell className="whitespace-nowrap">
                          <CandidateStatusBadge status={candidate.status} />
                        </TableBodyCell>
                        <TableBodyCell className="font-medium text-slate-950 whitespace-nowrap">
                          {candidate.currentScore?.totalScore ?? "--"}
                        </TableBodyCell>
                        <TableBodyCell className="whitespace-nowrap">
                          <div className="truncate">{candidate.school ?? "待补充"}</div>
                        </TableBodyCell>
                        <TableBodyCell className="max-w-0">
                          <div className="truncate text-xs text-slate-600">
                            {candidate.skillTags.length > 0
                              ? candidate.skillTags.join("、")
                              : "待补充"}
                          </div>
                        </TableBodyCell>
                        <TableBodyCell className="whitespace-nowrap">
                          <div className="truncate">{candidate.city ?? "待补充"}</div>
                        </TableBodyCell>
                        <TableBodyCell className="text-right whitespace-nowrap">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            disabled={isDeleting}
                            onClick={() => onDeleteCandidate(candidate.id)}
                            className="text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                          >
                            {isDeleting ? (
                              <LoaderCircle className="size-4 animate-spin" />
                            ) : (
                              <Trash2 />
                            )}
                            删除
                          </Button>
                        </TableBodyCell>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-4 py-12 text-center text-sm text-muted-foreground"
                    >
                      当前没有可展示的候选人
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3">
          <TablePager
            direction="prev"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
          />
          <p className="text-xs text-muted-foreground">{total} 条记录</p>
          <TablePager
            direction="next"
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
          />
        </div>
      </div>
    </Dialog>
  );
}

function TablePager({
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

function TableHeadCell({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <th className={`border-b border-border px-4 py-3 ${className ?? ""}`.trim()}>{children}</th>
  );
}

function TableBodyCell({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <td className={`border-b border-border px-4 py-3 text-slate-600 ${className ?? ""}`.trim()}>
      {children}
    </td>
  );
}
