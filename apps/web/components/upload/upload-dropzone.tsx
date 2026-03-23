"use client";

import { UploadCloud } from "lucide-react";
import { useDropzone } from "react-dropzone";

import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type UploadDropzoneProps = {
  onFilesAccepted: (files: File[]) => void;
  onInvalidFiles: (message: string) => void;
  disabled?: boolean;
  compact?: boolean;
  hideTips?: boolean;
};

export function UploadDropzone({
  onFilesAccepted,
  onInvalidFiles,
  disabled = false,
}: UploadDropzoneProps) {
  const { getInputProps, getRootProps, isDragActive } = useDropzone({
    disabled,
    multiple: true,
    accept: {
      "application/pdf": [".pdf"],
    },
    onDropAccepted: onFilesAccepted,
    onDropRejected: (rejections) => {
      const rejectedNames = rejections.map((entry) => entry.file.name).filter(Boolean);

      if (rejectedNames.length > 0) {
        onInvalidFiles(`仅支持 PDF 文件，已忽略：${rejectedNames.join("、")}`);
      }
    },
  });

  return (
    <Card
      {...getRootProps()}
      className={cn(
        "group cursor-pointer overflow-hidden border-dashed bg-background p-8",
        isDragActive && "border-slate-400 bg-slate-50/90",
        disabled && "pointer-events-none opacity-70",
      )}
    >
      <input {...getInputProps()} />
      <div className="flex min-h-56 flex-col items-center justify-center gap-3 text-center">
        <div className="flex size-14 items-center justify-center rounded-2xl bg-slate-950 text-white">
          <UploadCloud className="size-6" />
        </div>
        <div className="space-y-1">
          <p className="text-lg font-semibold text-slate-950">点击开始上传或拖入 PDF 文件</p>
          <p className="text-sm text-muted-foreground">仅支持 PDF 格式</p>
        </div>
      </div>
    </Card>
  );
}
