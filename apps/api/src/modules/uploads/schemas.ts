import {
  candidateUploadFieldSchema,
  candidateUploadItemSchema,
  candidateUploadResponseSchema,
} from "@ai-resume-analyzer/shared";
import { z } from "zod";

export const uploadRequestFieldSchema = candidateUploadFieldSchema;

export const uploadItemSchema = candidateUploadItemSchema;

export const uploadResponseSchema = candidateUploadResponseSchema;

export const uploadErrorSchema = z.object({
  code: z.string().min(1),
  message: z.string().min(1),
  details: z.unknown().optional(),
});
