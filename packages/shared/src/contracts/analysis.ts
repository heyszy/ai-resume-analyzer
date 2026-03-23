import { z } from "zod";
import {
  candidateProfileSchema,
  candidateProfileUpdateSchema,
  candidateScoreSchema,
} from "./candidate";
import {
  apiErrorSchema,
  candidateProcessingStatusSchema,
  isoDateTimeSchema,
  uuidSchema,
} from "./common";

export const analysisStreamQuerySchema = z.object({
  candidateIds: z.string().trim().min(1),
  jdId: uuidSchema.optional(),
  regenerateScore: z
    .preprocess((value) => {
      if (typeof value === "undefined") {
        return undefined;
      }

      if (typeof value === "boolean") {
        return value;
      }

      if (typeof value === "string") {
        if (value === "true") {
          return true;
        }

        if (value === "false") {
          return false;
        }
      }

      return value;
    }, z.boolean())
    .optional()
    .default(false),
});

export const analysisStartResponseSchema = z.object({
  candidateIds: z.array(uuidSchema).min(1),
  acceptedAt: isoDateTimeSchema,
});

export const analysisProgressEventSchema = z.object({
  type: z.literal("progress"),
  candidateId: uuidSchema,
  processingStatus: candidateProcessingStatusSchema,
  stage: z.string().min(1),
  message: z.string().min(1),
  progress: z.number().int().min(0).max(100),
});

export const analysisResumePartialEventSchema = z.object({
  type: z.literal("resume.partial"),
  candidateId: uuidSchema,
  profile: candidateProfileUpdateSchema,
});

export const analysisResumeFinalEventSchema = z.object({
  type: z.literal("resume.final"),
  candidateId: uuidSchema,
  profile: candidateProfileSchema,
});

export const analysisScorePartialEventSchema = z.object({
  type: z.literal("score.partial"),
  candidateId: uuidSchema,
  jdId: uuidSchema,
  stage: z.string().min(1),
  message: z.string().min(1),
  commentary: z.string().optional(),
});

export const analysisScoreFinalEventSchema = z.object({
  type: z.literal("score.final"),
  candidateId: uuidSchema,
  jdId: uuidSchema,
  score: candidateScoreSchema,
});

export const analysisErrorEventSchema = z.object({
  type: z.literal("error"),
  candidateId: uuidSchema,
  code: z.string().min(1),
  message: z.string().min(1),
  details: z.unknown().optional(),
});

export const analysisDoneEventSchema = z.object({
  type: z.literal("done"),
  candidateId: uuidSchema,
});

export const analysisStreamEventSchema = z.discriminatedUnion("type", [
  analysisProgressEventSchema,
  analysisResumePartialEventSchema,
  analysisResumeFinalEventSchema,
  analysisScorePartialEventSchema,
  analysisScoreFinalEventSchema,
  analysisErrorEventSchema,
  analysisDoneEventSchema,
]);

export const analysisStreamResponseSchema = apiErrorSchema;
