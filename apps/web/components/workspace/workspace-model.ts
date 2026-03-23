import type {
  candidateDetailSchema,
  candidateProcessingStatusSchema,
  candidateScoreSchema,
  candidateStatusSchema,
  candidateSummarySchema,
  jobDescriptionSchema,
} from "@ai-resume-analyzer/shared";
import type { z } from "zod";

export type WorkspaceCandidateSummary = z.infer<typeof candidateSummarySchema> & {
  previewUrl?: string | null;
};

export type WorkspaceCandidate = z.infer<typeof candidateDetailSchema> & {
  previewUrl?: string | null;
};

type WorkspaceCandidateProfile = NonNullable<WorkspaceCandidate["profile"]>;

export type WorkspaceCandidateProfilePatch = {
  basicInfo?: Partial<WorkspaceCandidateProfile["basicInfo"]>;
  educationHistory?: WorkspaceCandidateProfile["educationHistory"];
  workExperiences?: WorkspaceCandidateProfile["workExperiences"];
  skillTags?: WorkspaceCandidateProfile["skillTags"];
  projectExperiences?: WorkspaceCandidateProfile["projectExperiences"];
  sourceText?: string;
  cleanedText?: string;
  extractionNotes?: string;
  extractedAt?: string;
};

export type WorkspaceCandidatePatch = Partial<Omit<WorkspaceCandidate, "profile">> & {
  profile?: WorkspaceCandidateProfilePatch | null;
};

export type WorkspaceJd = z.infer<typeof jobDescriptionSchema>;
export type WorkspaceScore = z.infer<typeof candidateScoreSchema>;
export type WorkspaceCandidateStatus = z.infer<typeof candidateStatusSchema>;
export type WorkspaceProcessingStatus = z.infer<typeof candidateProcessingStatusSchema>;

const candidateStatusLabelMap: Record<WorkspaceCandidateStatus, string> = {
  pending_review: "待筛选",
  screening_passed: "初筛通过",
  interviewing: "面试中",
  hired: "已录用",
  rejected: "已淘汰",
};

const processingStatusLabelMap: Record<WorkspaceProcessingStatus, string> = {
  uploaded: "已上传",
  parsing: "解析中",
  extracting: "提取中",
  scoring: "评分中",
  ready: "已完成",
  failed: "处理失败",
};

export function getCandidateStatusLabel(status: WorkspaceCandidateStatus) {
  return candidateStatusLabelMap[status];
}

export function getProcessingStatusLabel(status: WorkspaceProcessingStatus) {
  return processingStatusLabelMap[status];
}

export function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function buildUploadedCandidate(args: {
  candidateId: string;
  file: File;
  uploadedAt: string;
  processingStatus: WorkspaceProcessingStatus;
  originalFilePath?: string;
  previewUrl: string;
}): WorkspaceCandidate {
  const displayName = args.file.name.replace(/\.pdf$/i, "") || "新候选人";

  // 上传完成后先生成一个最小可展示的候选人实体，等待后端解析结果回填。
  return {
    id: args.candidateId,
    displayName,
    email: null,
    phone: null,
    city: null,
    skillTags: [],
    status: "pending_review",
    processingStatus: args.processingStatus,
    processingErrorCode: null,
    processingErrorMessage: null,
    uploadedAt: args.uploadedAt,
    updatedAt: args.uploadedAt,
    currentScore: null,
    originalFileName: args.file.name,
    originalFilePath: args.originalFilePath ?? args.previewUrl,
    mimeType: args.file.type || "application/pdf",
    fileSize: args.file.size,
    pageCount: 0,
    profile: null,
    rawText: null,
    cleanedText: null,
    scores: [],
    previewUrl: args.previewUrl,
  };
}

export function mergeCandidateProfile(
  base: WorkspaceCandidate["profile"] | null | undefined,
  patch: WorkspaceCandidateProfilePatch | null | undefined,
) {
  if (typeof patch === "undefined") {
    return base ?? null;
  }

  if (patch === null) {
    return null;
  }

  if (!base) {
    const seed = createEmptyProfile();

    return {
      ...seed,
      ...patch,
      basicInfo: {
        ...seed.basicInfo,
        ...patch.basicInfo,
      },
      educationHistory:
        typeof patch.educationHistory === "undefined"
          ? seed.educationHistory
          : patch.educationHistory,
      workExperiences:
        typeof patch.workExperiences === "undefined" ? seed.workExperiences : patch.workExperiences,
      skillTags: typeof patch.skillTags === "undefined" ? seed.skillTags : patch.skillTags,
      projectExperiences:
        typeof patch.projectExperiences === "undefined"
          ? seed.projectExperiences
          : patch.projectExperiences,
      sourceText: typeof patch.sourceText === "undefined" ? seed.sourceText : patch.sourceText,
      cleanedText: typeof patch.cleanedText === "undefined" ? seed.cleanedText : patch.cleanedText,
      extractionNotes:
        typeof patch.extractionNotes === "undefined" ? seed.extractionNotes : patch.extractionNotes,
      extractedAt: typeof patch.extractedAt === "undefined" ? seed.extractedAt : patch.extractedAt,
    };
  }

  return {
    ...base,
    ...patch,
    basicInfo: {
      ...base.basicInfo,
      ...patch.basicInfo,
    },
    educationHistory:
      typeof patch.educationHistory === "undefined"
        ? base.educationHistory
        : patch.educationHistory,
    workExperiences:
      typeof patch.workExperiences === "undefined" ? base.workExperiences : patch.workExperiences,
    skillTags: typeof patch.skillTags === "undefined" ? base.skillTags : patch.skillTags,
    projectExperiences:
      typeof patch.projectExperiences === "undefined"
        ? base.projectExperiences
        : patch.projectExperiences,
    sourceText: typeof patch.sourceText === "undefined" ? base.sourceText : patch.sourceText,
    cleanedText: typeof patch.cleanedText === "undefined" ? base.cleanedText : patch.cleanedText,
    extractionNotes:
      typeof patch.extractionNotes === "undefined" ? base.extractionNotes : patch.extractionNotes,
    extractedAt: typeof patch.extractedAt === "undefined" ? base.extractedAt : patch.extractedAt,
  };
}

function createEmptyProfile() {
  return {
    basicInfo: {
      name: null,
      phone: null,
      email: null,
      city: null,
    },
    educationHistory: [],
    workExperiences: [],
    skillTags: [],
    projectExperiences: [],
    sourceText: "",
    cleanedText: "",
    extractionNotes: "",
    extractedAt: undefined,
  };
}

export function mergeCandidateView<T extends WorkspaceCandidate | WorkspaceCandidateSummary>(
  base: T,
  patch?: WorkspaceCandidatePatch,
) {
  if (!patch) {
    return base;
  }

  return {
    ...base,
    ...patch,
    previewUrl: patch.previewUrl ?? base.previewUrl ?? null,
    profile: mergeCandidateProfile("profile" in base ? base.profile : null, patch.profile),
  } as T;
}
