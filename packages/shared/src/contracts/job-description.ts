import { z } from "zod";

import {
  apiErrorSchema,
  isoDateTimeSchema,
  jobDescriptionStatusSchema,
  paginationQuerySchema,
  sortOrderSchema,
  uuidSchema,
} from "./common";

const jobDescriptionTextSchema = z.string().trim().min(1);
const jobDescriptionSkillSchema = z.string().trim().min(1);
const jobDescriptionSkillListSchema = z.array(jobDescriptionSkillSchema);

export const jobDescriptionInputSchema = z.object({
  title: jobDescriptionTextSchema,
  description: jobDescriptionTextSchema,
  requiredSkills: jobDescriptionSkillListSchema.default([]),
  bonusSkills: jobDescriptionSkillListSchema.default([]),
  isActive: z.boolean().default(false),
});

export const jobDescriptionUpdateBodySchema = z
  .object({
    title: jobDescriptionTextSchema.optional(),
    description: jobDescriptionTextSchema.optional(),
    requiredSkills: jobDescriptionSkillListSchema.optional(),
    bonusSkills: jobDescriptionSkillListSchema.optional(),
    isActive: z.boolean().optional(),
  })
  .refine((value) => Object.values(value).some((field) => typeof field !== "undefined"), {
    message: "至少需要提供一个更新字段。",
  });

export const jobDescriptionSchema = z.object({
  id: uuidSchema,
  title: jobDescriptionTextSchema,
  description: jobDescriptionTextSchema,
  requiredSkills: jobDescriptionSkillListSchema,
  bonusSkills: jobDescriptionSkillListSchema,
  isActive: z.boolean(),
  status: jobDescriptionStatusSchema,
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
});

export const jobDescriptionListQuerySchema = paginationQuerySchema.extend({
  keyword: z.string().trim().optional(),
  status: z.array(jobDescriptionStatusSchema).optional(),
  sortBy: z.enum(["createdAt", "updatedAt", "title"]).default("createdAt"),
  sortOrder: sortOrderSchema.default("desc"),
});

export const jobDescriptionListResponseSchema = z.object({
  items: z.array(jobDescriptionSchema),
  page: z.number().int().min(1),
  pageSize: z.number().int().min(1),
  total: z.number().int().nonnegative(),
});

export const jobDescriptionDetailResponseSchema = jobDescriptionSchema;

export const jobDescriptionCreateResponseSchema = jobDescriptionSchema;

export const jobDescriptionUpdateResponseSchema = jobDescriptionSchema;

export const jobDescriptionDeleteResponseSchema = jobDescriptionSchema;

export const jobDescriptionNotImplementedResponseSchema = apiErrorSchema;
