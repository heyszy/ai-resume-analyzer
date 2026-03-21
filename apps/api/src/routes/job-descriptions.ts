import {
  jobDescriptionCreateResponseSchema,
  jobDescriptionInputSchema,
  jobDescriptionListQuerySchema,
  jobDescriptionListResponseSchema,
  jobDescriptionUpdateResponseSchema,
  uuidSchema,
} from "@ai-resume-analyzer/shared";
import type { FastifyInstance } from "fastify";
import { z } from "zod";

import { sendNotImplemented } from "../lib/not-implemented";

const jobDescriptionParamsSchema = z.object({
  jdId: uuidSchema,
});

// JD 列表接口，支持分页、搜索和状态筛选。
export async function registerJobDescriptionRoutes(app: FastifyInstance) {
  app.get(
    "/jds",
    {
      schema: {
        querystring: jobDescriptionListQuerySchema,
        response: {
          200: jobDescriptionListResponseSchema,
        },
      },
    },
    async (_request, reply) => {
      return sendNotImplemented(reply, "JD 列表查询逻辑暂未实现。");
    },
  );

  // JD 新增接口，用于创建岗位描述和必备技能配置。
  app.post(
    "/jds",
    {
      schema: {
        body: jobDescriptionInputSchema,
        response: {
          200: jobDescriptionCreateResponseSchema,
        },
      },
    },
    async (_request, reply) => {
      return sendNotImplemented(reply, "JD 新增逻辑暂未实现。");
    },
  );

  // JD 更新接口，用于修改岗位描述、技能要求和启用状态。
  app.patch(
    "/jds/:jdId",
    {
      schema: {
        params: jobDescriptionParamsSchema,
        body: jobDescriptionInputSchema.partial(),
        response: {
          200: jobDescriptionUpdateResponseSchema,
        },
      },
    },
    async (_request, reply) => {
      return sendNotImplemented(reply, "JD 更新逻辑暂未实现。");
    },
  );
}
