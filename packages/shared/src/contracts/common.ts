import { z } from "zod";

export const uuidSchema = z.string().uuid();

export const isoDateTimeSchema = z.string().datetime({ offset: true });

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export const sortOrderSchema = z.enum(["asc", "desc"]);

export const apiErrorSchema = z.object({
  code: z.string().min(1),
  message: z.string().min(1),
  details: z.unknown().optional(),
});

export const candidateStatusSchema = z.enum([
  "pending_review",
  "screening_passed",
  "interviewing",
  "hired",
  "rejected",
]);

export const candidateProcessingStatusSchema = z.enum([
  "uploaded",
  "parsing",
  "extracting",
  "scoring",
  "ready",
  "failed",
]);

export const jobDescriptionStatusSchema = z.enum(["active", "archived"]);

export const analysisStreamEventTypeSchema = z.enum([
  "progress",
  "resume.partial",
  "resume.final",
  "score.partial",
  "score.final",
  "error",
  "done",
]);

export const candidateStatusTransitionReasonSchema = z.string().min(1).max(500).optional();
