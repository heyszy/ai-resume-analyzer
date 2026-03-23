import { RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

import { UploadStatusBadge } from "./upload-status-badge";
import type { UploadItem as UploadItemType } from "./upload-store";

type UploadInlineQueueProps = {
  items: UploadItemType[];
  onRetry: (item: UploadItemType) => void;
};

export function UploadInlineQueue({ items, onRetry }: UploadInlineQueueProps) {
  if (items.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div key={item.id} className="rounded-xl border border-border bg-background px-4 py-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <p className="truncate text-sm font-medium text-slate-950">{item.name}</p>
                <UploadStatusBadge status={item.status} />
              </div>
              <Progress value={item.progress} className="w-full" />
              <p className="text-xs text-muted-foreground">
                {item.errorMessage ?? item.responseMessage ?? `当前进度 ${item.progress}%`}
              </p>
            </div>

            <div className="flex shrink-0 items-center gap-1">
              {item.status === "error" ? (
                <Button
                  type="button"
                  size="icon-sm"
                  variant="outline"
                  onClick={() => onRetry(item)}
                >
                  <RotateCcw className="size-4" />
                </Button>
              ) : null}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
