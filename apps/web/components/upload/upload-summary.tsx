import { ArrowRight, UploadCloud } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type UploadSummaryProps = {
  onUpload: () => void;
  onReset: () => void;
  disabled: boolean;
};

export function UploadSummary({ onUpload, onReset, disabled }: UploadSummaryProps) {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>上传配置</CardTitle>
        <CardDescription>当前只保留批量上传能力，不再额外提交候选人来源字段。</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
          <p className="font-medium text-slate-900">上传策略</p>
          <p className="mt-1 leading-6">
            当前会并发处理队列中的 PDF，并在上传过程中保持每个文件的独立进度。
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button type="button" className="flex-1" onClick={onUpload} disabled={disabled}>
            <UploadCloud className="size-4" />
            开始上传
          </Button>
          <Button type="button" variant="outline" onClick={onReset}>
            <ArrowRight className="size-4 rotate-180" />
            重置队列
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
