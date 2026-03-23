import type { FastifyBaseLogger } from "fastify";

import type { AppEnv } from "../../env";

import { listCandidatesByIds } from "./repository";
import { runCandidateAnalysis } from "./service";

const ANALYSIS_CONCURRENCY = 2;

type AnalysisStreamEvent = Parameters<Parameters<typeof runCandidateAnalysis>[0]["onEvent"]>[0];

function parseCandidateIds(candidateIds: string) {
  return [
    ...new Set(
      candidateIds
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean),
    ),
  ];
}

async function runWithConcurrency(args: {
  candidateIds: string[];
  concurrency: number;
  signal?: AbortSignal;
  onCandidate: (candidateId: string) => Promise<void>;
}) {
  const queue = [...args.candidateIds];

  async function worker() {
    while (!args.signal?.aborted) {
      const candidateId = queue.shift();
      if (!candidateId) {
        return;
      }

      await args.onCandidate(candidateId);
    }
  }

  const workers = Array.from({ length: Math.min(args.concurrency, args.candidateIds.length) }, () =>
    worker(),
  );

  await Promise.all(workers);
}

export async function runAnalysisStream(args: {
  candidateIdsQuery: string;
  config: AppEnv;
  jdId?: string;
  logger: FastifyBaseLogger;
  regenerateScore: boolean;
  signal?: AbortSignal;
  onEvent: (event: AnalysisStreamEvent) => Promise<void>;
}) {
  const candidateIds = parseCandidateIds(args.candidateIdsQuery);
  if (candidateIds.length === 0) {
    return [];
  }

  const persistedCandidates = await listCandidatesByIds(candidateIds);
  const acceptedCandidateIds = persistedCandidates.map((candidate: { id: string }) => candidate.id);

  await runWithConcurrency({
    candidateIds: acceptedCandidateIds,
    concurrency: ANALYSIS_CONCURRENCY,
    signal: args.signal,
    onCandidate: async (candidateId) => {
      await runCandidateAnalysis({
        candidateId,
        config: args.config,
        jdId: args.jdId,
        logger: args.logger,
        regenerateScore: args.regenerateScore,
        signal: args.signal,
        onEvent: args.onEvent,
      });
    },
  });

  return acceptedCandidateIds;
}
