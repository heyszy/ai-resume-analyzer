import { and, asc, desc, eq, ilike, inArray, or, type SQL, sql } from "drizzle-orm";

import { candidateProfiles, candidateScores, candidates } from "../../db";
import { getDatabase } from "../../lib/db";
import type {
  CandidateInsertInput,
  CandidateProfileRow,
  CandidateRow,
  CandidateScoreRow,
} from "./types";

type CandidateFilters = {
  candidateIds?: string[];
  keyword?: string;
  status?: CandidateRow["status"][];
  skillTags?: string[];
};

type CandidateListPageQuery = CandidateFilters & {
  page: number;
  pageSize: number;
  sortBy: "score" | "uploadedAt" | "updatedAt" | "name";
  sortOrder: "asc" | "desc";
  jdId?: string;
};

function buildCandidateWhere(filters: CandidateFilters) {
  const whereConditions: SQL[] = [];

  if (filters.candidateIds && filters.candidateIds.length > 0) {
    whereConditions.push(inArray(candidates.id, filters.candidateIds));
  }

  if (filters.status && filters.status.length > 0) {
    whereConditions.push(inArray(candidates.status, filters.status));
  }

  if (filters.keyword && filters.keyword.trim().length > 0) {
    const keyword = `%${filters.keyword.trim()}%`;
    const keywordCondition = or(
      ilike(candidates.displayName, keyword),
      ilike(candidates.email, keyword),
      ilike(candidates.phone, keyword),
      ilike(candidates.city, keyword),
      ilike(candidates.originalFileName, keyword),
    );

    if (keywordCondition) {
      whereConditions.push(keywordCondition);
    }
  }

  const skillTags = filters.skillTags?.map((tag) => tag.trim()).filter(Boolean) ?? [];
  if (skillTags.length > 0) {
    whereConditions.push(sql<boolean>`
      exists (
        select 1
        from ${candidateProfiles}
        where ${candidateProfiles.candidateId} = ${candidates.id}
          and ${candidateProfiles.skillTags} @> ${skillTags}
      )
    `);
  }

  return whereConditions.length > 0 ? and(...whereConditions) : undefined;
}

export async function insertCandidateRecord(input: CandidateInsertInput) {
  const db = getDatabase();
  const [record] = await db
    .insert(candidates)
    .values({
      id: input.id,
      displayName: input.displayName,
      originalFileName: input.originalFileName,
      originalFilePath: input.originalFilePath,
      mimeType: input.mimeType,
      fileSize: input.fileSize,
      pageCount: input.pageCount,
      status: input.status,
      processingStatus: input.processingStatus,
      processingErrorCode: input.processingErrorCode,
      processingErrorMessage: input.processingErrorMessage,
      uploadedAt: input.uploadedAt,
    })
    .returning();

  return record;
}

export async function deleteCandidateRecords(candidateIds: string[]) {
  if (candidateIds.length === 0) {
    return;
  }

  const db = getDatabase();
  await db.delete(candidates).where(inArray(candidates.id, candidateIds));
}

export async function getCandidateRecord(candidateId: string) {
  const db = getDatabase();
  const [record] = await db
    .select()
    .from(candidates)
    .where(eq(candidates.id, candidateId))
    .limit(1);
  return record ?? null;
}

export async function listCandidateRecords(filters: CandidateFilters = {}) {
  const db = getDatabase();
  const where = buildCandidateWhere(filters);
  const rows = await db.select().from(candidates).where(where);

  return rows as CandidateRow[];
}

export async function listCandidateRecordPage(query: CandidateListPageQuery) {
  const db = getDatabase();
  const where = buildCandidateWhere(query);
  const offset = (query.page - 1) * query.pageSize;
  const orderDirection = query.sortOrder === "asc" ? asc : desc;

  if (query.sortBy === "score" && query.jdId) {
    const jdId = query.jdId;

    const [totalRows, rows] = await Promise.all([
      db
        .select({
          count: sql<number>`count(*)`,
        })
        .from(candidates)
        .where(where),
      db
        .select({
          candidate: candidates,
        })
        .from(candidates)
        .leftJoin(
          candidateScores,
          and(eq(candidateScores.candidateId, candidates.id), eq(candidateScores.jdId, jdId)),
        )
        .where(where)
        .orderBy(
          sql`case when ${candidateScores.totalScore} is null then 1 else 0 end`,
          orderDirection(candidateScores.totalScore),
          desc(candidates.uploadedAt),
        )
        .limit(query.pageSize)
        .offset(offset),
    ]);

    return {
      items: rows.map((row) => row.candidate) as CandidateRow[],
      total: Number(totalRows[0]?.count ?? 0),
    };
  }

  const orderBy =
    query.sortBy === "name"
      ? [orderDirection(candidates.displayName), desc(candidates.uploadedAt)]
      : query.sortBy === "updatedAt"
        ? [orderDirection(candidates.updatedAt), desc(candidates.uploadedAt)]
        : [orderDirection(candidates.uploadedAt), desc(candidates.updatedAt)];

  const [totalRows, rows] = await Promise.all([
    db
      .select({
        count: sql<number>`count(*)`,
      })
      .from(candidates)
      .where(where),
    db
      .select()
      .from(candidates)
      .where(where)
      .orderBy(...orderBy)
      .limit(query.pageSize)
      .offset(offset),
  ]);

  return {
    items: rows as CandidateRow[],
    total: Number(totalRows[0]?.count ?? 0),
  };
}

export async function listCandidateProfiles(candidateIds: string[]) {
  if (candidateIds.length === 0) {
    return [];
  }

  const db = getDatabase();
  const rows = await db
    .select()
    .from(candidateProfiles)
    .where(inArray(candidateProfiles.candidateId, candidateIds));

  return rows as CandidateProfileRow[];
}

export async function listCandidateScores(candidateIds: string[]) {
  if (candidateIds.length === 0) {
    return [];
  }

  const db = getDatabase();
  const rows = await db
    .select()
    .from(candidateScores)
    .where(inArray(candidateScores.candidateId, candidateIds))
    .orderBy(desc(candidateScores.scoredAt), desc(candidateScores.updatedAt));

  return rows as CandidateScoreRow[];
}

export async function listCandidateScoresByCandidate(candidateId: string, jdId?: string) {
  const db = getDatabase();
  const where = jdId
    ? and(eq(candidateScores.candidateId, candidateId), eq(candidateScores.jdId, jdId))
    : eq(candidateScores.candidateId, candidateId);
  const rows = await db
    .select()
    .from(candidateScores)
    .where(where)
    .orderBy(desc(candidateScores.scoredAt), desc(candidateScores.updatedAt));

  return rows as CandidateScoreRow[];
}

export async function getCandidateScoreRecord(candidateId: string, jdId: string) {
  const db = getDatabase();
  const [record] = await db
    .select()
    .from(candidateScores)
    .where(and(eq(candidateScores.candidateId, candidateId), eq(candidateScores.jdId, jdId)))
    .limit(1);

  return (record as CandidateScoreRow | undefined) ?? null;
}

export async function upsertCandidateScore(
  candidateId: string,
  score: {
    jdId: string;
    totalScore: number;
    skillMatchScore: number;
    experienceRelevanceScore: number;
    educationFitScore: number;
    aiCommentary: string;
    scoreDetails: CandidateScoreRow["scoreDetails"];
    isStale?: boolean;
    scoredAt: Date;
  },
) {
  const db = getDatabase();
  const [record] = await db
    .insert(candidateScores)
    .values({
      candidateId,
      jdId: score.jdId,
      totalScore: score.totalScore,
      skillMatchScore: score.skillMatchScore,
      experienceRelevanceScore: score.experienceRelevanceScore,
      educationFitScore: score.educationFitScore,
      aiCommentary: score.aiCommentary,
      scoreDetails: score.scoreDetails,
      isStale: score.isStale ?? false,
      scoredAt: score.scoredAt,
    })
    .onConflictDoUpdate({
      target: [candidateScores.candidateId, candidateScores.jdId],
      set: {
        totalScore: score.totalScore,
        skillMatchScore: score.skillMatchScore,
        experienceRelevanceScore: score.experienceRelevanceScore,
        educationFitScore: score.educationFitScore,
        aiCommentary: score.aiCommentary,
        scoreDetails: score.scoreDetails,
        isStale: score.isStale ?? false,
        scoredAt: score.scoredAt,
        updatedAt: new Date(),
      },
    })
    .returning();

  return (record as CandidateScoreRow | undefined) ?? null;
}

export async function updateCandidateRecord(
  candidateId: string,
  patch: Partial<
    Pick<
      CandidateRow,
      | "displayName"
      | "email"
      | "phone"
      | "city"
      | "pageCount"
      | "status"
      | "processingStatus"
      | "processingErrorCode"
      | "processingErrorMessage"
      | "processedAt"
    >
  >,
) {
  const db = getDatabase();
  const [record] = await db
    .update(candidates)
    .set({
      ...patch,
      updatedAt: new Date(),
    })
    .where(eq(candidates.id, candidateId))
    .returning();

  return record ?? null;
}

export async function upsertCandidateProfile(
  candidateId: string,
  profile: {
    basicInfo: CandidateProfileRow["basicInfo"];
    educationHistory: CandidateProfileRow["educationHistory"];
    workExperiences: CandidateProfileRow["workExperiences"];
    skillTags: CandidateProfileRow["skillTags"];
    projectExperiences: CandidateProfileRow["projectExperiences"];
    sourceText: string;
    cleanedText: string;
    extractionNotes: string;
    extractedAt: Date | null;
  },
) {
  const db = getDatabase();
  const [record] = await db
    .insert(candidateProfiles)
    .values({
      candidateId,
      basicInfo: profile.basicInfo,
      educationHistory: profile.educationHistory,
      workExperiences: profile.workExperiences,
      skillTags: profile.skillTags,
      projectExperiences: profile.projectExperiences,
      sourceText: profile.sourceText,
      cleanedText: profile.cleanedText,
      extractionNotes: profile.extractionNotes,
      extractedAt: profile.extractedAt,
    })
    .onConflictDoUpdate({
      target: candidateProfiles.candidateId,
      set: {
        basicInfo: profile.basicInfo,
        educationHistory: profile.educationHistory,
        workExperiences: profile.workExperiences,
        skillTags: profile.skillTags,
        projectExperiences: profile.projectExperiences,
        sourceText: profile.sourceText,
        cleanedText: profile.cleanedText,
        extractionNotes: profile.extractionNotes,
        extractedAt: profile.extractedAt,
        updatedAt: new Date(),
      },
    })
    .returning();

  return record ?? null;
}

export async function deleteCandidateProfile(candidateId: string) {
  const db = getDatabase();
  await db.delete(candidateProfiles).where(eq(candidateProfiles.candidateId, candidateId));
}
