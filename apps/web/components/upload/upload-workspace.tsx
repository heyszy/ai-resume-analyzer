"use client";

import { useState } from "react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

import { uploadResume } from "@/lib/upload";

import { UploadDropzone } from "./upload-dropzone";
import { UploadQueue } from "./upload-queue";
import type { UploadItem } from "./upload-store";
import { useUploadStore } from "./upload-store";
import { UploadSummary } from "./upload-summary";
import { getRejectedFileMessage, isPdfFile } from "./upload-utils";

export function UploadWorkspace() {
  const [notice, setNotice] = useState<string | null>(null);
  const [dropError, setDropError] = useState<string | null>(null);

  const items = useUploadStore((state) => state.items);
  const addFiles = useUploadStore((state) => state.addFiles);
  const updateItem = useUploadStore((state) => state.updateItem);
  const removeItem = useUploadStore((state) => state.removeItem);
  const clearCompleted = useUploadStore((state) => state.clearCompleted);
  const clearAll = useUploadStore((state) => state.clearAll);

  const handleFilesAccepted = (acceptedFiles: File[]) => {
    const pdfFiles = acceptedFiles.filter(isPdfFile);
    const rejectedFiles = acceptedFiles.filter((file) => !isPdfFile(file));

    if (rejectedFiles.length > 0) {
      setDropError(getRejectedFileMessage(rejectedFiles));
    }

    if (pdfFiles.length === 0) {
      return;
    }

    setDropError(null);
    const newItems = addFiles(pdfFiles);

    if (newItems.length === 0) {
      setNotice("重复文件已自动忽略。");
      return;
    }

    setNotice(`已加入 ${newItems.length} 份 PDF，开始并发上传。`);
    void uploadItems(newItems);
  };

  const handleUploadQueued = () => {
    const queuedItems = items.filter((item) => item.status === "queued");

    if (queuedItems.length === 0) {
      setNotice("当前没有待上传的 PDF。");
      return;
    }

    setDropError(null);
    setNotice(`开始上传 ${queuedItems.length} 份 PDF。`);
    void uploadItems(queuedItems);
  };

  const handleRetry = (item: UploadItem) => {
    setDropError(null);
    setNotice(`正在重试 ${item.name}`);
    void uploadItems([item], true);
  };

  const handleReset = () => {
    setDropError(null);
    setNotice(null);
    clearAll();
  };

  async function uploadItems(targetItems: UploadItem[], isRetry = false) {
    await Promise.allSettled(
      targetItems.map(async (item) => {
        updateItem(item.id, {
          status: "uploading",
          progress: 0,
          errorMessage: undefined,
          responseMessage: isRetry ? undefined : item.responseMessage,
        });

        try {
          const result = await uploadResume({
            file: item.file,
            onProgress: (progress) => {
              updateItem(item.id, {
                status: "uploading",
                progress,
              });
            },
          });

          updateItem(item.id, {
            status: "success",
            progress: 100,
            candidateId: result.candidateId,
            responseMessage: result.message ?? "上传成功，后续会进入解析流程。",
            errorMessage: undefined,
          });
        } catch (error) {
          const message = error instanceof Error ? error.message : "上传失败";
          updateItem(item.id, {
            status: "error",
            errorMessage: message,
          });
        }
      }),
    );
  }

  const total = items.length;
  const uploading = items.filter((item) => item.status === "uploading").length;
  const success = items.filter((item) => item.status === "success").length;
  const failed = items.filter((item) => item.status === "error").length;

  return (
    <div className="space-y-6">
      <section className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
        <div className="space-y-4">
          <div className="space-y-3">
            <p className="text-sm font-medium uppercase tracking-[0.28em] text-muted-foreground">
              Upload Workspace
            </p>
            <h1 className="max-w-2xl text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
              批量上传 PDF 简历，先把队列、进度和状态跑通
            </h1>
            <p className="max-w-3xl text-sm leading-7 text-slate-600">
              这一版只负责上传体验：拖拽、点击、并发上传、单文件状态和失败重试。候选人解析和评分会在后续接入。
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <StatCard label="总文件数" value={total} />
            <StatCard label="上传中" value={uploading} />
            <StatCard label="成功 / 失败" value={`${success} / ${failed}`} />
          </div>
        </div>

        <UploadSummary
          onUpload={handleUploadQueued}
          onReset={handleReset}
          disabled={items.filter((item) => item.status === "queued").length === 0}
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
        <UploadDropzone
          onFilesAccepted={handleFilesAccepted}
          onInvalidFiles={(message) => setDropError(message)}
          disabled={false}
        />

        <Card className="h-full">
          <CardHeader>
            <CardTitle>上传说明</CardTitle>
            <CardDescription>
              先保留一个干净的工作台结构，后续候选人、JD 和评分页都能复用。
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm leading-7 text-slate-600">
            <p>
              当前页面默认连接 `NEXT_PUBLIC_API_BASE_URL`，未配置时会回退到
              `http://localhost:3001/v1`。
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <InfoCard title="导航骨架" text="左侧导航已预留候选人和岗位配置入口。" />
              <InfoCard title="状态可追踪" text="每份 PDF 都会显示独立进度和失败原因。" />
              <InfoCard title="组件拆分" text="上传区、队列和状态项都拆成独立组件。" />
              <InfoCard title="后续扩展" text="解析、评分和 SSE 结果会继续接在单文件任务上。" />
            </div>
          </CardContent>
        </Card>
      </section>

      {notice ? <NoticeBanner tone="success" message={notice} /> : null}
      {dropError ? <NoticeBanner tone="warning" message={dropError} /> : null}
      <UploadQueue
        items={items}
        onRetry={handleRetry}
        onRemove={removeItem}
        onClearCompleted={clearCompleted}
        onClearAll={clearAll}
      />
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-3xl border border-border/70 bg-white/85 p-4 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-[0.24em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">{value}</p>
    </div>
  );
}

function InfoCard({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-2xl border border-border/70 bg-slate-50/70 p-4">
      <p className="font-medium text-slate-950">{title}</p>
      <p className="mt-1 text-sm leading-6 text-slate-600">{text}</p>
    </div>
  );
}

function NoticeBanner({
  tone,
  message,
}: {
  tone: "success" | "warning" | "info";
  message: string;
}) {
  const toneClassNames = {
    success: "border-emerald-200 bg-emerald-50 text-emerald-800",
    warning: "border-amber-200 bg-amber-50 text-amber-800",
    info: "border-slate-200 bg-slate-50 text-slate-800",
  };

  return (
    <div className={`rounded-2xl border px-4 py-3 text-sm ${toneClassNames[tone]}`}>{message}</div>
  );
}
