import type { FastifyInstance } from "fastify";
import {
  handleUploadFiles,
  toUploadErrorPayload,
  UploadError,
  uploadErrorSchema,
  uploadResponseSchema,
} from "../modules/uploads";

function toMultipartUploadErrorPayload(error: Error): {
  statusCode: 400 | 413;
  payload: {
    code: string;
    message: string;
    details: {
      error: string;
    };
  };
} {
  const isFileTooLarge =
    error.name === "FastifyError" && error.message === "request file too large";

  return {
    statusCode: isFileTooLarge ? 413 : 400,
    payload: {
      code: isFileTooLarge ? "FILE_TOO_LARGE" : "INVALID_MULTIPART_UPLOAD",
      message: isFileTooLarge
        ? "单个 PDF 文件大小不能超过 10MB。"
        : "上传内容不符合 multipart 或文件大小限制。",
      details: {
        error: error.message,
      },
    },
  };
}

// 简历批量上传接口，接收 multipart PDF 并返回当前请求的文件结果。
export async function registerUploadRoutes(app: FastifyInstance) {
  app.post(
    "/uploads/resumes",
    {
      schema: {
        response: {
          201: uploadResponseSchema,
          400: uploadErrorSchema,
          413: uploadErrorSchema,
        },
      },
    },
    async (request, reply) => {
      try {
        const result = await handleUploadFiles(request.parts());
        return reply.code(201).send(result);
      } catch (error) {
        if (error instanceof UploadError) {
          if (error.statusCode === 413) {
            return reply.code(413).send(toUploadErrorPayload(error));
          }

          if (error.statusCode === 400) {
            return reply.code(400).send(toUploadErrorPayload(error));
          }

          throw error;
        }

        if (
          error instanceof app.multipartErrors.RequestFileTooLargeError ||
          error instanceof app.multipartErrors.FilesLimitError ||
          error instanceof app.multipartErrors.FieldsLimitError ||
          error instanceof app.multipartErrors.PartsLimitError ||
          error instanceof app.multipartErrors.InvalidMultipartContentTypeError
        ) {
          const { statusCode, payload } = toMultipartUploadErrorPayload(error);
          return reply.code(statusCode).send(payload);
        }

        throw error;
      }
    },
  );
}
