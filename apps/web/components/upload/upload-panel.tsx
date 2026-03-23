"use client";

import { UploadCloud } from "lucide-react";
import { startTransition, useState } from "react";

import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import {
  buildUploadedCandidate,
  type WorkspaceCandidate,
  type WorkspaceProcessingStatus,
} from "@/components/workspace/workspace-model";
import { uploadResume } from "@/lib/upload";

import { UploadDropzone } from "./upload-dropzone";
import { UploadInlineQueue } from "./upload-inline-queue";
import type { UploadItem } from "./upload-store";
import { useUploadStore } from "./upload-store";
import { getRejectedFileMessage, isPdfFile } from "./upload-utils";

type UploadPanelProps = {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onCandidateCreated: (candidate: WorkspaceCandidate) => void;
  onUploadBatchCompleted: (candidates: WorkspaceCandidate[]) => void;
};

export function UploadPanel({
  isOpen,
  onOpenChange,
  onCandidateCreated,
  onUploadBatchCompleted,
}: UploadPanelProps) {
  const [notice, setNotice] = useState<string | null>(null);
  const [dropError, setDropError] = useState<string | null>(null);

  const items = useUploadStore((state) => state.items);
  const addFiles = useUploadStore((state) => state.addFiles);
  const updateItem = useUploadStore((state) => state.updateItem);
  const clearAll = useUploadStore((state) => state.clearAll);

  const hasItems = items.length > 0;
  const queuedItems = items.filter((item) => item.status === "queued");

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

    setNotice(`已加入 ${newItems.length} 份 PDF，开始上传。`);
    void uploadItems(newItems);
  };

  const handleUploadQueued = () => {
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
    const successfulCandidates: WorkspaceCandidate[] = [];

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

          const uploadedAt = new Date().toISOString();
          const previewUrl = URL.createObjectURL(item.file);
          const processingStatus = toWorkspaceProcessingStatus(result.uploadStatus);

          updateItem(item.id, {
            status: "success",
            progress: 100,
            candidateId: result.candidateId,
            responseMessage: result.message ?? "上传成功，已进入候选人列表。",
            errorMessage: undefined,
          });

          if (typeof result.candidateId === "string") {
            const candidateId = result.candidateId;
            const uploadedCandidate = buildUploadedCandidate({
              candidateId,
              file: item.file,
              uploadedAt,
              processingStatus,
              originalFilePath: result.originalFilePath,
              previewUrl,
            });

            successfulCandidates.push(uploadedCandidate);

            startTransition(() => {
              onCandidateCreated(uploadedCandidate);
            });
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : "上传失败";
          updateItem(item.id, {
            status: "error",
            errorMessage: message,
          });
        }
      }),
    );

    if (successfulCandidates.length > 0) {
      onUploadBatchCompleted(successfulCandidates);
    }
  }

  return (
    <div>
      <Button
        type="button"
        onClick={() => onOpenChange(true)}
        className="flex min-h-30 w-full flex-col items-center justify-center gap-2 rounded-2xl bg-slate-950 px-6 py-6 text-center text-white transition-colors hover:bg-slate-800 cursor-pointer"
      >
        <div className="flex size-12 items-center justify-center rounded-2xl bg-white/10 text-white">
          <UploadCloud className="size-5" />
        </div>
        <div>
          <p className="text-lg font-semibold text-white">上传简历</p>
        </div>
      </Button>

      <Dialog
        open={isOpen}
        onOpenChange={onOpenChange}
        title="上传简历"
        bodyClassName="flex min-h-0 flex-1 flex-col"
      >
        <div className="flex min-h-0 flex-1 flex-col gap-4">
          <div className="shrink-0 space-y-4">
            {queuedItems.length > 0 ? (
              <div className="flex justify-end">
                <Button type="button" onClick={handleUploadQueued}>
                  开始上传
                </Button>
              </div>
            ) : null}

            <UploadDropzone
              onFilesAccepted={handleFilesAccepted}
              onInvalidFiles={(message) => setDropError(message)}
              disabled={false}
            />

            {notice || hasItems ? (
              <div className="flex items-stretch justify-between gap-3">
                {notice ? <PanelNotice tone="info" message={notice} className="flex-1" /> : <div />}
                {hasItems ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleReset}
                    className="h-auto shrink-0 self-stretch px-4"
                  >
                    清空列表
                  </Button>
                ) : null}
              </div>
            ) : null}
            {dropError ? <PanelNotice tone="warning" message={dropError} /> : null}
          </div>

          {/* 队列区域单独滚动，避免文件较多时把整个弹窗撑出视口。 */}
          <div className="min-h-0 flex-1 overflow-y-auto pr-1">
            <UploadInlineQueue items={items} onRetry={handleRetry} />
          </div>
        </div>
      </Dialog>
    </div>
  );
}

function toWorkspaceProcessingStatus(value?: string): WorkspaceProcessingStatus {
  switch (value) {
    case "parsing":
    case "extracting":
    case "scoring":
    case "ready":
    case "failed":
      return value;
    default:
      return "uploaded";
  }
}

function PanelNotice({
  tone,
  message,
  className,
}: {
  tone: "info" | "warning";
  message: string;
  className?: string;
}) {
  const toneClassName = {
    info: "border-slate-200 bg-slate-50 text-slate-700",
    warning: "border-amber-200 bg-amber-50 text-amber-700",
  };

  return (
    <div
      className={`${className ?? ""} rounded-xl border px-4 py-3 text-sm ${toneClassName[tone]}`}
    >
      {message}
    </div>
  );
}
