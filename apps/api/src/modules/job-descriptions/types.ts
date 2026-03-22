import type {
  jobDescriptionInputSchema,
  jobDescriptionListQuerySchema,
  jobDescriptionSchema,
  jobDescriptionUpdateBodySchema,
} from "@ai-resume-analyzer/shared";
import type { z } from "zod";

import type { jobDescriptions } from "../../db";

export type JobDescriptionListQuery = z.infer<typeof jobDescriptionListQuerySchema>;
export type JobDescription = z.infer<typeof jobDescriptionSchema>;
export type JobDescriptionStatus = JobDescription["status"];
export type JobDescriptionCreateInput = z.infer<typeof jobDescriptionInputSchema>;
export type JobDescriptionUpdateBody = z.infer<typeof jobDescriptionUpdateBodySchema>;

export type JobDescriptionRow = typeof jobDescriptions.$inferSelect;

export type JobDescriptionInsertInput = {
  title: string;
  description: string;
  requiredSkills: string[];
  bonusSkills: string[];
  isActive: boolean;
};

export type JobDescriptionUpdateInput = Partial<JobDescriptionInsertInput>;
