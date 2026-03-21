import { z } from "zod";

import {
  apiErrorSchema,
  isoDateTimeSchema,
  jobDescriptionStatusSchema,
  paginationQuerySchema,
  sortOrderSchema,
  uuidSchema,
} from "./common";

export const jobDescriptionInputSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  requiredSkills: z.array(z.string().min(1)).default([]),
  bonusSkills: z.array(z.string().min(1)).default([]),
  isActive: z.boolean().default(false),
});

export const jobDescriptionSchema = jobDescriptionInputSchema.extend({
  id: uuidSchema,
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

export const jobDescriptionCreateResponseSchema = jobDescriptionSchema;

export const jobDescriptionUpdateResponseSchema = jobDescriptionSchema;

export const jobDescriptionNotImplementedResponseSchema = apiErrorSchema;
