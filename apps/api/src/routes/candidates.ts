import {
  apiErrorSchema,
  candidateDeleteResponseSchema,
  candidateProfileUpdateResponseSchema,
  candidateProfileUpdateSchema,
  candidateScoreListQuerySchema,
  candidateScoreListResponseSchema,
  candidateStatusUpdateResponseSchema,
  candidateStatusUpdateSchema,
  uuidSchema,
} from "@ai-resume-analyzer/shared";
import type { FastifyInstance, FastifyRequest } from "fastify";
import { z } from "zod";
import {
  candidateDetailResponseSchema,
  candidateListQuerySchema,
  candidateListResponseSchema,
  deleteCandidate,
  getCandidateDetail,
  getCandidateFileBlob,
  getCandidateList,
  getCandidateRecord,
  getCandidateScoreList,
  listCandidateProfiles,
  updateCandidateRecord,
  upsertCandidateProfile,
} from "../modules/candidates";

const candidateParamsSchema = z.object({
  candidateId: uuidSchema,
});

type CandidateParams = z.infer<typeof candidateParamsSchema>;
type CandidateListQuery = z.infer<typeof candidateListQuerySchema>;
type CandidateScoreListQuery = z.infer<typeof candidateScoreListQuerySchema>;
type CandidateProfileUpdateBody = z.infer<typeof candidateProfileUpdateSchema>;
type CandidateStatusUpdateBody = z.infer<typeof candidateStatusUpdateSchema>;

function normalizeScoreDetails(scoreDetails: {
  skillNotes?: string;
  experienceNotes?: string;
  educationNotes?: string;
  matchedSkills?: string[];
  missingSkills?: string[];
}) {
  return {
    skillNotes: scoreDetails.skillNotes ?? "",
    experienceNotes: scoreDetails.experienceNotes ?? "",
    educationNotes: scoreDetails.educationNotes ?? "",
    matchedSkills: scoreDetails.matchedSkills ?? [],
    missingSkills: scoreDetails.missingSkills ?? [],
  };
}

function normalizeEducationHistory(
  educationHistory:
    | Array<{
        school?: string | null;
        major?: string | null;
        degree?: string | null;
        graduationTime?: string | null;
      }>
    | undefined,
) {
  return (educationHistory ?? []).map((item) => ({
    school: item.school ?? null,
    major: item.major ?? null,
    degree: item.degree ?? null,
    graduationTime: item.graduationTime ?? null,
  }));
}

function normalizeWorkExperiences(
  workExperiences:
    | Array<{
        companyName?: string | null;
        position?: string | null;
        timeRange?: string | null;
        summary?: string | null;
      }>
    | undefined,
) {
  return (workExperiences ?? []).map((item) => ({
    companyName: item.companyName ?? null,
    position: item.position ?? null,
    timeRange: item.timeRange ?? null,
    summary: item.summary ?? null,
  }));
}

function normalizeProjectExperiences(
  projectExperiences:
    | Array<{
        projectName?: string | null;
        techStack?: string[];
        responsibilities?: string[];
        highlights?: string[];
      }>
    | undefined,
) {
  return (projectExperiences ?? []).map((item) => ({
    projectName: item.projectName ?? null,
    techStack: item.techStack ?? [],
    responsibilities: item.responsibilities ?? [],
    highlights: item.highlights ?? [],
  }));
}

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
    async (request: FastifyRequest<{ Querystring: CandidateListQuery }>) => {
      return getCandidateList(request.query);
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
          404: apiErrorSchema,
        },
      },
    },
    async (request: FastifyRequest<{ Params: CandidateParams }>, reply) => {
      const candidate = await getCandidateDetail(request.params.candidateId);

      if (!candidate) {
        return reply.code(404).send({
          code: "CANDIDATE_NOT_FOUND",
          message: "候选人不存在。",
        });
      }

      return candidate;
    },
  );

  // 候选人评分查询接口，支持按单个 JD 查询或返回该候选人的全部评分。
  app.get(
    "/candidates/:candidateId/scores",
    {
      schema: {
        params: candidateParamsSchema,
        querystring: candidateScoreListQuerySchema,
        response: {
          200: candidateScoreListResponseSchema,
          404: apiErrorSchema,
        },
      },
    },
    async (
      request: FastifyRequest<{
        Params: CandidateParams;
        Querystring: CandidateScoreListQuery;
      }>,
      reply,
    ) => {
      const candidate = await getCandidateRecord(request.params.candidateId);

      if (!candidate) {
        return reply.code(404).send({
          code: "CANDIDATE_NOT_FOUND",
          message: "候选人不存在。",
        });
      }

      const scores = await getCandidateScoreList({
        candidateId: request.params.candidateId,
        jdId: request.query.jdId,
      });

      return {
        items: scores.map((score) => ({
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
        })),
      };
    },
  );

  // 候选人删除接口，同时清理原始 PDF 和关联的结构化数据。
  app.delete(
    "/candidates/:candidateId",
    {
      schema: {
        params: candidateParamsSchema,
        response: {
          200: candidateDeleteResponseSchema,
          404: apiErrorSchema,
          500: apiErrorSchema,
        },
      },
    },
    async (request: FastifyRequest<{ Params: CandidateParams }>, reply) => {
      const existing = await getCandidateRecord(request.params.candidateId);
      if (!existing) {
        return reply.code(404).send({
          code: "CANDIDATE_NOT_FOUND",
          message: "候选人不存在。",
        });
      }

      try {
        await deleteCandidate(request.params.candidateId);
      } catch (error) {
        return reply.code(500).send({
          code: "CANDIDATE_DELETE_FAILED",
          message: "候选人删除失败。",
          details: {
            error: error instanceof Error ? error.message : String(error),
          },
        });
      }

      return {
        candidateId: request.params.candidateId,
        deletedAt: new Date().toISOString(),
      };
    },
  );

  // 候选人原始简历文件接口，供详情页和预览组件直接拉取私有 Blob PDF。
  app.get(
    "/candidates/:candidateId/file",
    {
      schema: {
        params: candidateParamsSchema,
        response: {
          404: apiErrorSchema,
          500: apiErrorSchema,
        },
      },
    },
    async (request: FastifyRequest<{ Params: CandidateParams }>, reply) => {
      const result = await (async () => {
        try {
          return await getCandidateFileBlob(request.params.candidateId);
        } catch (error) {
          await reply.code(500).send({
            code: "CANDIDATE_FILE_READ_FAILED",
            message: "读取候选人文件失败。",
            details: {
              error: error instanceof Error ? error.message : String(error),
            },
          });

          return null;
        }
      })();

      if (reply.sent) {
        return reply;
      }

      if (!result) {
        return reply.code(404).send({
          code: "CANDIDATE_FILE_NOT_FOUND",
          message: "候选人文件不存在。",
        });
      }

      reply.header("Content-Type", result.file.blob.contentType);
      reply.header("Content-Length", String(result.file.blob.size));
      reply.header("Content-Disposition", "inline");
      reply.header("ETag", result.file.blob.etag);
      reply.header("Cache-Control", result.file.blob.cacheControl);
      reply.header("Last-Modified", result.file.blob.uploadedAt.toUTCString());

      const fileBuffer = Buffer.from(await new Response(result.file.stream).arrayBuffer());

      return reply.send(fileBuffer);
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
          404: apiErrorSchema,
          500: apiErrorSchema,
        },
      },
    },
    async (
      request: FastifyRequest<{
        Params: CandidateParams;
        Body: CandidateProfileUpdateBody;
      }>,
      reply,
    ) => {
      const existing = await getCandidateRecord(request.params.candidateId);
      if (!existing) {
        return reply.code(404).send({
          code: "CANDIDATE_NOT_FOUND",
          message: "候选人不存在。",
        });
      }

      const [currentProfile] = await listCandidateProfiles([request.params.candidateId]);

      const profile = await upsertCandidateProfile(request.params.candidateId, {
        basicInfo: {
          name:
            request.body.basicInfo?.name ?? currentProfile?.basicInfo.name ?? existing.displayName,
          phone:
            request.body.basicInfo?.phone ??
            currentProfile?.basicInfo.phone ??
            existing.phone ??
            null,
          email:
            request.body.basicInfo?.email ??
            currentProfile?.basicInfo.email ??
            existing.email ??
            null,
          city:
            request.body.basicInfo?.city ?? currentProfile?.basicInfo.city ?? existing.city ?? null,
        },
        educationHistory: normalizeEducationHistory(
          request.body.educationHistory ?? currentProfile?.educationHistory,
        ),
        workExperiences: normalizeWorkExperiences(
          request.body.workExperiences ?? currentProfile?.workExperiences,
        ),
        skillTags: request.body.skillTags ?? currentProfile?.skillTags ?? [],
        projectExperiences: normalizeProjectExperiences(
          request.body.projectExperiences ?? currentProfile?.projectExperiences,
        ),
        sourceText: request.body.sourceText ?? currentProfile?.sourceText ?? "",
        cleanedText: request.body.cleanedText ?? currentProfile?.cleanedText ?? "",
        extractionNotes: request.body.extractionNotes ?? currentProfile?.extractionNotes ?? "",
        extractedAt: new Date(),
      });

      if (!profile) {
        return reply.code(500).send({
          code: "CANDIDATE_PROFILE_UPDATE_FAILED",
          message: "候选人资料更新失败。",
        });
      }

      await updateCandidateRecord(request.params.candidateId, {
        displayName: profile.basicInfo.name ?? "未命名候选人",
        email: profile.basicInfo.email,
        phone: profile.basicInfo.phone,
        city: profile.basicInfo.city,
      });

      return {
        candidateId: request.params.candidateId,
        profile: {
          basicInfo: profile.basicInfo,
          educationHistory: profile.educationHistory,
          workExperiences: profile.workExperiences,
          skillTags: profile.skillTags,
          projectExperiences: profile.projectExperiences,
          sourceText: profile.sourceText,
          cleanedText: profile.cleanedText,
          extractionNotes: profile.extractionNotes,
          extractedAt: profile.extractedAt?.toISOString(),
        },
      };
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
          404: apiErrorSchema,
          500: apiErrorSchema,
        },
      },
    },
    async (
      request: FastifyRequest<{
        Params: CandidateParams;
        Body: CandidateStatusUpdateBody;
      }>,
      reply,
    ) => {
      const existing = await getCandidateRecord(request.params.candidateId);
      if (!existing) {
        return reply.code(404).send({
          code: "CANDIDATE_NOT_FOUND",
          message: "候选人不存在。",
        });
      }

      const updated = await updateCandidateRecord(request.params.candidateId, {
        status: request.body.status,
      });

      if (!updated) {
        return reply.code(500).send({
          code: "CANDIDATE_STATUS_UPDATE_FAILED",
          message: "候选人状态更新失败。",
        });
      }

      return {
        candidateId: updated.id,
        status: updated.status,
        updatedAt: updated.updatedAt.toISOString(),
      };
    },
  );
}
