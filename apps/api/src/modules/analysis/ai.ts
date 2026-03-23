import { createOpenAI } from "@ai-sdk/openai";

import type { AppEnv } from "../../env";

import { AnalysisError } from "./errors";

type ReadyAiConfig = AppEnv & {
  AI_API_KEY: string;
  AI_MODEL: string;
};

function assertAiConfig(config: AppEnv): asserts config is ReadyAiConfig {
  if (!config.AI_API_KEY || !config.AI_MODEL) {
    throw new AnalysisError(
      "AI_CONFIG_MISSING",
      "缺少 AI_API_KEY 或 AI_MODEL，无法执行简历结构化提取。",
    );
  }
}

export function createResumeExtractionModel(config: AppEnv) {
  assertAiConfig(config);

  const provider = createOpenAI({
    apiKey: config.AI_API_KEY,
    baseURL: config.AI_BASE_URL,
  });

  return provider(config.AI_MODEL);
}

export function createResumeScoringModel(config: AppEnv) {
  return createResumeExtractionModel(config);
}
