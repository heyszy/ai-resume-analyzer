import { buildApiUrl } from "./api";

export function buildAnalysisStreamUrl(
  candidateIds: string[],
  args?: {
    jdId?: string;
    regenerateScore?: boolean;
  },
) {
  const params = new URLSearchParams();
  params.set("candidateIds", candidateIds.join(","));
  if (args?.jdId) {
    params.set("jdId", args.jdId);
  }
  if (args?.regenerateScore) {
    params.set("regenerateScore", "true");
  }
  return buildApiUrl(`/analysis/stream?${params.toString()}`);
}

export function createAnalysisEventSource(
  candidateIds: string[],
  args?: {
    jdId?: string;
    regenerateScore?: boolean;
  },
) {
  return new EventSource(buildAnalysisStreamUrl(candidateIds, args));
}
