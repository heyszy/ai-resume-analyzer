import {
  analysisStartResponseSchema,
  analysisStreamQuerySchema,
  analysisStreamResponseSchema,
  uuidSchema,
} from "@ai-resume-analyzer/shared";
import type { FastifyInstance } from "fastify";
import { z } from "zod";

import { sendNotImplemented } from "../lib/not-implemented";

const analysisParamsSchema = z.object({
  candidateId: uuidSchema,
});

// 简历分析流接口，预留 SSE 协议给前端逐步渲染提取与评分过程。
export async function registerAnalysisRoutes(app: FastifyInstance) {
  app.get(
    "/candidates/:candidateId/analysis/stream",
    {
      schema: {
        params: analysisParamsSchema,
        querystring: analysisStreamQuerySchema,
        response: {
          200: analysisStartResponseSchema,
          501: analysisStreamResponseSchema,
        },
      },
    },
    async (_request, reply) => {
      return sendNotImplemented(reply, "简历分析 SSE 流接口暂未实现。");
    },
  );
}
