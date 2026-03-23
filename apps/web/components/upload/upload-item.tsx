import { AlertTriangle, CircleCheckBig, FileText, Loader2, RotateCcw, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { UploadStatusBadge } from "./upload-status-badge";
import type { UploadItem as UploadItemType } from "./upload-store";
import { formatFileSize } from "./upload-utils";

type UploadItemProps = {
  item: UploadItemType;
  onRetry: (item: UploadItemType) => void;
  onRemove: (id: string) => void;
};

export function UploadItem({ item, onRetry, onRemove }: UploadItemProps) {
  return (
    <Card
      className={cn("overflow-hidden", item.status === "error" && "border-rose-200 bg-rose-50/60")}
    >
      <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex size-11 items-center justify-center rounded-2xl border border-border/70 bg-white shadow-sm">
            <FileText className="size-5 text-slate-700" />
          </div>

          <div className="min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="truncate text-sm font-semibold text-slate-950">{item.name}</h3>
              <UploadStatusBadge status={item.status} />
            </div>
            <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              <span>{formatFileSize(item.size)}</span>
              <span>{item.type || "application/pdf"}</span>
              <span>进度 {item.progress}%</span>
            </div>

            <div className="space-y-2">
              <Progress value={item.progress} />
              {item.errorMessage ? (
                <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
                  <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
                  <span>{item.errorMessage}</span>
                </div>
              ) : null}
              {item.responseMessage ? (
                <div className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
                  <CircleCheckBig className="mt-0.5 size-3.5 shrink-0" />
                  <span>{item.responseMessage}</span>
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:flex-col sm:items-end">
          {item.status === "uploading" ? (
            <Button type="button" size="sm" variant="secondary" disabled>
              <Loader2 className="size-4 animate-spin" />
              上传中
            </Button>
          ) : null}

          {item.status === "error" ? (
            <Button type="button" size="sm" variant="outline" onClick={() => onRetry(item)}>
              <RotateCcw className="size-4" />
              重试
            </Button>
          ) : null}

          <Button type="button" size="sm" variant="ghost" onClick={() => onRemove(item.id)}>
            <Trash2 className="size-4" />
            移除
          </Button>
        </div>
      </div>
    </Card>
  );
}
