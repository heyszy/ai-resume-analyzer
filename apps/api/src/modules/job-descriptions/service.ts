import {
  deleteJobDescriptionRecord,
  getJobDescriptionRecord,
  insertJobDescriptionRecord,
  listJobDescriptionRecords,
  updateJobDescriptionRecord,
} from "./repository";
import type {
  JobDescription,
  JobDescriptionCreateInput,
  JobDescriptionListQuery,
  JobDescriptionRow,
  JobDescriptionUpdateBody,
} from "./types";

function mapJobDescriptionRecord(record: JobDescriptionRow): JobDescription {
  return {
    id: record.id,
    title: record.title,
    description: record.description,
    requiredSkills: record.requiredSkills,
    bonusSkills: record.bonusSkills,
    isActive: record.isActive,
    status: record.isActive ? "active" : "archived",
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}

function compareDates(left: string, right: string, order: "asc" | "desc") {
  const delta = new Date(left).getTime() - new Date(right).getTime();
  return order === "asc" ? delta : -delta;
}

function compareStrings(left: string, right: string, order: "asc" | "desc") {
  const delta = left.localeCompare(right, "zh-CN");
  return order === "asc" ? delta : -delta;
}

function sortJobDescriptions(items: JobDescription[], query: JobDescriptionListQuery) {
  const order = query.sortOrder;

  return [...items].sort((left, right) => {
    if (query.sortBy === "title") {
      return compareStrings(left.title, right.title, order);
    }

    if (query.sortBy === "updatedAt") {
      return compareDates(left.updatedAt, right.updatedAt, order);
    }

    return compareDates(left.createdAt, right.createdAt, order);
  });
}

export async function getJobDescriptionList(query: JobDescriptionListQuery) {
  const rows = await listJobDescriptionRecords({
    keyword: query.keyword,
    status: query.status,
  });

  const items = sortJobDescriptions(rows.map(mapJobDescriptionRecord), query);
  const start = (query.page - 1) * query.pageSize;

  // 先在服务层完成排序和分页，仓库只负责基础查询。
  return {
    items: items.slice(start, start + query.pageSize),
    page: query.page,
    pageSize: query.pageSize,
    total: items.length,
  };
}

export async function getJobDescriptionDetail(jdId: string) {
  const record = await getJobDescriptionRecord(jdId);
  return record ? mapJobDescriptionRecord(record) : null;
}

export async function createJobDescription(input: JobDescriptionCreateInput) {
  const record = await insertJobDescriptionRecord({
    title: input.title,
    description: input.description,
    requiredSkills: input.requiredSkills,
    bonusSkills: input.bonusSkills,
    isActive: input.isActive,
  });

  return record ? mapJobDescriptionRecord(record) : null;
}

export async function updateJobDescription(jdId: string, patch: JobDescriptionUpdateBody) {
  const record = await updateJobDescriptionRecord(jdId, patch);
  return record ? mapJobDescriptionRecord(record) : null;
}

export async function deleteJobDescription(jdId: string) {
  const record = await deleteJobDescriptionRecord(jdId);
  return record ? mapJobDescriptionRecord(record) : null;
}
