import { Badge } from "@/components/ui/badge";

import {
  getCandidateStatusLabel,
  getProcessingStatusLabel,
  type WorkspaceCandidateStatus,
  type WorkspaceProcessingStatus,
} from "./workspace-model";

export function CandidateStatusBadge({ status }: { status: WorkspaceCandidateStatus }) {
  const variantMap: Record<
    WorkspaceCandidateStatus,
    "outline" | "success" | "warning" | "secondary"
  > = {
    pending_review: "outline",
    screening_passed: "success",
    interviewing: "warning",
    hired: "success",
    rejected: "secondary",
  };

  return <Badge variant={variantMap[status]}>{getCandidateStatusLabel(status)}</Badge>;
}

export function CandidateProcessingBadge({ status }: { status: WorkspaceProcessingStatus }) {
  const variantMap: Record<
    WorkspaceProcessingStatus,
    "outline" | "warning" | "success" | "destructive"
  > = {
    uploaded: "outline",
    parsing: "warning",
    extracting: "warning",
    scoring: "warning",
    ready: "success",
    failed: "destructive",
  };

  return <Badge variant={variantMap[status]}>{getProcessingStatusLabel(status)}</Badge>;
}
