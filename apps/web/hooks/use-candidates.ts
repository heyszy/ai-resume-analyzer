"use client";

import useSWR from "swr";

import { type CandidateListQuery, fetchCandidates, getCandidateListKey } from "@/lib/candidates";

export function useCandidates(query: CandidateListQuery) {
  const key = getCandidateListKey(query);

  return useSWR(key, () => fetchCandidates(query), {
    keepPreviousData: true,
    revalidateOnFocus: false,
  });
}
