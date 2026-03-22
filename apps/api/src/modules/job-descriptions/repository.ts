import { and, eq, ilike, or, type SQL, sql } from "drizzle-orm";

import { jobDescriptions } from "../../db";
import { getDatabase } from "../../lib/db";
import type {
  JobDescriptionInsertInput,
  JobDescriptionRow,
  JobDescriptionStatus,
  JobDescriptionUpdateInput,
} from "./types";

type JobDescriptionFilters = {
  keyword?: string;
  status?: JobDescriptionStatus[];
};

export async function listJobDescriptionRecords(filters: JobDescriptionFilters = {}) {
  const db = getDatabase();
  const whereConditions: SQL[] = [];

  if (filters.status && filters.status.length > 0) {
    const uniqueStatuses = [...new Set(filters.status)];
    if (uniqueStatuses.length === 1) {
      whereConditions.push(eq(jobDescriptions.isActive, uniqueStatuses[0] === "active"));
    }
  }

  if (filters.keyword && filters.keyword.trim().length > 0) {
    const keyword = `%${filters.keyword.trim()}%`;
    const keywordCondition = or(
      ilike(jobDescriptions.title, keyword),
      ilike(jobDescriptions.description, keyword),
      sql<boolean>`array_to_string(${jobDescriptions.requiredSkills}, ' ') ILIKE ${keyword}`,
      sql<boolean>`array_to_string(${jobDescriptions.bonusSkills}, ' ') ILIKE ${keyword}`,
    );

    if (keywordCondition) {
      whereConditions.push(keywordCondition);
    }
  }

  const rows = await db
    .select()
    .from(jobDescriptions)
    .where(whereConditions.length > 0 ? and(...whereConditions) : undefined);

  return rows as JobDescriptionRow[];
}

export async function getJobDescriptionRecord(jdId: string) {
  const db = getDatabase();
  const [record] = await db
    .select()
    .from(jobDescriptions)
    .where(eq(jobDescriptions.id, jdId))
    .limit(1);

  return record ?? null;
}

export async function insertJobDescriptionRecord(input: JobDescriptionInsertInput) {
  const db = getDatabase();
  const [record] = await db
    .insert(jobDescriptions)
    .values({
      title: input.title,
      description: input.description,
      requiredSkills: input.requiredSkills,
      bonusSkills: input.bonusSkills,
      isActive: input.isActive,
    })
    .returning();

  return record ?? null;
}

export async function updateJobDescriptionRecord(jdId: string, patch: JobDescriptionUpdateInput) {
  const db = getDatabase();
  const [record] = await db
    .update(jobDescriptions)
    .set({
      ...patch,
      updatedAt: new Date(),
    })
    .where(eq(jobDescriptions.id, jdId))
    .returning();

  return record ?? null;
}

export async function deleteJobDescriptionRecord(jdId: string) {
  const db = getDatabase();
  const [record] = await db.delete(jobDescriptions).where(eq(jobDescriptions.id, jdId)).returning();

  return record ?? null;
}
