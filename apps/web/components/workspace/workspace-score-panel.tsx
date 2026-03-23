"use client";

import { Sparkles, Wand2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";

import { formatDateTime, type WorkspaceCandidate, type WorkspaceScore } from "./workspace-model";
import { WorkspaceScoreVisual } from "./workspace-score-visual";

type WorkspaceScorePreview = NonNullable<WorkspaceCandidate["currentScore"]>;

type WorkspaceScorePanelProps = {
  candidateName: string | null;
  jobTitle: string | null;
  score: WorkspaceScore | null;
  scorePreview: WorkspaceScorePreview | null;
  isScoreLoading: boolean;
  isGenerating: boolean;
  errorMessage: string | null;
  streamingMessage: string | null;
  streamingCommentary: string | null;
  onGenerate: () => void;
};

export function WorkspaceScorePanel({
  candidateName,
  jobTitle,
  score,
  scorePreview,
  isScoreLoading,
  isGenerating,
  errorMessage,
  streamingMessage,
  streamingCommentary,
  onGenerate,
}: WorkspaceScorePanelProps) {
  const scoreSource = score ?? scorePreview;
  const scoreTitle = score?.jdTitle ?? scorePreview?.jdTitle ?? jobTitle;
  const scoredAt = score?.scoredAt ?? scorePreview?.scoredAt ?? null;
  const hasExistingScore = score !== null || scorePreview !== null;
  const actionLabel = isGenerating
    ? "生成中..."
    : isScoreLoading
      ? "查询中..."
      : hasExistingScore
        ? "重新生成评分"
        : "生成智能评分";

  return (
    <Card className="relative overflow-hidden border-slate-200 bg-gradient-to-br from-white via-white to-slate-50">
      <div className="space-y-3 px-3 py-3">
        <div className="flex items-center justify-between gap-3">
          <div className="text-sm font-semibold text-slate-950">智能评分</div>
          <Button
            type="button"
            size="sm"
            className="shrink-0"
            onClick={onGenerate}
            disabled={isGenerating || isScoreLoading || !candidateName || !jobTitle}
          >
            <Sparkles className={`size-3.5 ${isGenerating ? "animate-pulse" : ""}`} />
            {actionLabel}
          </Button>
        </div>

        {candidateName && jobTitle ? (
          <div className="space-y-3">
            {errorMessage ? <InlineError message={errorMessage} /> : null}
            {isGenerating && !scoreSource ? (
              <ScoreStreamingState
                message={streamingMessage}
                commentary={streamingCommentary}
                jobTitle={jobTitle}
              />
            ) : null}
            {isScoreLoading && !scoreSource ? <ScoreLoadingState /> : null}
            {!isGenerating && scoreSource ? (
              <div className="space-y-3">
                <WorkspaceScoreVisual score={scoreSource} />

                <div className="space-y-2">
                  <MetricProgress label="技能匹配度" value={scoreSource.skillMatchScore} />
                  <MetricProgress label="经验相关性" value={scoreSource.experienceRelevanceScore} />
                  <MetricProgress label="教育背景契合度" value={scoreSource.educationFitScore} />
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white px-3 py-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium text-slate-950">AI 评语</p>
                      <p className="mt-1 text-xs text-slate-500">
                        {scoreTitle}
                        {scoredAt ? ` · ${formatDateTime(scoredAt)}` : ""}
                      </p>
                    </div>
                    {score?.isStale ? <Badge variant="warning">结果已过期</Badge> : null}
                    {!score ? <Badge variant="secondary">评分摘要</Badge> : null}
                  </div>

                  {score ? (
                    <p className="mt-3 text-sm leading-7 text-slate-700">{score.aiCommentary}</p>
                  ) : (
                    <div className="mt-3 rounded-xl border border-dashed border-slate-200 bg-slate-50 px-3 py-3 text-sm leading-7 text-slate-600">
                      当前仅保留评分摘要，重新生成后会补全 AI 评语与更细的分析。
                    </div>
                  )}
                </div>
              </div>
            ) : !isGenerating ? (
              <ScoreEmptyState />
            ) : null}
          </div>
        ) : (
          <ScoreDisabledState />
        )}
      </div>
    </Card>
  );
}

function ScoreLoadingState() {
  return (
    <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-3 py-4">
      <div className="space-y-2">
        <p className="text-sm font-medium text-slate-950">正在查询评分</p>
        <p className="text-sm leading-6 text-slate-600">
          正在检查当前候选人在该岗位下是否已有评分结果。
        </p>
        <div className="grid gap-2">
          <Skeleton className="h-12 rounded-xl bg-slate-100" />
          <Skeleton className="h-12 rounded-xl bg-slate-100" />
          <Skeleton className="h-12 rounded-xl bg-slate-100" />
        </div>
      </div>
    </div>
  );
}

function InlineError({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm leading-6 text-rose-700">
      {message}
    </div>
  );
}

function MetricProgress({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-3 py-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium leading-5 text-slate-950">{label}</p>
        <p className="text-sm font-semibold text-slate-900">{value}</p>
      </div>
      <Progress className="mt-2 bg-slate-100" value={value} />
    </div>
  );
}

function ScoreEmptyState() {
  return (
    <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-3 py-4">
      <div className="space-y-3">
        <div className="space-y-1.5">
          <p className="text-sm font-medium text-slate-950">尚未生成评分</p>
          <p className="text-sm leading-6 text-slate-600">
            点击右上角按钮后，系统会根据当前候选人与岗位要求生成综合匹配度、子维度评分和 AI 评语。
          </p>
        </div>

        <div className="grid gap-2">
          <Skeleton className="h-12 rounded-xl bg-slate-100" />
          <Skeleton className="h-12 rounded-xl bg-slate-100" />
          <Skeleton className="h-12 rounded-xl bg-slate-100" />
        </div>
      </div>
    </div>
  );
}

function ScoreStreamingState({
  message,
  commentary,
  jobTitle,
}: {
  message: string | null;
  commentary: string | null;
  jobTitle: string;
}) {
  return (
    <div className="space-y-3">
      <div className="flex flex-col items-center justify-center rounded-3xl border border-slate-200 bg-slate-950 px-4 py-6 text-white">
        <div className="relative flex size-28 items-center justify-center">
          <div className="absolute inset-0 rounded-full border-[10px] border-white/10" />
          <div className="size-28 animate-spin rounded-full border-[10px] border-transparent border-t-slate-100 border-r-slate-300/70" />
          <div className="absolute inset-5 rounded-full bg-slate-950" />
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <p className="text-sm font-semibold">生成中</p>
            <p className="mt-1 text-[10px] tracking-[0.24em] text-white/50">SCORING</p>
          </div>
        </div>
        <div className="mt-3 text-center">
          <p className="text-xs uppercase tracking-[0.2em] text-white/55">综合匹配度</p>
          <p className="mt-1 text-sm text-white/72">{message ?? "正在生成岗位匹配评分"}</p>
        </div>
      </div>

      <div className="space-y-2">
        <StreamingMetricCard label="技能匹配度" />
        <StreamingMetricCard label="经验相关性" />
        <StreamingMetricCard label="教育背景契合度" />
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white px-3 py-3">
        <div>
          <p className="text-sm font-medium text-slate-950">AI 评语</p>
          <p className="mt-1 text-xs text-slate-500">{jobTitle}</p>
        </div>

        {commentary ? (
          <TypingCommentary text={commentary} />
        ) : (
          <div className="mt-3 space-y-2">
            <p className="text-sm leading-6 text-slate-600">
              正在通过 SSE 持续生成岗位匹配分析，请稍候。
            </p>
            <Skeleton className="h-4 rounded-full bg-slate-100" />
            <Skeleton className="h-4 w-4/5 rounded-full bg-slate-100" />
            <Skeleton className="h-4 w-3/5 rounded-full bg-slate-100" />
          </div>
        )}
      </div>
    </div>
  );
}

function StreamingMetricCard({ label }: { label: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-3 py-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium leading-5 text-slate-950">{label}</p>
        <p className="text-sm font-semibold text-slate-400">--</p>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
        <div className="h-full w-1/2 animate-pulse rounded-full bg-slate-300/80" />
      </div>
    </div>
  );
}

function ScoreDisabledState() {
  return (
    <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-3 py-6 text-center">
      <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-slate-950 text-white">
        <Wand2 className="size-6" />
      </div>
      <p className="mt-4 text-sm font-medium text-slate-950">先选择候选人和职位</p>
      <p className="mt-2 text-sm leading-6 text-slate-600">
        选中目标候选人和岗位后，就可以生成智能评分结果。
      </p>
    </div>
  );
}

function TypingCommentary({ text }: { text: string }) {
  const [visibleText, setVisibleText] = useState(text);
  const visibleTextRef = useRef(text);

  useEffect(() => {
    visibleTextRef.current = visibleText;
  }, [visibleText]);

  useEffect(() => {
    if (!text) {
      setVisibleText("");
      visibleTextRef.current = "";
      return undefined;
    }

    const canContinueTyping = text.startsWith(visibleTextRef.current);
    let index = canContinueTyping ? visibleTextRef.current.length : 0;

    if (!canContinueTyping) {
      setVisibleText("");
      visibleTextRef.current = "";
    }

    const timer = window.setInterval(() => {
      index += 1;
      const nextText = text.slice(0, index);
      visibleTextRef.current = nextText;
      setVisibleText(nextText);

      if (index >= text.length) {
        window.clearInterval(timer);
      }
    }, 12);

    return () => {
      window.clearInterval(timer);
    };
  }, [text]);

  return <p className="mt-3 text-sm leading-7 text-slate-700">{visibleText}</p>;
}
