import {
  apiErrorSchema,
  jobDescriptionCreateResponseSchema,
  jobDescriptionDeleteResponseSchema,
  jobDescriptionDetailResponseSchema,
  jobDescriptionInputSchema,
  jobDescriptionListQuerySchema,
  jobDescriptionListResponseSchema,
  jobDescriptionUpdateBodySchema,
  jobDescriptionUpdateResponseSchema,
  uuidSchema,
} from "@ai-resume-analyzer/shared";
import type { FastifyInstance, FastifyRequest } from "fastify";
import { z } from "zod";

import {
  createJobDescription,
  deleteJobDescription,
  getJobDescriptionDetail,
  getJobDescriptionList,
  updateJobDescription,
} from "../modules/job-descriptions";

const jobDescriptionParamsSchema = z.object({
  jdId: uuidSchema,
});

type JobDescriptionParams = z.infer<typeof jobDescriptionParamsSchema>;
type JobDescriptionListQuery = z.infer<typeof jobDescriptionListQuerySchema>;
type JobDescriptionCreateBody = z.infer<typeof jobDescriptionInputSchema>;
type JobDescriptionUpdateBody = z.infer<typeof jobDescriptionUpdateBodySchema>;

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
    async (request: FastifyRequest<{ Querystring: JobDescriptionListQuery }>) => {
      return getJobDescriptionList(request.query);
    },
  );

  // JD 详情接口，返回单条岗位描述和技能要求。
  app.get(
    "/jds/:jdId",
    {
      schema: {
        params: jobDescriptionParamsSchema,
        response: {
          200: jobDescriptionDetailResponseSchema,
          404: apiErrorSchema,
        },
      },
    },
    async (request: FastifyRequest<{ Params: JobDescriptionParams }>, reply) => {
      const jobDescription = await getJobDescriptionDetail(request.params.jdId);

      if (!jobDescription) {
        return reply.code(404).send({
          code: "JOB_DESCRIPTION_NOT_FOUND",
          message: "岗位不存在。",
        });
      }

      return jobDescription;
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
          500: apiErrorSchema,
        },
      },
    },
    async (request: FastifyRequest<{ Body: JobDescriptionCreateBody }>, reply) => {
      const created = await createJobDescription(request.body);

      if (!created) {
        return reply.code(500).send({
          code: "JOB_DESCRIPTION_CREATE_FAILED",
          message: "岗位创建失败。",
        });
      }

      return created;
    },
  );

  // JD 更新接口，用于修改岗位描述、技能要求和启用状态。
  app.patch(
    "/jds/:jdId",
    {
      schema: {
        params: jobDescriptionParamsSchema,
        body: jobDescriptionUpdateBodySchema,
        response: {
          200: jobDescriptionUpdateResponseSchema,
          404: apiErrorSchema,
          500: apiErrorSchema,
        },
      },
    },
    async (
      request: FastifyRequest<{
        Params: JobDescriptionParams;
        Body: JobDescriptionUpdateBody;
      }>,
      reply,
    ) => {
      const existing = await getJobDescriptionDetail(request.params.jdId);

      if (!existing) {
        return reply.code(404).send({
          code: "JOB_DESCRIPTION_NOT_FOUND",
          message: "岗位不存在。",
        });
      }

      const updated = await updateJobDescription(request.params.jdId, request.body);

      if (!updated) {
        return reply.code(500).send({
          code: "JOB_DESCRIPTION_UPDATE_FAILED",
          message: "岗位更新失败。",
        });
      }

      return updated;
    },
  );

  // JD 删除接口，用于移除岗位配置。
  app.delete(
    "/jds/:jdId",
    {
      schema: {
        params: jobDescriptionParamsSchema,
        response: {
          200: jobDescriptionDeleteResponseSchema,
          404: apiErrorSchema,
          500: apiErrorSchema,
        },
      },
    },
    async (request: FastifyRequest<{ Params: JobDescriptionParams }>, reply) => {
      const existing = await getJobDescriptionDetail(request.params.jdId);

      if (!existing) {
        return reply.code(404).send({
          code: "JOB_DESCRIPTION_NOT_FOUND",
          message: "岗位不存在。",
        });
      }

      const deleted = await deleteJobDescription(request.params.jdId);

      if (!deleted) {
        return reply.code(500).send({
          code: "JOB_DESCRIPTION_DELETE_FAILED",
          message: "岗位删除失败。",
        });
      }

      return deleted;
    },
  );
}
