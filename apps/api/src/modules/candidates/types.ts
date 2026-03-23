import type { z } from "zod";
import type { candidateProfiles, candidateScores, candidates } from "../../db";
import type {
  candidateBasicInfoSchema,
  candidateDetailSchema,
  candidateEducationSchema,
  candidateListQuerySchema,
  candidateProfileSchema,
  candidateProjectExperienceSchema,
  candidateSummarySchema,
  candidateWorkExperienceSchema,
} from "./schemas";

export type CandidateListQuery = z.infer<typeof candidateListQuerySchema>;
export type CandidateSummary = z.infer<typeof candidateSummarySchema>;
export type CandidateDetail = z.infer<typeof candidateDetailSchema>;
export type CandidateProfile = z.infer<typeof candidateProfileSchema>;
export type CandidateBasicInfo = z.infer<typeof candidateBasicInfoSchema>;
export type CandidateEducation = z.infer<typeof candidateEducationSchema>;
export type CandidateWorkExperience = z.infer<typeof candidateWorkExperienceSchema>;
export type CandidateProjectExperience = z.infer<typeof candidateProjectExperienceSchema>;

export type CandidateRow = typeof candidates.$inferSelect;
export type CandidateProfileRow = typeof candidateProfiles.$inferSelect;
export type CandidateScoreRow = typeof candidateScores.$inferSelect;

export type CandidateInsertInput = {
  id: string;
  displayName: string;
  originalFileName: string;
  originalFilePath: string;
  mimeType: "application/pdf";
  fileSize: number;
  pageCount: number;
  status: CandidateRow["status"];
  processingStatus: CandidateRow["processingStatus"];
  processingErrorCode: string | null;
  processingErrorMessage: string | null;
  uploadedAt: Date;
};
