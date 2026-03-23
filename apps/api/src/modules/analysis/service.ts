import type {
  analysisErrorEventSchema,
  analysisProgressEventSchema,
  analysisResumeFinalEventSchema,
  analysisResumePartialEventSchema,
  analysisScoreFinalEventSchema,
  analysisScorePartialEventSchema,
} from "@ai-resume-analyzer/shared";
import type { FastifyBaseLogger } from "fastify";
import type { z } from "zod";

import type { AppEnv } from "../../env";
import { getCandidateScoreRecord, upsertCandidateScore } from "../candidates/repository";
import type { CandidateProfileRow, CandidateScoreRow } from "../candidates/types";
import { getJobDescriptionRecord } from "../job-descriptions/repository";
import { cleanResumeText } from "./cleaner";
import { AnalysisError } from "./errors";
import { extractCandidateProfile } from "./extractor";
import { parseCandidatePdf } from "./pdf";
import {
  completeCandidateAnalysis,
  completeCandidateScoring,
  failCandidateAnalysis,
  getCandidateById,
  getCandidateProfileById,
  markCandidateAsExtracting,
  markCandidateAsParsing,
  markCandidateAsScoring,
} from "./repository";
import { generateCandidateScore } from "./scorer";

export type AnalysisProgressEvent = z.infer<typeof analysisProgressEventSchema>;
export type AnalysisResumePartialEvent = z.infer<typeof analysisResumePartialEventSchema>;
export type AnalysisResumeFinalEvent = z.infer<typeof analysisResumeFinalEventSchema>;
export type AnalysisScorePartialEvent = z.infer<typeof analysisScorePartialEventSchema>;
export type AnalysisScoreFinalEvent = z.infer<typeof analysisScoreFinalEventSchema>;
export type AnalysisErrorEvent = z.infer<typeof analysisErrorEventSchema>;

type CandidateAnalysisEvent =
  | AnalysisProgressEvent
  | AnalysisResumePartialEvent
  | AnalysisResumeFinalEvent
  | AnalysisScorePartialEvent
  | AnalysisScoreFinalEvent
  | AnalysisErrorEvent
  | {
      type: "done";
      candidateId: string;
    };

type CandidateAnalysisContext = {
  config: AppEnv;
  candidateId: string;
  jdId?: string;
  logger: FastifyBaseLogger;
  regenerateScore: boolean;
  signal?: AbortSignal;
  onEvent: (event: CandidateAnalysisEvent) => Promise<void> | void;
};

function throwIfAborted(signal?: AbortSignal) {
  if (signal?.aborted) {
    throw new AnalysisError("AI_EXTRACTION_FAILED", "解析连接已关闭，任务被中止。");
  }
}

function isLoggedAiFailure(error: AnalysisError) {
  return (
    (error.code === "AI_EXTRACTION_FAILED" || error.code === "AI_SCORING_FAILED") &&
    typeof error.details === "object" &&
    error.details !== null &&
    !Array.isArray(error.details) &&
    "aiCallFailed" in error.details
  );
}

function buildStoredProfile(profile: CandidateProfileRow): AnalysisResumeFinalEvent["profile"] {
  return {
    basicInfo: profile.basicInfo,
    educationHistory: profile.educationHistory,
    workExperiences: profile.workExperiences,
    skillTags: profile.skillTags,
    projectExperiences: profile.projectExperiences,
    sourceText: profile.sourceText,
    cleanedText: profile.cleanedText,
    extractionNotes: profile.extractionNotes,
    extractedAt: profile.extractedAt?.toISOString(),
  };
}

function normalizeScoreDetails(score: CandidateScoreRow["scoreDetails"]) {
  return {
    skillNotes: score?.skillNotes ?? "",
    experienceNotes: score?.experienceNotes ?? "",
    educationNotes: score?.educationNotes ?? "",
    matchedSkills: score?.matchedSkills ?? [],
    missingSkills: score?.missingSkills ?? [],
  };
}

function buildStoredScore(
  score: CandidateScoreRow,
  jdTitle?: string,
): AnalysisScoreFinalEvent["score"] {
  return {
    id: score.id,
    candidateId: score.candidateId,
    jdId: score.jdId,
    jdTitle,
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

async function extractAndPersistCandidateProfile(args: {
  candidateId: string;
  config: AppEnv;
  candidateOriginalFilePath: string;
  logger: FastifyBaseLogger;
  onEvent: CandidateAnalysisContext["onEvent"];
  signal?: AbortSignal;
}) {
  await markCandidateAsParsing(args.candidateId);
  await args.onEvent({
    type: "progress",
    candidateId: args.candidateId,
    processingStatus: "parsing",
    stage: "pdf.parse",
    message: "正在提取 PDF 文本内容。",
    progress: 10,
  });

  const parsedPdf = await parseCandidatePdf(args.candidateOriginalFilePath);
  throwIfAborted(args.signal);

  const cleanedText = cleanResumeText(parsedPdf.sourceText);
  await markCandidateAsExtracting(args.candidateId, parsedPdf.pageCount);
  await args.onEvent({
    type: "progress",
    candidateId: args.candidateId,
    processingStatus: "extracting",
    stage: "resume.extract",
    message: "正在提取基础信息、经历与技能标签。",
    progress: 45,
  });

  const profile = await extractCandidateProfile({
    config: args.config,
    logger: args.logger,
    signal: args.signal,
    sourceText: parsedPdf.sourceText,
    cleanedText,
    onPartial: async (partial) => {
      throwIfAborted(args.signal);
      await args.onEvent({
        type: "resume.partial",
        candidateId: args.candidateId,
        profile: partial,
      });
    },
  });

  throwIfAborted(args.signal);
  await completeCandidateAnalysis({
    candidateId: args.candidateId,
    pageCount: parsedPdf.pageCount,
    profile,
  });

  await args.onEvent({
    type: "resume.final",
    candidateId: args.candidateId,
    profile,
  });

  return {
    pageCount: parsedPdf.pageCount,
    profile,
  };
}

export async function runCandidateAnalysis(context: CandidateAnalysisContext) {
  const { candidateId, config, jdId, logger, onEvent, regenerateScore, signal } = context;
  const candidateLogger = logger.child({ candidateId });
  let pageCount = 0;

  try {
    throwIfAborted(signal);
    const candidate = await getCandidateById(candidateId);
    pageCount = candidate.pageCount;

    const storedProfile = jdId ? await getCandidateProfileById(candidate.id) : null;
    const profile =
      storedProfile && jdId
        ? buildStoredProfile(storedProfile)
        : (
            await extractAndPersistCandidateProfile({
              candidateId,
              config,
              candidateOriginalFilePath: candidate.originalFilePath,
              logger: candidateLogger,
              onEvent,
              signal,
            })
          ).profile;

    if (storedProfile && jdId) {
      await onEvent({
        type: "resume.final",
        candidateId,
        profile,
      });
    }

    if (!jdId) {
      await onEvent({
        type: "progress",
        candidateId,
        processingStatus: "ready",
        stage: "resume.complete",
        message: "简历解析完成。",
        progress: 100,
      });
      await onEvent({
        type: "done",
        candidateId,
      });
      return;
    }

    const jobDescription = await getJobDescriptionRecord(jdId);
    if (!jobDescription) {
      throw new AnalysisError("JOB_DESCRIPTION_NOT_FOUND", "未找到用于评分的岗位 JD。", {
        jdId,
      });
    }

    const storedScore = await getCandidateScoreRecord(candidateId, jdId);
    if (storedScore && !regenerateScore) {
      await onEvent({
        type: "progress",
        candidateId,
        processingStatus: "ready",
        stage: "score.cached",
        message: "已返回当前岗位的已有评分。",
        progress: 100,
      });
      await onEvent({
        type: "score.final",
        candidateId,
        jdId,
        score: buildStoredScore(storedScore, jobDescription.title),
      });
      await onEvent({
        type: "done",
        candidateId,
      });
      return;
    }

    await markCandidateAsScoring(candidate.id);
    await onEvent({
      type: "progress",
      candidateId,
      processingStatus: "scoring",
      stage: "score.prepare",
      message: "正在准备岗位匹配评分。",
      progress: 70,
    });

    const scoringResult = await generateCandidateScore({
      config,
      logger: candidateLogger,
      signal,
      profile,
      jobDescription,
      onPartial: async (partial) => {
        throwIfAborted(signal);
        await onEvent({
          type: "score.partial",
          candidateId,
          jdId,
          stage: "score.generate",
          message: "正在生成岗位匹配评语。",
          commentary: partial.commentary?.trim() || undefined,
        });
      },
    });

    const savedScore = await upsertCandidateScore(candidateId, {
      jdId,
      totalScore: scoringResult.totalScore,
      skillMatchScore: scoringResult.skillMatchScore,
      experienceRelevanceScore: scoringResult.experienceRelevanceScore,
      educationFitScore: scoringResult.educationFitScore,
      aiCommentary: scoringResult.aiCommentary,
      scoreDetails: scoringResult.scoreDetails,
      isStale: false,
      scoredAt: new Date(),
    });

    if (!savedScore) {
      throw new AnalysisError("AI_SCORING_FAILED", "岗位评分保存失败。");
    }

    await completeCandidateScoring(candidate.id);
    await onEvent({
      type: "progress",
      candidateId,
      processingStatus: "ready",
      stage: "score.complete",
      message: regenerateScore ? "岗位评分已重新生成。" : "岗位评分生成完成。",
      progress: 100,
    });
    await onEvent({
      type: "score.final",
      candidateId,
      jdId,
      score: buildStoredScore(savedScore, jobDescription.title),
    });
    await onEvent({
      type: "done",
      candidateId,
    });
  } catch (error) {
    if (signal?.aborted) {
      return;
    }

    const normalizedError =
      error instanceof AnalysisError
        ? error
        : new AnalysisError("AI_EXTRACTION_FAILED", "解析简历时发生未知错误。", {
            cause: error instanceof Error ? error.message : String(error),
          });

    if (!(normalizedError instanceof AnalysisError && isLoggedAiFailure(normalizedError))) {
      candidateLogger.error(
        {
          err: normalizedError,
        },
        "候选人分析任务失败。",
      );
    }

    if (!signal?.aborted) {
      await failCandidateAnalysis({
        candidateId,
        code: normalizedError.code,
        message: normalizedError.message,
        pageCount,
      });

      await onEvent({
        type: "error",
        candidateId,
        code: normalizedError.code,
        message: normalizedError.message,
        details: normalizedError.details,
      });
      await onEvent({
        type: "done",
        candidateId,
      });
    }
  }
}
