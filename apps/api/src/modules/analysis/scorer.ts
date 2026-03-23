import type { candidateProfileSchema } from "@ai-resume-analyzer/shared";
import { Output, streamText } from "ai";
import type { FastifyBaseLogger } from "fastify";
import { z } from "zod";

import type { AppEnv } from "../../env";
import type { JobDescriptionRow } from "../job-descriptions/types";

import { createResumeScoringModel } from "./ai";
import { AnalysisError } from "./errors";

const candidateScoreDetailsOutputSchema = z.object({
  skillNotes: z.string(),
  experienceNotes: z.string(),
  educationNotes: z.string(),
  matchedSkills: z.array(z.string().min(1)),
  missingSkills: z.array(z.string().min(1)),
});

const candidateScoringSchema = z.object({
  totalScore: z.number().int().min(0).max(100),
  skillMatchScore: z.number().int().min(0).max(100),
  experienceRelevanceScore: z.number().int().min(0).max(100),
  educationFitScore: z.number().int().min(0).max(100),
  aiCommentary: z.string().trim().min(1),
  scoreDetails: candidateScoreDetailsOutputSchema,
});

const candidateScoringPartialSchema = z.object({
  aiCommentary: z.string().optional(),
});

type CandidateProfile = z.infer<typeof candidateProfileSchema>;

export type CandidateScoringResult = z.infer<typeof candidateScoringSchema>;

function buildScoringPrompt(profile: CandidateProfile, jobDescription: JobDescriptionRow) {
  return [
    "你是一名招聘评估助手，需要根据候选人简历和岗位 JD 生成结构化评分。",
    "请只基于给定信息判断，不要凭空补充经历。",
    "请输出 0 到 100 的整数分。",
    "totalScore 需要综合 skillMatchScore、experienceRelevanceScore、educationFitScore。",
    "aiCommentary 需要用简洁中文总结候选人的优势、短板和是否值得进入下一轮。",
    "scoreDetails 中的 5 个字段都必须返回。",
    "如果某一项没有内容，文本字段返回空字符串，数组字段返回空数组。",
    "scoreDetails 中的 matchedSkills 和 missingSkills 请尽量结合 JD 技能项。",
    "",
    "岗位信息：",
    JSON.stringify(
      {
        title: jobDescription.title,
        description: jobDescription.description,
        requiredSkills: jobDescription.requiredSkills,
        bonusSkills: jobDescription.bonusSkills,
      },
      null,
      2,
    ),
    "",
    "候选人简历结构化信息：",
    JSON.stringify(profile, null, 2),
  ].join("\n");
}

function normalizeScoringResult(scoring: CandidateScoringResult) {
  return candidateScoringSchema.parse({
    ...scoring,
    aiCommentary: scoring.aiCommentary.trim(),
    scoreDetails: {
      skillNotes: scoring.scoreDetails.skillNotes.trim(),
      experienceNotes: scoring.scoreDetails.experienceNotes.trim(),
      educationNotes: scoring.scoreDetails.educationNotes.trim(),
      matchedSkills: scoring.scoreDetails.matchedSkills,
      missingSkills: scoring.scoreDetails.missingSkills,
    },
  });
}

export async function generateCandidateScore(args: {
  config: AppEnv;
  logger: FastifyBaseLogger;
  signal?: AbortSignal;
  profile: CandidateProfile;
  jobDescription: JobDescriptionRow;
  onPartial: (partial: { commentary?: string }) => Promise<void> | void;
}) {
  try {
    const scoringLogger = args.logger.child({
      stage: "resume.score",
      jdId: args.jobDescription.id,
    });
    const prompt = buildScoringPrompt(args.profile, args.jobDescription);
    const model = createResumeScoringModel(args.config);
    scoringLogger.info(
      {
        model: args.config.AI_MODEL,
        candidateSkillCount: args.profile.skillTags.length,
        jdRequiredSkillCount: args.jobDescription.requiredSkills.length,
        promptLength: prompt.length,
      },
      "开始简历岗位匹配评分。",
    );

    const result = streamText({
      model,
      output: Output.object({
        schema: candidateScoringSchema,
      }),
      prompt,
    });

    for await (const partial of result.partialOutputStream) {
      const parsedPartial = candidateScoringPartialSchema.safeParse(partial);
      if (parsedPartial.success) {
        await args.onPartial({
          commentary: parsedPartial.data.aiCommentary,
        });
      }
    }

    const [finalOutput, finishReason, usage, response] = await Promise.all([
      result.output,
      result.finishReason,
      result.usage,
      result.response,
    ]);
    const parsedOutput = candidateScoringSchema.safeParse(finalOutput);

    if (!parsedOutput.success) {
      throw new AnalysisError("AI_SCORING_FAILED", "AI 返回的评分结果不符合预期。", {
        issues: parsedOutput.error.issues,
      });
    }

    const normalizedScore = normalizeScoringResult(parsedOutput.data);

    scoringLogger.info(
      {
        model: args.config.AI_MODEL,
        responseId: response.id,
        responseModelId: response.modelId,
        responseTimestamp: response.timestamp.toISOString(),
        finishReason,
        usage,
      },
      "简历岗位匹配评分成功。",
    );

    return normalizedScore;
  } catch (error) {
    if (args.signal?.aborted) {
      throw error;
    }

    args.logger.error(
      {
        err: error,
        model: args.config.AI_MODEL,
        jdId: args.jobDescription.id,
      },
      "简历岗位匹配评分失败。",
    );

    if (error instanceof AnalysisError) {
      throw new AnalysisError(error.code, error.message, {
        originalDetails: error.details,
        aiCallFailed: true,
      });
    }

    throw new AnalysisError("AI_SCORING_FAILED", "调用 AI 生成岗位评分时失败。", {
      cause: error instanceof Error ? error.message : String(error),
      aiCallFailed: true,
    });
  }
}
