"use client";

import {
  analysisDoneEventSchema,
  analysisErrorEventSchema,
  analysisProgressEventSchema,
  analysisResumeFinalEventSchema,
  analysisResumePartialEventSchema,
  analysisScoreFinalEventSchema,
  analysisScorePartialEventSchema,
  analysisStreamEventSchema,
} from "@ai-resume-analyzer/shared";
import { useEffect, useMemo, useRef, useState } from "react";
import type { z } from "zod";

import { createAnalysisEventSource } from "@/lib/analysis-stream";

export type AnalysisStreamStatus = "idle" | "connecting" | "open" | "closed" | "error";

type AnalysisStreamHandlers = {
  onProgress?: (event: z.infer<typeof analysisProgressEventSchema>) => void;
  onResumePartial?: (event: z.infer<typeof analysisResumePartialEventSchema>) => void;
  onResumeFinal?: (event: z.infer<typeof analysisResumeFinalEventSchema>) => void;
  onScorePartial?: (event: z.infer<typeof analysisScorePartialEventSchema>) => void;
  onScoreFinal?: (event: z.infer<typeof analysisScoreFinalEventSchema>) => void;
  onErrorEvent?: (event: z.infer<typeof analysisErrorEventSchema>) => void;
  onDone?: (event: z.infer<typeof analysisDoneEventSchema>) => void;
  onConnectionError?: () => void;
  onAllDone?: () => void;
};

type UseAnalysisStreamArgs = AnalysisStreamHandlers & {
  candidateIds: string[];
  enabled?: boolean;
  jdId?: string;
  regenerateScore?: boolean;
};

export function useAnalysisStream({
  candidateIds,
  enabled = true,
  jdId,
  onProgress,
  onResumePartial,
  onResumeFinal,
  onScorePartial,
  onScoreFinal,
  onErrorEvent,
  onDone,
  onConnectionError,
  onAllDone,
  regenerateScore = false,
}: UseAnalysisStreamArgs) {
  const [status, setStatus] = useState<AnalysisStreamStatus>("idle");
  const handlersRef = useRef<AnalysisStreamHandlers>({
    onProgress,
    onResumePartial,
    onResumeFinal,
    onScorePartial,
    onScoreFinal,
    onErrorEvent,
    onDone,
    onConnectionError,
    onAllDone,
  });
  const completedIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    handlersRef.current = {
      onProgress,
      onResumePartial,
      onResumeFinal,
      onScorePartial,
      onScoreFinal,
      onErrorEvent,
      onDone,
      onConnectionError,
      onAllDone,
    };
  }, [
    onProgress,
    onResumePartial,
    onResumeFinal,
    onScorePartial,
    onScoreFinal,
    onErrorEvent,
    onDone,
    onConnectionError,
    onAllDone,
  ]);

  const candidateIdsKey = useMemo(() => {
    return candidateIds
      .map((item) => item.trim())
      .filter(Boolean)
      .join(",");
  }, [candidateIds]);
  const normalizedCandidateIds = useMemo(() => {
    return Array.from(new Set(candidateIdsKey.split(",").filter(Boolean)));
  }, [candidateIdsKey]);

  useEffect(() => {
    if (!enabled || normalizedCandidateIds.length === 0) {
      setStatus("idle");
      completedIdsRef.current = new Set();
      return undefined;
    }

    const source = createAnalysisEventSource(normalizedCandidateIds, {
      jdId,
      regenerateScore,
    });
    completedIdsRef.current = new Set();
    setStatus("connecting");

    const handleRawEvent = (event: MessageEvent<string>) => {
      let payload: unknown;

      try {
        payload = JSON.parse(event.data);
      } catch {
        return;
      }

      const parsed = analysisStreamEventSchema.safeParse(payload);

      if (!parsed.success) {
        return;
      }

      const eventPayload = parsed.data;

      switch (eventPayload.type) {
        case "progress":
          handlersRef.current.onProgress?.(analysisProgressEventSchema.parse(eventPayload));
          break;
        case "resume.partial":
          handlersRef.current.onResumePartial?.(
            analysisResumePartialEventSchema.parse(eventPayload),
          );
          break;
        case "resume.final":
          handlersRef.current.onResumeFinal?.(analysisResumeFinalEventSchema.parse(eventPayload));
          break;
        case "score.partial":
          handlersRef.current.onScorePartial?.(analysisScorePartialEventSchema.parse(eventPayload));
          break;
        case "score.final":
          handlersRef.current.onScoreFinal?.(analysisScoreFinalEventSchema.parse(eventPayload));
          break;
        case "error":
          handlersRef.current.onErrorEvent?.(analysisErrorEventSchema.parse(eventPayload));
          break;
        case "done": {
          const doneEvent = analysisDoneEventSchema.parse(eventPayload);
          completedIdsRef.current.add(doneEvent.candidateId);
          handlersRef.current.onDone?.(doneEvent);

          if (completedIdsRef.current.size >= normalizedCandidateIds.length) {
            handlersRef.current.onAllDone?.();
            source.close();
            setStatus("closed");
          }
          break;
        }
      }
    };

    const handleOpen = () => {
      setStatus("open");
    };

    const handleError = () => {
      if (completedIdsRef.current.size < normalizedCandidateIds.length) {
        setStatus("error");
        handlersRef.current.onConnectionError?.();
      }
    };

    source.addEventListener("open", handleOpen);
    source.addEventListener("progress", handleRawEvent as EventListener);
    source.addEventListener("resume.partial", handleRawEvent as EventListener);
    source.addEventListener("resume.final", handleRawEvent as EventListener);
    source.addEventListener("score.partial", handleRawEvent as EventListener);
    source.addEventListener("score.final", handleRawEvent as EventListener);
    source.addEventListener("error", handleRawEvent as EventListener);
    source.addEventListener("done", handleRawEvent as EventListener);
    source.addEventListener("message", handleRawEvent as EventListener);
    source.onerror = handleError;

    return () => {
      source.removeEventListener("open", handleOpen);
      source.removeEventListener("progress", handleRawEvent as EventListener);
      source.removeEventListener("resume.partial", handleRawEvent as EventListener);
      source.removeEventListener("resume.final", handleRawEvent as EventListener);
      source.removeEventListener("score.partial", handleRawEvent as EventListener);
      source.removeEventListener("score.final", handleRawEvent as EventListener);
      source.removeEventListener("error", handleRawEvent as EventListener);
      source.removeEventListener("done", handleRawEvent as EventListener);
      source.removeEventListener("message", handleRawEvent as EventListener);
      source.close();
      setStatus("closed");
    };
  }, [enabled, jdId, normalizedCandidateIds, regenerateScore]);

  return { status, candidateIds: normalizedCandidateIds };
}
