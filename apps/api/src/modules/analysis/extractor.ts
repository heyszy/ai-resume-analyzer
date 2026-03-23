import {
  candidateBasicInfoSchema,
  candidateEducationSchema,
  candidateProfileSchema,
  candidateProfileUpdateSchema,
  candidateWorkExperienceSchema,
} from "@ai-resume-analyzer/shared";
import { Output, streamText } from "ai";
import type { FastifyBaseLogger } from "fastify";
import { z } from "zod";

import type { AppEnv } from "../../env";

import { createResumeExtractionModel } from "./ai";
import { AnalysisError } from "./errors";

const aiProjectExperienceSchema = z.object({
  projectName: z.string().trim().min(1).nullable(),
  techStack: z.array(z.string().min(1)),
  responsibilities: z.array(z.string().min(1)),
  highlights: z.array(z.string().min(1)),
});

const candidateExtractionSchema = z.object({
  basicInfo: candidateBasicInfoSchema,
  educationHistory: z.array(candidateEducationSchema),
  workExperiences: z.array(candidateWorkExperienceSchema),
  skillTags: z.array(z.string().min(1)),
  projectExperiences: z.array(aiProjectExperienceSchema),
  extractionNotes: z.string(),
});

export type CandidateExtraction = z.infer<typeof candidateExtractionSchema>;
export type CandidateExtractionPartial = z.infer<typeof candidateProfileUpdateSchema>;

function buildExtractionPrompt(cleanedText: string) {
  return [
    "你是一个简历结构化提取器。",
    "请严格根据提供的简历文本抽取信息，不要凭空猜测。",
    "缺失字段请返回 null，缺失数组请返回空数组。",
    "只输出结构化对象，不输出额外说明。",
    "如果能判断文本是扫描件、提取质量很差或存在明显缺失，请把原因写入 extractionNotes。",
    "",
    "简历文本如下：",
    cleanedText,
  ].join("\n");
}

function normalizeExtraction(
  extraction: CandidateExtraction,
  sourceText: string,
  cleanedText: string,
) {
  return candidateProfileSchema.parse({
    ...extraction,
    educationHistory: extraction.educationHistory ?? [],
    workExperiences: extraction.workExperiences ?? [],
    skillTags: extraction.skillTags ?? [],
    projectExperiences: extraction.projectExperiences ?? [],
    extractionNotes: extraction.extractionNotes ?? "",
    sourceText,
    cleanedText,
    extractedAt: new Date().toISOString(),
  });
}

export async function extractCandidateProfile(args: {
  config: AppEnv;
  logger: FastifyBaseLogger;
  signal?: AbortSignal;
  sourceText: string;
  cleanedText: string;
  onPartial: (partial: CandidateExtractionPartial) => Promise<void> | void;
}) {
  try {
    const extractionLogger = args.logger.child({ stage: "resume.extract" });
    const prompt = buildExtractionPrompt(args.cleanedText);
    const model = createResumeExtractionModel(args.config);
    extractionLogger.info(
      {
        model: args.config.AI_MODEL,
        sourceTextLength: args.sourceText.length,
        cleanedTextLength: args.cleanedText.length,
        promptLength: prompt.length,
      },
      "开始简历 AI 提取。",
    );

    const result = streamText({
      model,
      output: Output.object({
        schema: candidateExtractionSchema,
      }),
      prompt,
    });

    for await (const partial of result.partialOutputStream) {
      const parsedPartial = candidateProfileUpdateSchema.safeParse(partial);
      if (parsedPartial.success) {
        await args.onPartial(parsedPartial.data);
      }
    }

    const [finalOutput, finishReason, usage, response] = await Promise.all([
      result.output,
      result.finishReason,
      result.usage,
      result.response,
    ]);
    const parsedOutput = candidateExtractionSchema.safeParse(finalOutput);

    if (!parsedOutput.success) {
      throw new AnalysisError("AI_EXTRACTION_FAILED", "AI 返回的结构化结果不符合预期。", {
        issues: parsedOutput.error.issues,
      });
    }

    const normalizedProfile = normalizeExtraction(
      parsedOutput.data,
      args.sourceText,
      args.cleanedText,
    );

    extractionLogger.info(
      {
        model: args.config.AI_MODEL,
        responseId: response.id,
        responseModelId: response.modelId,
        responseTimestamp: response.timestamp.toISOString(),
        finishReason,
        usage,
      },
      "简历 AI 提取成功。",
    );

    return normalizedProfile;
  } catch (error) {
    if (args.signal?.aborted) {
      throw error;
    }

    const aiFailureDetails =
      error instanceof AnalysisError &&
      typeof error.details === "object" &&
      error.details !== null &&
      !Array.isArray(error.details)
        ? {
            ...error.details,
            aiCallFailed: true,
          }
        : {
            originalDetails: error instanceof AnalysisError ? error.details : undefined,
            aiCallFailed: true,
          };

    args.logger.error(
      {
        err: error,
        model: args.config.AI_MODEL,
      },
      "简历 AI 提取失败。",
    );

    if (error instanceof AnalysisError) {
      throw new AnalysisError(error.code, error.message, aiFailureDetails);
    }

    throw new AnalysisError("AI_EXTRACTION_FAILED", "调用 AI 提取简历信息时失败。", {
      cause: error instanceof Error ? error.message : String(error),
      aiCallFailed: true,
    });
  }
}
