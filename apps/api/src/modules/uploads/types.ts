import type { Multipart } from "@fastify/multipart";
import type { z } from "zod";

import type { uploadItemSchema, uploadRequestFieldSchema, uploadResponseSchema } from "./schemas";

export type UploadRequestFields = z.infer<typeof uploadRequestFieldSchema>;
export type UploadItem = z.infer<typeof uploadItemSchema>;
export type UploadResponse = z.infer<typeof uploadResponseSchema>;

export type CandidateStatus =
  | "pending_review"
  | "screening_passed"
  | "interviewing"
  | "hired"
  | "rejected";

export type CandidateProcessingStatus =
  | "uploaded"
  | "parsing"
  | "extracting"
  | "scoring"
  | "ready"
  | "failed";

export interface CandidateMetadataRecord {
  candidateId: string;
  displayName: string;
  originalFileName: string;
  originalFilePath: string;
  mimeType: "application/pdf";
  fileSize: number;
  pageCount: number;
  status: CandidateStatus;
  processingStatus: CandidateProcessingStatus;
  uploadedAt: string;
}

export type UploadPart = Multipart;
