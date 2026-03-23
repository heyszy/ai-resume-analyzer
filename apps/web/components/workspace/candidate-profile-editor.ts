import type { CandidateProfileUpdateInput } from "@/lib/candidates";

import type {
  WorkspaceCandidate,
  WorkspaceCandidatePatch,
  WorkspaceCandidateSummary,
} from "./workspace-model";

type CandidateProfile = NonNullable<WorkspaceCandidate["profile"]>;
type DraftItemId = {
  tempId: string;
};
type CandidateProfileEditorEducationItem = CandidateProfile["educationHistory"][number] &
  DraftItemId;
type CandidateProfileEditorWorkItem = CandidateProfile["workExperiences"][number] & DraftItemId;
type CandidateProfileEditorProjectItem = CandidateProfile["projectExperiences"][number] &
  DraftItemId;
type CandidateProfileEditableCandidate = Pick<
  WorkspaceCandidateSummary,
  "displayName" | "phone" | "email" | "city" | "skillTags"
> & {
  profile?: WorkspaceCandidate["profile"] | null;
};

export type CandidateProfileEditorDraft = {
  basicInfo: CandidateProfile["basicInfo"];
  educationHistory: CandidateProfileEditorEducationItem[];
  workExperiences: CandidateProfileEditorWorkItem[];
  skillTagsText: string;
  projectExperiences: CandidateProfileEditorProjectItem[];
  extractionNotes: string;
};

export function createCandidateProfileEditorDraft(candidate: CandidateProfileEditableCandidate) {
  const profile = candidate.profile;

  return {
    basicInfo: {
      name: profile?.basicInfo.name ?? candidate.displayName ?? null,
      phone: profile?.basicInfo.phone ?? candidate.phone ?? null,
      email: profile?.basicInfo.email ?? candidate.email ?? null,
      city: profile?.basicInfo.city ?? candidate.city ?? null,
    },
    educationHistory: (profile?.educationHistory ?? []).map((item) => ({
      ...item,
      tempId: createDraftItemId(),
    })),
    workExperiences: (profile?.workExperiences ?? []).map((item) => ({
      ...item,
      tempId: createDraftItemId(),
    })),
    skillTagsText: (profile?.skillTags ?? candidate.skillTags ?? []).join("\n"),
    projectExperiences: (profile?.projectExperiences ?? []).map((item) => ({
      ...item,
      tempId: createDraftItemId(),
    })),
    extractionNotes: profile?.extractionNotes ?? "",
  };
}

export function buildCandidateProfileUpdateInput(
  draft: CandidateProfileEditorDraft,
): CandidateProfileUpdateInput {
  return {
    basicInfo: {
      name: normalizeNullableText(draft.basicInfo.name),
      phone: normalizeNullableText(draft.basicInfo.phone),
      email: normalizeNullableEmail(draft.basicInfo.email),
      city: normalizeNullableText(draft.basicInfo.city),
    },
    educationHistory: draft.educationHistory.map(({ tempId: _, ...item }) => ({
      school: normalizeNullableText(item.school),
      major: normalizeNullableText(item.major),
      degree: normalizeNullableText(item.degree),
      graduationTime: normalizeNullableText(item.graduationTime),
    })),
    workExperiences: draft.workExperiences.map(({ tempId: _, ...item }) => ({
      companyName: normalizeNullableText(item.companyName),
      position: normalizeNullableText(item.position),
      timeRange: normalizeNullableText(item.timeRange),
      summary: normalizeNullableText(item.summary),
    })),
    skillTags: normalizeTagText(draft.skillTagsText),
    projectExperiences: draft.projectExperiences.map(({ tempId: _, ...item }) => ({
      projectName: normalizeNullableText(item.projectName),
      techStack: normalizeTagText(item.techStack.join("\n")),
      responsibilities: normalizeTagText(item.responsibilities.join("\n")),
      highlights: normalizeTagText(item.highlights.join("\n")),
    })),
    extractionNotes: draft.extractionNotes.trim(),
  };
}

export function mapProfileResponseToCandidatePatch(
  profile: CandidateProfile,
  updatedAt: string,
): WorkspaceCandidatePatch {
  return {
    displayName: profile.basicInfo.name ?? "未命名候选人",
    email: profile.basicInfo.email,
    phone: profile.basicInfo.phone,
    city: profile.basicInfo.city,
    skillTags: profile.skillTags,
    profile,
    rawText: profile.sourceText || null,
    cleanedText: profile.cleanedText || null,
    updatedAt,
  };
}

export function createEmptyEducationItem(): CandidateProfileEditorEducationItem {
  return {
    tempId: createDraftItemId(),
    school: null,
    major: null,
    degree: null,
    graduationTime: null,
  };
}

export function createEmptyWorkExperienceItem(): CandidateProfileEditorWorkItem {
  return {
    tempId: createDraftItemId(),
    companyName: null,
    position: null,
    timeRange: null,
    summary: null,
  };
}

export function createEmptyProjectExperienceItem(): CandidateProfileEditorProjectItem {
  return {
    tempId: createDraftItemId(),
    projectName: null,
    techStack: [],
    responsibilities: [],
    highlights: [],
  };
}

function normalizeNullableText(value: string | null | undefined) {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

function normalizeNullableEmail(value: string | null | undefined) {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

function createDraftItemId() {
  return crypto.randomUUID();
}

// 统一兼容换行、中文逗号和英文逗号输入。
function normalizeTagText(value: string) {
  return value
    .split(/[\n,，]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}
