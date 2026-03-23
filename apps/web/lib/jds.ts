import {
  jobDescriptionCreateResponseSchema,
  jobDescriptionDeleteResponseSchema,
  type jobDescriptionInputSchema,
  jobDescriptionListResponseSchema,
  type jobDescriptionUpdateBodySchema,
  jobDescriptionUpdateResponseSchema,
} from "@ai-resume-analyzer/shared";
import type { z } from "zod";

import { buildApiUrl, parseJson, readApiErrorMessage } from "./api";

export type JdListQuery = {
  keyword?: string;
  page: number;
  pageSize: number;
  sortBy?: "createdAt" | "updatedAt" | "title";
  sortOrder?: "asc" | "desc";
};

export type JdListResponse = z.infer<typeof jobDescriptionListResponseSchema>;
export type JdInput = z.infer<typeof jobDescriptionInputSchema>;
export type JdUpdateBody = z.infer<typeof jobDescriptionUpdateBodySchema>;
export type JdRecord = z.infer<typeof jobDescriptionCreateResponseSchema>;

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

function buildQueryString(query: JdListQuery) {
  const params = new URLSearchParams();
  appendSearchParam(params, "keyword", query.keyword?.trim() || undefined);
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

export async function fetchJds(query: JdListQuery): Promise<JdListResponse> {
  const response = await fetch(buildApiUrl(`/jds?${buildQueryString(query)}`), {
    cache: "no-store",
  });
  const payload = await readJsonResponse(response);

  if (!response.ok) {
    throw new Error(readApiErrorMessage(payload, `获取职位列表失败，状态码 ${response.status}`));
  }

  return jobDescriptionListResponseSchema.parse(payload);
}

export async function createJd(input: JdInput): Promise<JdRecord> {
  const response = await fetch(buildApiUrl("/jds"), {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(input),
  });
  const payload = await readJsonResponse(response);

  if (!response.ok) {
    throw new Error(readApiErrorMessage(payload, `创建职位失败，状态码 ${response.status}`));
  }

  return jobDescriptionCreateResponseSchema.parse(payload);
}

export async function updateJd(jdId: string, body: JdUpdateBody): Promise<JdRecord> {
  const response = await fetch(buildApiUrl(`/jds/${jdId}`), {
    method: "PATCH",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const payload = await readJsonResponse(response);

  if (!response.ok) {
    throw new Error(readApiErrorMessage(payload, `更新职位失败，状态码 ${response.status}`));
  }

  return jobDescriptionUpdateResponseSchema.parse(payload);
}

export async function deleteJd(jdId: string): Promise<JdRecord> {
  const response = await fetch(buildApiUrl(`/jds/${jdId}`), {
    method: "DELETE",
  });
  const payload = await readJsonResponse(response);

  if (!response.ok) {
    throw new Error(readApiErrorMessage(payload, `删除职位失败，状态码 ${response.status}`));
  }

  return jobDescriptionDeleteResponseSchema.parse(payload);
}

export function getJdListKey(query: JdListQuery) {
  return [
    "jds",
    query.page,
    query.pageSize,
    query.keyword?.trim() ?? "",
    query.sortBy ?? "updatedAt",
    query.sortOrder ?? "desc",
  ] as const;
}
