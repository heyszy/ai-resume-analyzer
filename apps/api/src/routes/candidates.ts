import {
  candidateDetailResponseSchema,
  candidateListQuerySchema,
  candidateListResponseSchema,
  candidateProfileUpdateResponseSchema,
  candidateProfileUpdateSchema,
  candidateStatusUpdateResponseSchema,
  candidateStatusUpdateSchema,
  uuidSchema,
} from "@ai-resume-analyzer/shared";
import type { FastifyInstance } from "fastify";
import { z } from "zod";

import { sendNotImplemented } from "../lib/not-implemented";

const candidateParamsSchema = z.object({
  candidateId: uuidSchema,
});

// 候选人列表接口，支持分页、关键字搜索、技能筛选和排序。
export async function registerCandidateRoutes(app: FastifyInstance) {
  app.get(
    "/candidates",
    {
      schema: {
        querystring: candidateListQuerySchema,
        response: {
          200: candidateListResponseSchema,
        },
      },
    },
    async (_request, reply) => {
      return sendNotImplemented(reply, "候选人列表查询逻辑暂未实现。");
    },
  );

  // 候选人详情接口，返回完整简历解析结果、状态和评分信息。
  app.get(
    "/candidates/:candidateId",
    {
      schema: {
        params: candidateParamsSchema,
        response: {
          200: candidateDetailResponseSchema,
        },
      },
    },
    async (_request, reply) => {
      return sendNotImplemented(reply, "候选人详情查询逻辑暂未实现。");
    },
  );

  // 候选人信息修正接口，供前端修改 AI 提取后的结构化资料。
  app.patch(
    "/candidates/:candidateId/profile",
    {
      schema: {
        params: candidateParamsSchema,
        body: candidateProfileUpdateSchema,
        response: {
          200: candidateProfileUpdateResponseSchema,
        },
      },
    },
    async (_request, reply) => {
      return sendNotImplemented(reply, "候选人信息修正逻辑暂未实现。");
    },
  );

  // 候选人状态变更接口，驱动待筛选、初筛通过、面试中、已录用和已淘汰流转。
  app.patch(
    "/candidates/:candidateId/status",
    {
      schema: {
        params: candidateParamsSchema,
        body: candidateStatusUpdateSchema,
        response: {
          200: candidateStatusUpdateResponseSchema,
        },
      },
    },
    async (_request, reply) => {
      return sendNotImplemented(reply, "候选人状态变更逻辑暂未实现。");
    },
  );
}
