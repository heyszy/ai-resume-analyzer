import {
  candidateProcessingStatusSchema,
  candidateScorePreviewSchema,
  candidateScoreSchema,
  candidateStatusSchema,
  isoDateTimeSchema,
  paginationQuerySchema,
  sortOrderSchema,
  uuidSchema,
} from "@ai-resume-analyzer/shared";
import { z } from "zod";

const candidateStatusArraySchema = z.preprocess((value) => {
  if (typeof value === "undefined") {
    return undefined;
  }

  return Array.isArray(value) ? value : [value];
}, z.array(candidateStatusSchema).optional());

export const candidateBasicInfoSchema = z.object({
  name: z.string().trim().min(1).nullable(),
  phone: z.string().trim().min(1).nullable(),
  email: z.string().trim().min(1).nullable(),
  city: z.string().trim().min(1).nullable(),
});

export const candidateEducationSchema = z.object({
  school: z.string().trim().min(1).nullable(),
  major: z.string().trim().min(1).nullable(),
  degree: z.string().trim().min(1).nullable(),
  graduationTime: z.string().trim().min(1).nullable(),
});

export const candidateWorkExperienceSchema = z.object({
  companyName: z.string().trim().min(1).nullable(),
  position: z.string().trim().min(1).nullable(),
  timeRange: z.string().trim().min(1).nullable(),
  summary: z.string().trim().min(1).nullable(),
});

export const candidateProjectExperienceSchema = z.object({
  projectName: z.string().trim().min(1).nullable(),
  techStack: z.array(z.string().min(1)).default([]),
  responsibilities: z.array(z.string().min(1)).default([]),
  highlights: z.array(z.string().min(1)).default([]),
});

export const candidateProfileSchema = z.object({
  basicInfo: candidateBasicInfoSchema,
  educationHistory: z.array(candidateEducationSchema).default([]),
  workExperiences: z.array(candidateWorkExperienceSchema).default([]),
  skillTags: z.array(z.string().min(1)).default([]),
  projectExperiences: z.array(candidateProjectExperienceSchema).default([]),
  sourceText: z.string(),
  cleanedText: z.string(),
  extractionNotes: z.string(),
  extractedAt: isoDateTimeSchema.nullable().optional(),
});

export const candidateListQuerySchema = paginationQuerySchema.extend({
  keyword: z.string().trim().optional(),
  status: candidateStatusArraySchema,
  skillTags: z.array(z.string().min(1)).optional(),
  sortBy: z.enum(["score", "uploadedAt", "updatedAt", "name"]).default("uploadedAt"),
  sortOrder: sortOrderSchema.default("desc"),
  jdId: uuidSchema.optional(),
});

export const candidateSummarySchema = z.object({
  id: uuidSchema,
  displayName: z.string().min(1),
  email: z.string().email().optional().nullable(),
  phone: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  school: z.string().optional().nullable(),
  skillTags: z.array(z.string().min(1)),
  status: candidateStatusSchema,
  processingStatus: candidateProcessingStatusSchema,
  processingErrorCode: z.string().nullable(),
  processingErrorMessage: z.string().nullable(),
  uploadedAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
  currentScore: candidateScorePreviewSchema.nullable().optional(),
});

export const candidateDetailSchema = candidateSummarySchema.extend({
  originalFileName: z.string().min(1),
  originalFilePath: z.string().min(1),
  mimeType: z.string().min(1),
  fileSize: z.number().int().nonnegative(),
  pageCount: z.number().int().nonnegative(),
  profile: candidateProfileSchema.nullable(),
  rawText: z.string().nullable(),
  cleanedText: z.string().nullable(),
  scores: z.array(candidateScoreSchema),
});

export const candidateListResponseSchema = z.object({
  items: z.array(candidateSummarySchema),
  page: z.number().int().min(1),
  pageSize: z.number().int().min(1),
  total: z.number().int().nonnegative(),
});

export const candidateDetailResponseSchema = candidateDetailSchema;
