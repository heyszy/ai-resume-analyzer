import type { LucideIcon } from "lucide-react";
import { AlertTriangle, CircleCheckBig, Loader2, SquareDashedMousePointer } from "lucide-react";

import { Badge } from "@/components/ui/badge";

import type { UploadStatus } from "./upload-store";

const statusMap: Record<
  UploadStatus,
  {
    label: string;
    icon: LucideIcon;
    variant: "default" | "secondary" | "success" | "warning" | "destructive" | "outline";
  }
> = {
  queued: {
    label: "待上传",
    icon: SquareDashedMousePointer,
    variant: "outline",
  },
  uploading: {
    label: "上传中",
    icon: Loader2,
    variant: "warning",
  },
  success: {
    label: "成功",
    icon: CircleCheckBig,
    variant: "success",
  },
  error: {
    label: "失败",
    icon: AlertTriangle,
    variant: "destructive",
  },
};

export function UploadStatusBadge({ status }: { status: UploadStatus }) {
  const config = statusMap[status];
  const Icon = config.icon;

  return (
    <Badge variant={config.variant}>
      <Icon className={status === "uploading" ? "size-3.5 animate-spin" : "size-3.5"} />
      {config.label}
    </Badge>
  );
}
