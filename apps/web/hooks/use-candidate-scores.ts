"use client";

import useSWR from "swr";

import { fetchCandidateScores, getCandidateScoresKey } from "@/lib/candidates";

export function useCandidateScores(candidateId: string | null, jdId: string | null) {
  const key = getCandidateScoresKey(candidateId, jdId);

  return useSWR(key, () => fetchCandidateScores(candidateId ?? "", jdId ?? undefined), {
    keepPreviousData: true,
    revalidateOnFocus: false,
  });
}
