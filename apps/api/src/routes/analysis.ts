import { analysisStreamQuerySchema, uuidSchema } from "@ai-resume-analyzer/shared";
import type { FastifyBaseLogger, FastifyInstance, FastifyRequest } from "fastify";
import { z } from "zod";

import { runAnalysisStream } from "../modules/analysis";

const analysisParamsSchema = z.object({
  candidateId: uuidSchema,
});

type AnalysisStreamQuery = z.infer<typeof analysisStreamQuerySchema>;
type CandidateAnalysisStreamQuery = Omit<AnalysisStreamQuery, "candidateIds">;
type AnalysisParams = z.infer<typeof analysisParamsSchema>;

function applySseCorsHeaders(
  reply: {
    raw: NodeJS.WritableStream & {
      setHeader: (name: string, value: string) => void;
    };
  },
  origin?: string,
) {
  if (!origin) {
    return;
  }

  reply.raw.setHeader("Access-Control-Allow-Origin", origin);
  reply.raw.setHeader("Vary", "Origin");
}

function writeSseEvent(reply: { raw: NodeJS.WritableStream }, event: unknown) {
  reply.raw.write(
    `event: ${typeof event === "object" && event && "type" in event ? String(event.type) : "message"}\n`,
  );
  reply.raw.write(`data: ${JSON.stringify(event)}\n\n`);
}

async function startAnalysisStream(args: {
  app: FastifyInstance;
  regenerateScore: boolean;
  jdId?: string;
  logger: FastifyBaseLogger;
  reply: {
    raw: NodeJS.WritableStream & {
      writableEnded?: boolean;
      flushHeaders?: () => void;
      setHeader: (name: string, value: string) => void;
      end: () => void;
      write: (chunk: string) => void;
    };
    hijack: () => void;
  };
  origin?: string;
  candidateIdsQuery: string;
  signal: AbortSignal;
}) {
  args.reply.hijack();
  applySseCorsHeaders(args.reply, args.origin);
  args.reply.raw.setHeader("Content-Type", "text/event-stream; charset=utf-8");
  args.reply.raw.setHeader("Cache-Control", "no-cache, no-transform");
  args.reply.raw.setHeader("Connection", "keep-alive");
  args.reply.raw.setHeader("X-Accel-Buffering", "no");
  args.reply.raw.flushHeaders?.();
  args.reply.raw.write("retry: 3000\n\n");

  await runAnalysisStream({
    candidateIdsQuery: args.candidateIdsQuery,
    config: args.app.config,
    jdId: args.jdId,
    logger: args.logger,
    regenerateScore: args.regenerateScore,
    signal: args.signal,
    onEvent: async (event) => {
      if (!args.reply.raw.writableEnded && !args.signal.aborted) {
        writeSseEvent(args.reply, event);
      }
    },
  });

  if (!args.reply.raw.writableEnded) {
    args.reply.raw.end();
  }
}

// 简历分析流接口，预留 SSE 协议给前端逐步渲染提取与评分过程。
export async function registerAnalysisRoutes(app: FastifyInstance) {
  app.get(
    "/analysis/stream",
    {
      schema: {
        querystring: analysisStreamQuerySchema,
      },
    },
    async (request: FastifyRequest<{ Querystring: AnalysisStreamQuery }>, reply) => {
      const abortController = new AbortController();

      request.raw.on("close", () => {
        abortController.abort();
      });

      await startAnalysisStream({
        app,
        logger: request.log,
        reply,
        origin: request.headers.origin,
        candidateIdsQuery: request.query.candidateIds,
        jdId: request.query.jdId,
        regenerateScore: request.query.regenerateScore ?? false,
        signal: abortController.signal,
      });
    },
  );

  app.get(
    "/candidates/:candidateId/analysis/stream",
    {
      schema: {
        params: analysisParamsSchema,
        querystring: analysisStreamQuerySchema.omit({
          candidateIds: true,
        }),
      },
    },
    async (
      request: FastifyRequest<{
        Params: AnalysisParams;
        Querystring: CandidateAnalysisStreamQuery;
      }>,
      reply,
    ) => {
      const abortController = new AbortController();

      request.raw.on("close", () => {
        abortController.abort();
      });

      await startAnalysisStream({
        app,
        logger: request.log,
        reply,
        origin: request.headers.origin,
        candidateIdsQuery: request.params.candidateId,
        jdId: request.query.jdId,
        regenerateScore: request.query.regenerateScore ?? false,
        signal: abortController.signal,
      });
    },
  );
}
