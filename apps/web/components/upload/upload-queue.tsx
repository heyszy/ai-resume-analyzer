import { FileText } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { UploadItem } from "./upload-item";
import type { UploadItem as UploadItemType } from "./upload-store";
import { countUploads } from "./upload-utils";

type UploadQueueProps = {
  items: UploadItemType[];
  onRetry: (item: UploadItemType) => void;
  onRemove: (id: string) => void;
  onClearCompleted: () => void;
  onClearAll: () => void;
};

export function UploadQueue({
  items,
  onRetry,
  onRemove,
  onClearCompleted,
  onClearAll,
}: UploadQueueProps) {
  const summary = countUploads(items);

  return (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <CardTitle>上传队列</CardTitle>
            <CardDescription>每个 PDF 独立展示进度、结果和失败原因。</CardDescription>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <FileText className="size-4" />
            {summary.total} 份文件
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="待处理" value={summary.queued} />
          <MetricCard label="上传中" value={summary.uploading} />
          <MetricCard label="成功" value={summary.success} />
          <MetricCard label="失败" value={summary.error} />
        </div>

        <Separator />

        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-muted-foreground">
            上传完成后，候选人记录会在这里继续接入解析和评分结果。
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={onClearCompleted}
              disabled={summary.success === 0}
            >
              清理成功项
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={onClearAll}
              disabled={summary.total === 0}
            >
              全部清空
            </Button>
          </div>
        </div>

        <div className="space-y-3">
          {items.length > 0 ? (
            items.map((item) => (
              <UploadItem key={item.id} item={item} onRetry={onRetry} onRemove={onRemove} />
            ))
          ) : (
            <EmptyQueue />
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function MetricCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-border/70 bg-slate-50/80 p-4">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">{value}</p>
    </div>
  );
}

function EmptyQueue() {
  return (
    <div className="flex min-h-56 flex-col items-center justify-center rounded-3xl border border-dashed border-border/70 bg-slate-50/60 px-6 text-center">
      <div className="rounded-2xl border border-border/70 bg-white p-3 shadow-sm">
        <FileText className="size-6 text-slate-700" />
      </div>
      <p className="mt-4 text-sm font-medium text-slate-950">还没有上传任务</p>
      <p className="mt-1 text-sm text-muted-foreground">拖拽 PDF 到左侧区域，或者点击选择文件。</p>
    </div>
  );
}
