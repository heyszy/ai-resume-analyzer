"use client";

import useSWR from "swr";

import { fetchJds, getJdListKey, type JdListQuery } from "@/lib/jds";

export function useJds(query: JdListQuery) {
  const key = getJdListKey(query);

  return useSWR(key, () => fetchJds(query), {
    keepPreviousData: true,
    revalidateOnFocus: false,
  });
}
