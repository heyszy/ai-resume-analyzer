import {
  candidateDetailSchema,
  candidateListResponseSchema,
  type candidateStatusSchema,
  candidateStatusUpdateResponseSchema,
  type candidateSummarySchema,
} from "@ai-resume-analyzer/shared";
import type { z } from "zod";

import { buildApiUrl, parseJson, readApiErrorMessage } from "./api";

export type CandidateListQuery = {
  keyword?: string;
  jdId?: string;
  status?: CandidateStatus[];
  page: number;
  pageSize: number;
  sortBy?: "score" | "uploadedAt" | "updatedAt" | "name";
  sortOrder?: "asc" | "desc";
};

export type CandidateListResponse = z.infer<typeof candidateListResponseSchema>;
export type CandidateSummary = z.infer<typeof candidateSummarySchema>;
export type CandidateDetail = z.infer<typeof candidateDetailSchema>;
export type CandidateStatus = z.infer<typeof candidateStatusSchema>;

function appendSearchParam(
  params: URLSearchParams,
  key: string,
  value: string | number | undefined,
) {
  if (typeof value === "undefined") {
    return;
  }

  params.set(key, String(value));
}

function buildQueryString(query: CandidateListQuery) {
  const params = new URLSearchParams();
  appendSearchParam(params, "keyword", query.keyword?.trim() || undefined);
  appendSearchParam(params, "jdId", query.jdId);
  for (const status of query.status ?? []) {
    params.append("status", status);
  }
  appendSearchParam(params, "page", query.page);
  appendSearchParam(params, "pageSize", query.pageSize);
  appendSearchParam(params, "sortBy", query.sortBy);
  appendSearchParam(params, "sortOrder", query.sortOrder);
  return params.toString();
}

async function readJsonResponse(response: Response) {
  const text = await response.text();
  return text.length > 0 ? parseJson(text) : undefined;
}

export async function fetchCandidates(query: CandidateListQuery): Promise<CandidateListResponse> {
  const response = await fetch(buildApiUrl(`/candidates?${buildQueryString(query)}`), {
    cache: "no-store",
  });
  const payload = await readJsonResponse(response);

  if (!response.ok) {
    throw new Error(readApiErrorMessage(payload, `获取候选人列表失败，状态码 ${response.status}`));
  }

  return candidateListResponseSchema.parse(payload);
}

export async function fetchCandidateDetail(candidateId: string): Promise<CandidateDetail> {
  const response = await fetch(buildApiUrl(`/candidates/${candidateId}`), {
    cache: "no-store",
  });
  const payload = await readJsonResponse(response);

  if (!response.ok) {
    throw new Error(readApiErrorMessage(payload, `获取候选人详情失败，状态码 ${response.status}`));
  }

  return candidateDetailSchema.parse(payload);
}

export async function deleteCandidate(candidateId: string) {
  const response = await fetch(buildApiUrl(`/candidates/${candidateId}`), {
    method: "DELETE",
  });
  const payload = await readJsonResponse(response);

  if (!response.ok) {
    throw new Error(readApiErrorMessage(payload, `删除候选人失败，状态码 ${response.status}`));
  }
}

export async function updateCandidateStatus(candidateId: string, status: CandidateStatus) {
  const response = await fetch(buildApiUrl(`/candidates/${candidateId}/status`), {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ status }),
  });
  const payload = await readJsonResponse(response);

  if (!response.ok) {
    throw new Error(readApiErrorMessage(payload, `更新候选人状态失败，状态码 ${response.status}`));
  }

  return candidateStatusUpdateResponseSchema.parse(payload);
}

export function getCandidateFileUrl(candidateId: string) {
  return buildApiUrl(`/candidates/${candidateId}/file`);
}

export function getCandidateListKey(query: CandidateListQuery) {
  return [
    "candidates",
    query.page,
    query.pageSize,
    query.keyword?.trim() ?? "",
    query.jdId ?? "",
    (query.status ?? []).join(","),
    query.sortBy ?? "uploadedAt",
    query.sortOrder ?? "desc",
  ] as const;
}

export function getCandidateDetailKey(candidateId: string | null) {
  return candidateId ? (["candidate", candidateId] as const) : null;
}
