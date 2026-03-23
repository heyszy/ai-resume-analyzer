import { del as deleteBlob, type GetBlobResult, get as getBlob } from "@vercel/blob";
import {
  deleteCandidateProfile,
  deleteCandidateRecords,
  getCandidateRecord,
  getCandidateScoreRecord,
  insertCandidateRecord,
  listCandidateProfiles,
  listCandidateRecordPage,
  listCandidateScores,
  listCandidateScoresByCandidate,
} from "./repository";
import type {
  CandidateDetail,
  CandidateListQuery,
  CandidateProfileRow,
  CandidateRow,
  CandidateScoreRow,
  CandidateSummary,
} from "./types";

type CandidateFileBlob = Extract<GetBlobResult, { statusCode: 200 }>;

function normalizeScoreDetails(score: CandidateScoreRow["scoreDetails"]) {
  return {
    skillNotes: score?.skillNotes ?? "",
    experienceNotes: score?.experienceNotes ?? "",
    educationNotes: score?.educationNotes ?? "",
    matchedSkills: score?.matchedSkills ?? [],
    missingSkills: score?.missingSkills ?? [],
  };
}

function buildProfile(profile: CandidateProfileRow | null) {
  if (!profile) {
    return null;
  }

  return {
    basicInfo: {
      name: profile.basicInfo.name ?? null,
      phone: profile.basicInfo.phone ?? null,
      email: profile.basicInfo.email ?? null,
      city: profile.basicInfo.city ?? null,
    },
    educationHistory: profile.educationHistory.map((item) => ({
      school: item.school ?? null,
      major: item.major ?? null,
      degree: item.degree ?? null,
      graduationTime: item.graduationTime ?? null,
    })),
    workExperiences: profile.workExperiences.map((item) => ({
      companyName: item.companyName ?? null,
      position: item.position ?? null,
      timeRange: item.timeRange ?? null,
      summary: item.summary ?? null,
    })),
    skillTags: profile.skillTags ?? [],
    projectExperiences: profile.projectExperiences.map((item) => ({
      projectName: item.projectName ?? null,
      techStack: item.techStack ?? [],
      responsibilities: item.responsibilities ?? [],
      highlights: item.highlights ?? [],
    })),
    sourceText: profile.sourceText,
    cleanedText: profile.cleanedText,
    extractionNotes: profile.extractionNotes,
    extractedAt: profile.extractedAt?.toISOString() ?? null,
  };
}

function buildScorePreview(score: CandidateScoreRow | null) {
  if (!score) {
    return null;
  }

  return {
    jdId: score.jdId,
    totalScore: score.totalScore,
    skillMatchScore: score.skillMatchScore,
    experienceRelevanceScore: score.experienceRelevanceScore,
    educationFitScore: score.educationFitScore,
    isStale: score.isStale,
    scoredAt: score.scoredAt.toISOString(),
  };
}

function buildScore(score: CandidateScoreRow) {
  return {
    id: score.id,
    candidateId: score.candidateId,
    jdId: score.jdId,
    totalScore: score.totalScore,
    skillMatchScore: score.skillMatchScore,
    experienceRelevanceScore: score.experienceRelevanceScore,
    educationFitScore: score.educationFitScore,
    aiCommentary: score.aiCommentary,
    scoreDetails: normalizeScoreDetails(score.scoreDetails),
    isStale: score.isStale,
    scoredAt: score.scoredAt.toISOString(),
  };
}

function pickCurrentScore(scores: CandidateScoreRow[], jdId?: string) {
  if (!jdId) {
    return null;
  }

  const orderedScores = [...scores].sort(
    (left, right) => right.scoredAt.getTime() - left.scoredAt.getTime(),
  );

  const scoreForJd = orderedScores.find((score) => score.jdId === jdId && !score.isStale);
  if (scoreForJd) {
    return scoreForJd;
  }

  return orderedScores.find((score) => score.jdId === jdId) ?? null;
}

function buildSummary(
  candidate: CandidateRow,
  profile: CandidateProfileRow | null,
  scores: CandidateScoreRow[],
  jdId?: string,
): CandidateSummary {
  const currentScore = pickCurrentScore(scores, jdId);
  const school =
    profile?.educationHistory.find((item) => Boolean(item.school?.trim()))?.school?.trim() ?? null;

  return {
    id: candidate.id,
    displayName: candidate.displayName,
    email: candidate.email ?? null,
    phone: candidate.phone ?? null,
    city: candidate.city ?? null,
    school,
    skillTags: profile?.skillTags ?? [],
    status: candidate.status,
    processingStatus: candidate.processingStatus,
    processingErrorCode: candidate.processingErrorCode ?? null,
    processingErrorMessage: candidate.processingErrorMessage ?? null,
    uploadedAt: candidate.uploadedAt.toISOString(),
    updatedAt: candidate.updatedAt.toISOString(),
    currentScore: buildScorePreview(currentScore),
  };
}

function buildDetail(
  candidate: CandidateRow,
  profile: CandidateProfileRow | null,
  scores: CandidateScoreRow[],
  jdId?: string,
): CandidateDetail {
  const summary = buildSummary(candidate, profile, scores, jdId);

  return {
    ...summary,
    originalFileName: candidate.originalFileName,
    originalFilePath: candidate.originalFilePath,
    mimeType: candidate.mimeType,
    fileSize: candidate.fileSize,
    pageCount: candidate.pageCount,
    profile: buildProfile(profile),
    rawText: profile?.sourceText ?? null,
    cleanedText: profile?.cleanedText ?? null,
    scores: scores.map(buildScore),
  };
}

export async function createUploadedCandidate(input: {
  id: string;
  displayName: string;
  originalFileName: string;
  originalFilePath: string;
  mimeType: "application/pdf";
  fileSize: number;
  pageCount: number;
  uploadedAt: Date;
}) {
  const record = await insertCandidateRecord({
    ...input,
    status: "pending_review",
    processingStatus: "uploaded",
    processingErrorCode: null,
    processingErrorMessage: null,
  });

  if (!record) {
    throw new Error("CREATE_CANDIDATE_FAILED");
  }

  return record;
}

export async function removeUploadedCandidate(candidateId: string) {
  await deleteCandidateProfile(candidateId);
  await deleteCandidateRecords([candidateId]);
}

export async function deleteCandidate(candidateId: string) {
  const candidate = await getCandidateRecord(candidateId);
  if (!candidate) {
    return null;
  }

  const blobToken = process.env.BLOB_READ_WRITE_TOKEN?.trim();
  if (!blobToken) {
    throw new Error("BLOB_READ_WRITE_TOKEN_MISSING");
  }

  try {
    await deleteBlob(candidate.originalFilePath, {
      token: blobToken,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!message.toLowerCase().includes("not found")) {
      throw error;
    }
  }

  await deleteCandidateRecords([candidateId]);

  return candidate;
}

export async function getCandidateList(query: CandidateListQuery) {
  const page = query.page ?? 1;
  const pageSize = query.pageSize ?? 20;
  const { items: candidateRows, total } = await listCandidateRecordPage({
    keyword: query.keyword,
    status: query.status,
    skillTags: query.skillTags,
    page,
    pageSize,
    sortBy: query.sortBy,
    sortOrder: query.sortOrder,
    jdId: query.jdId,
  });
  const candidateIds = candidateRows.map((candidate) => candidate.id);
  const [profileRows, scoreRows] = await Promise.all([
    listCandidateProfiles(candidateIds),
    listCandidateScores(candidateIds),
  ]);

  const profileMap = new Map(profileRows.map((profile) => [profile.candidateId, profile]));
  const scoreMap = new Map<string, CandidateScoreRow[]>();

  for (const score of scoreRows) {
    const current = scoreMap.get(score.candidateId) ?? [];
    current.push(score);
    scoreMap.set(score.candidateId, current);
  }

  const items = candidateRows.map((candidate) =>
    buildSummary(
      candidate,
      profileMap.get(candidate.id) ?? null,
      scoreMap.get(candidate.id) ?? [],
      query.jdId,
    ),
  );

  return {
    items,
    page,
    pageSize,
    total,
  };
}

export async function getCandidateDetail(candidateId: string) {
  const candidate = await getCandidateRecord(candidateId);
  if (!candidate) {
    return null;
  }

  const [profile] = await listCandidateProfiles([candidateId]);
  const scores = await listCandidateScores([candidateId]);

  return buildDetail(candidate, profile ?? null, scores);
}

export async function getCandidateFileRecord(candidateId: string) {
  return getCandidateRecord(candidateId);
}

export async function getCandidateFileBlob(candidateId: string) {
  const candidate = await getCandidateRecord(candidateId);
  if (!candidate) {
    return null;
  }

  const blobToken = process.env.BLOB_READ_WRITE_TOKEN?.trim();
  if (!blobToken) {
    throw new Error("BLOB_READ_WRITE_TOKEN_MISSING");
  }

  const blobResult = await getBlob(candidate.originalFilePath, {
    access: "private",
    token: blobToken,
  });

  if (!blobResult || blobResult.statusCode !== 200) {
    return null;
  }

  return {
    candidate,
    file: blobResult as CandidateFileBlob,
  };
}

export async function getCandidateScoreList(args: { candidateId: string; jdId?: string }) {
  return listCandidateScoresByCandidate(args.candidateId, args.jdId);
}

export async function getCandidateScore(args: { candidateId: string; jdId: string }) {
  return getCandidateScoreRecord(args.candidateId, args.jdId);
}
