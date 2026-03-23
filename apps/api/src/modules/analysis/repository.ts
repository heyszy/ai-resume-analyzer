import type { candidateProfileSchema } from "@ai-resume-analyzer/shared";
import { desc, eq, inArray } from "drizzle-orm";
import type { z } from "zod";
import { candidateProfiles, candidates } from "../../db";
import { getDatabase } from "../../lib/db";

import { AnalysisError } from "./errors";

type CandidateProfile = z.infer<typeof candidateProfileSchema>;
type CandidateProfileInsert = typeof candidateProfiles.$inferInsert;
type CandidateProfilePayload = Pick<
  CandidateProfileInsert,
  | "basicInfo"
  | "educationHistory"
  | "workExperiences"
  | "skillTags"
  | "projectExperiences"
  | "sourceText"
  | "cleanedText"
  | "extractionNotes"
  | "extractedAt"
>;
type CandidateProfileBasicInfoInput = {
  name?: string | null;
  phone?: string | null;
  email?: string | null;
  city?: string | null;
};
type CandidateProfileBasicInfo = {
  name: string | null;
  phone: string | null;
  email: string | null;
  city: string | null;
};
type CandidateProfileEducation = CandidateProfilePayload["educationHistory"][number];
type CandidateProfileWorkExperience = CandidateProfilePayload["workExperiences"][number];
type CandidateProfileProjectExperience = CandidateProfilePayload["projectExperiences"][number];

function stripNullChars(value: string) {
  return value.split("\0").join("");
}

function sanitizeBasicInfo(basicInfo: CandidateProfileBasicInfoInput): CandidateProfileBasicInfo {
  return {
    name: basicInfo.name ? stripNullChars(basicInfo.name) : null,
    phone: basicInfo.phone ? stripNullChars(basicInfo.phone) : null,
    email: basicInfo.email ? stripNullChars(basicInfo.email) : null,
    city: basicInfo.city ? stripNullChars(basicInfo.city) : null,
  };
}

function sanitizeProjectExperience(
  projectExperience: CandidateProfileProjectExperience,
): CandidateProfileProjectExperience {
  return {
    projectName: projectExperience.projectName
      ? stripNullChars(projectExperience.projectName)
      : projectExperience.projectName,
    techStack: projectExperience.techStack.map(stripNullChars),
    responsibilities: projectExperience.responsibilities.map(stripNullChars),
    highlights: projectExperience.highlights.map(stripNullChars),
  };
}

function sanitizeEducation(
  education: CandidateProfile["educationHistory"][number],
): CandidateProfileEducation {
  return {
    school: education.school ? stripNullChars(education.school) : education.school,
    major: education.major ? stripNullChars(education.major) : education.major,
    degree: education.degree ? stripNullChars(education.degree) : education.degree,
    graduationTime: education.graduationTime
      ? stripNullChars(education.graduationTime)
      : education.graduationTime,
  };
}

function sanitizeWorkExperience(
  workExperience: CandidateProfile["workExperiences"][number],
): CandidateProfileWorkExperience {
  return {
    companyName: workExperience.companyName
      ? stripNullChars(workExperience.companyName)
      : workExperience.companyName,
    position: workExperience.position
      ? stripNullChars(workExperience.position)
      : workExperience.position,
    timeRange: workExperience.timeRange
      ? stripNullChars(workExperience.timeRange)
      : workExperience.timeRange,
    summary: workExperience.summary ? stripNullChars(workExperience.summary) : workExperience.summary,
  };
}

function sanitizeCandidateProfile(profile: CandidateProfile): CandidateProfilePayload {
  return {
    basicInfo: sanitizeBasicInfo(profile.basicInfo),
    educationHistory: profile.educationHistory.map(sanitizeEducation),
    workExperiences: profile.workExperiences.map(sanitizeWorkExperience),
    skillTags: profile.skillTags.map(stripNullChars),
    projectExperiences: profile.projectExperiences.map(sanitizeProjectExperience),
    sourceText: stripNullChars(profile.sourceText),
    cleanedText: stripNullChars(profile.cleanedText),
    extractionNotes: stripNullChars(profile.extractionNotes),
    extractedAt: profile.extractedAt ? new Date(profile.extractedAt) : new Date(),
  };
}

type CandidateForAnalysis = {
  id: string;
  displayName: string;
  originalFilePath: string;
  originalFileName: string;
  pageCount: number;
  uploadedAt: Date;
};

export async function getCandidateById(candidateId: string): Promise<CandidateForAnalysis> {
  const db = getDatabase();
  const [candidate] = await db
    .select({
      id: candidates.id,
      displayName: candidates.displayName,
      originalFilePath: candidates.originalFilePath,
      originalFileName: candidates.originalFileName,
      pageCount: candidates.pageCount,
      uploadedAt: candidates.uploadedAt,
    })
    .from(candidates)
    .where(eq(candidates.id, candidateId))
    .limit(1);

  if (!candidate) {
    throw new AnalysisError("CANDIDATE_NOT_FOUND", "未找到要解析的候选人。", {
      candidateId,
    });
  }

  return candidate;
}

export async function listCandidatesByIds(candidateIds: string[]) {
  if (candidateIds.length === 0) {
    return [];
  }

  const db = getDatabase();
  return db
    .select({
      id: candidates.id,
      uploadedAt: candidates.uploadedAt,
    })
    .from(candidates)
    .where(inArray(candidates.id, candidateIds))
    .orderBy(desc(candidates.uploadedAt));
}

export async function markCandidateAsParsing(candidateId: string) {
  const db = getDatabase();
  await db
    .update(candidates)
    .set({
      processingStatus: "parsing",
      processingErrorCode: null,
      processingErrorMessage: null,
      updatedAt: new Date(),
    })
    .where(eq(candidates.id, candidateId));
}

export async function markCandidateAsExtracting(candidateId: string, pageCount: number) {
  const db = getDatabase();
  await db
    .update(candidates)
    .set({
      pageCount,
      processingStatus: "extracting",
      processingErrorCode: null,
      processingErrorMessage: null,
      updatedAt: new Date(),
    })
    .where(eq(candidates.id, candidateId));
}

export async function markCandidateAsScoring(candidateId: string) {
  const db = getDatabase();
  await db
    .update(candidates)
    .set({
      processingStatus: "scoring",
      processingErrorCode: null,
      processingErrorMessage: null,
      updatedAt: new Date(),
    })
    .where(eq(candidates.id, candidateId));
}

export async function getCandidateProfileById(candidateId: string) {
  const db = getDatabase();
  const [profile] = await db
    .select()
    .from(candidateProfiles)
    .where(eq(candidateProfiles.candidateId, candidateId))
    .limit(1);

  return profile ?? null;
}

export async function completeCandidateAnalysis(args: {
  candidateId: string;
  pageCount: number;
  profile: CandidateProfile;
}) {
  const { candidateId, pageCount } = args;
  const profile = sanitizeCandidateProfile(args.profile);
  const db = getDatabase();
  const profileValues: CandidateProfileInsert = {
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
    updatedAt: new Date(),
  };

  await db
    .insert(candidateProfiles)
    .values(profileValues)
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
    });

  await db
    .update(candidates)
    .set({
      displayName: profile.basicInfo.name ?? "未命名候选人",
      email: profile.basicInfo.email,
      phone: profile.basicInfo.phone,
      city: profile.basicInfo.city,
      pageCount,
      processingStatus: "ready",
      processedAt: new Date(),
      processingErrorCode: null,
      processingErrorMessage: null,
      updatedAt: new Date(),
    })
    .where(eq(candidates.id, candidateId));
}

export async function completeCandidateScoring(candidateId: string) {
  const db = getDatabase();
  await db
    .update(candidates)
    .set({
      processingStatus: "ready",
      processedAt: new Date(),
      processingErrorCode: null,
      processingErrorMessage: null,
      updatedAt: new Date(),
    })
    .where(eq(candidates.id, candidateId));
}

export async function failCandidateAnalysis(args: {
  candidateId: string;
  code: string;
  message: string;
  pageCount?: number;
}) {
  const db = getDatabase();
  await db
    .update(candidates)
    .set({
      processingStatus: "failed",
      pageCount: args.pageCount ?? 0,
      processingErrorCode: args.code,
      processingErrorMessage: args.message,
      updatedAt: new Date(),
    })
    .where(eq(candidates.id, args.candidateId));
}
