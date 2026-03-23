"use client";

import useSWR from "swr";

import { fetchCandidateDetail, getCandidateDetailKey } from "@/lib/candidates";

export function useCandidateDetail(candidateId: string | null) {
  const key = getCandidateDetailKey(candidateId);

  return useSWR(key, () => fetchCandidateDetail(candidateId ?? ""), {
    revalidateOnFocus: false,
  });
}
