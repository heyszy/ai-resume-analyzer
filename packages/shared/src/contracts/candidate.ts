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

export const candidateBasicInfoSchema = z.object({
  name: z.string().min(1),
  phone: z.string().min(1),
  email: z.string().email(),
  city: z.string().min(1),
});

export const candidateEducationSchema = z.object({
  school: z.string().min(1),
  major: z.string().min(1),
  degree: z.string().min(1),
  graduationTime: z.string().min(1),
});

export const candidateWorkExperienceSchema = z.object({
  companyName: z.string().min(1),
  position: z.string().min(1),
  timeRange: z.string().min(1),
  summary: z.string().min(1),
});

export const candidateProjectExperienceSchema = z.object({
  projectName: z.string().min(1),
  techStack: z.array(z.string().min(1)).default([]),
  responsibilities: z.array(z.string().min(1)).default([]),
  highlights: z.array(z.string().min(1)).default([]),
});

export const candidateProfileSchema = z.object({
  basicInfo: candidateBasicInfoSchema,
  educationHistory: z.array(candidateEducationSchema),
  workExperiences: z.array(candidateWorkExperienceSchema),
  skillTags: z.array(z.string().min(1)),
  projectExperiences: z.array(candidateProjectExperienceSchema),
  sourceText: z.string(),
  cleanedText: z.string(),
  extractionNotes: z.string(),
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
  status: z.array(candidateStatusSchema).optional(),
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
  skillTags: z.array(z.string().min(1)),
  status: candidateStatusSchema,
  processingStatus: candidateProcessingStatusSchema,
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

export const candidateUploadFieldSchema = z.object({
  candidateSource: z.string().trim().min(1).optional(),
});

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
  candidateSource: z.string().nullable(),
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

export const candidateListResponseSchema = z.object({
  items: z.array(candidateSummarySchema),
  page: z.number().int().min(1),
  pageSize: z.number().int().min(1),
  total: z.number().int().nonnegative(),
});

export const candidateDetailResponseSchema = candidateDetailSchema;

export const candidateNotImplementedResponseSchema = apiErrorSchema;
