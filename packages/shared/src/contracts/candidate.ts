import { z } from "zod";

import {
  apiErrorSchema,
  candidateProcessingStatusSchema,
  candidateStatusSchema,
  isoDateTimeSchema,
  paginationQuerySchema,
  sortOrderSchema,
  uuidSchema,
} from "./common";

const nullableTextSchema = z.string().trim().min(1).nullable();
const nullableEmailSchema = z.string().email().nullable();
const candidateStatusArraySchema = z.preprocess((value) => {
  if (typeof value === "undefined") {
    return undefined;
  }

  return Array.isArray(value) ? value : [value];
}, z.array(candidateStatusSchema).optional());

export const candidateBasicInfoSchema = z.object({
  name: nullableTextSchema,
  phone: nullableTextSchema,
  email: nullableEmailSchema,
  city: nullableTextSchema,
});

export const candidateEducationSchema = z.object({
  school: nullableTextSchema,
  major: nullableTextSchema,
  degree: nullableTextSchema,
  graduationTime: nullableTextSchema,
});

export const candidateWorkExperienceSchema = z.object({
  companyName: nullableTextSchema,
  position: nullableTextSchema,
  timeRange: nullableTextSchema,
  summary: nullableTextSchema,
});

export const candidateProjectExperienceSchema = z.object({
  projectName: nullableTextSchema,
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
  sourceText: z.string().default(""),
  cleanedText: z.string().default(""),
  extractionNotes: z.string().default(""),
  extractedAt: isoDateTimeSchema.optional(),
});

export const candidateProfileUpdateSchema = z.object({
  basicInfo: candidateBasicInfoSchema.partial().optional(),
  educationHistory: z.array(candidateEducationSchema).optional(),
  workExperiences: z.array(candidateWorkExperienceSchema).optional(),
  skillTags: z.array(z.string().min(1)).optional(),
  projectExperiences: z.array(candidateProjectExperienceSchema).optional(),
  sourceText: z.string().optional(),
  cleanedText: z.string().optional(),
  extractionNotes: z.string().optional(),
});

export const candidateScoreDetailsSchema = z.object({
  skillNotes: z.string(),
  experienceNotes: z.string(),
  educationNotes: z.string(),
  matchedSkills: z.array(z.string().min(1)),
  missingSkills: z.array(z.string().min(1)),
});

export const candidateScoreSchema = z.object({
  id: uuidSchema,
  candidateId: uuidSchema,
  jdId: uuidSchema,
  jdTitle: z.string().min(1).optional(),
  totalScore: z.number().int().min(0).max(100),
  skillMatchScore: z.number().int().min(0).max(100),
  experienceRelevanceScore: z.number().int().min(0).max(100),
  educationFitScore: z.number().int().min(0).max(100),
  aiCommentary: z.string().min(1),
  scoreDetails: candidateScoreDetailsSchema,
  isStale: z.boolean(),
  scoredAt: isoDateTimeSchema,
});

export const candidateScorePreviewSchema = candidateScoreSchema.pick({
  jdId: true,
  jdTitle: true,
  totalScore: true,
  skillMatchScore: true,
  experienceRelevanceScore: true,
  educationFitScore: true,
  isStale: true,
  scoredAt: true,
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
  processingErrorCode: z.string().optional().nullable(),
  processingErrorMessage: z.string().optional().nullable(),
  uploadedAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
  currentScore: candidateScorePreviewSchema.optional().nullable(),
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

export const candidateUploadFieldSchema = z.object({});

export const candidateUploadItemSchema = z.object({
  candidateId: uuidSchema,
  displayName: z.string().min(1),
  originalFileName: z.string().min(1),
  originalFilePath: z.string().min(1),
  mimeType: z.literal("application/pdf"),
  fileSize: z.number().int().nonnegative(),
  pageCount: z.number().int().nonnegative(),
  status: candidateStatusSchema,
  processingStatus: candidateProcessingStatusSchema,
  uploadedAt: isoDateTimeSchema,
});

export const candidateUploadResponseSchema = z.object({
  totalFiles: z.number().int().nonnegative(),
  items: z.array(candidateUploadItemSchema),
});

export const candidateStatusUpdateSchema = z.object({
  status: candidateStatusSchema,
  reason: z.string().min(1).max(500).optional(),
});

export const candidateProfileUpdateResponseSchema = z.object({
  candidateId: uuidSchema,
  profile: candidateProfileSchema,
});

export const candidateStatusUpdateResponseSchema = z.object({
  candidateId: uuidSchema,
  status: candidateStatusSchema,
  updatedAt: isoDateTimeSchema,
});

export const candidateDeleteResponseSchema = z.object({
  candidateId: uuidSchema,
  deletedAt: isoDateTimeSchema,
});

export const candidateListResponseSchema = z.object({
  items: z.array(candidateSummarySchema),
  page: z.number().int().min(1),
  pageSize: z.number().int().min(1),
  total: z.number().int().nonnegative(),
});

export const candidateDetailResponseSchema = candidateDetailSchema;

export const candidateScoreListQuerySchema = z.object({
  jdId: uuidSchema.optional(),
});

export const candidateScoreListResponseSchema = z.object({
  items: z.array(candidateScoreSchema),
});

export const candidateNotImplementedResponseSchema = apiErrorSchema;
