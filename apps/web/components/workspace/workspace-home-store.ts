"use client";

import { create } from "zustand";

import type { WorkspaceJd } from "./workspace-model";

type WorkspaceJdDraft = Pick<
  WorkspaceJd,
  "title" | "description" | "requiredSkills" | "bonusSkills"
>;

type WorkspaceHomeState = {
  jds: WorkspaceJd[];
  activeJdId: string | null;
  selectedCandidateId: string | null;
  searchKeyword: string;
  currentPage: number;
  pageSize: number;
  isUploadPanelOpen: boolean;
  selectActiveJd: (jdId: string) => void;
  createJd: (draft: WorkspaceJdDraft) => void;
  updateJd: (jdId: string, draft: WorkspaceJdDraft) => void;
  deleteJd: (jdId: string) => void;
  selectCandidate: (candidateId: string | null) => void;
  setSearchKeyword: (value: string) => void;
  setCurrentPage: (page: number) => void;
  setPageSize: (pageSize: number) => void;
  setUploadPanelOpen: (isOpen: boolean) => void;
};

const initialJds: WorkspaceJd[] = [
  {
    id: "fd133d5e-2487-49ea-8793-55de54e26c95",
    title: "高级前端工程师",
    description:
      "负责招聘工作台与内部业务系统的前端建设，要求具备复杂界面设计、组件化拆分、状态建模和交互体验优化能力。",
    requiredSkills: ["React", "Next.js", "TypeScript", "Tailwind CSS", "组件化设计"],
    bonusSkills: ["SWR", "Zustand", "图表能力", "AI 工作流", "招聘业务理解"],
    isActive: true,
    status: "active",
    createdAt: "2026-03-22T09:00:00+08:00",
    updatedAt: "2026-03-22T09:00:00+08:00",
  },
  {
    id: "6c99f203-c087-4585-a0ed-ac869b670229",
    title: "平台产品工程师",
    description:
      "负责平台配置体验和产品协作工具建设，要求具备复杂表单、数据建模和 B 端产品理解能力。",
    requiredSkills: ["React", "TypeScript", "B 端产品", "数据建模"],
    bonusSkills: ["实验平台", "埋点分析", "可视化", "流程设计"],
    isActive: false,
    status: "active",
    createdAt: "2026-03-22T09:00:00+08:00",
    updatedAt: "2026-03-22T09:00:00+08:00",
  },
];

export const useWorkspaceHomeStore = create<WorkspaceHomeState>((set) => ({
  jds: initialJds,
  activeJdId: initialJds[0]?.id ?? null,
  selectedCandidateId: null,
  searchKeyword: "",
  currentPage: 1,
  pageSize: 10,
  isUploadPanelOpen: false,
  selectActiveJd: (jdId) =>
    set((state) => ({
      activeJdId: jdId,
      jds: state.jds.map((jd) => ({
        ...jd,
        isActive: jd.id === jdId,
      })),
    })),
  createJd: (draft) =>
    set((state) => {
      const now = new Date().toISOString();
      const nextJd: WorkspaceJd = {
        id: crypto.randomUUID(),
        title: draft.title,
        description: draft.description,
        requiredSkills: draft.requiredSkills,
        bonusSkills: draft.bonusSkills,
        isActive: true,
        status: "active",
        createdAt: now,
        updatedAt: now,
      };

      return {
        activeJdId: nextJd.id,
        jds: [nextJd, ...state.jds.map((jd) => ({ ...jd, isActive: false }))],
      };
    }),
  updateJd: (jdId, draft) =>
    set((state) => ({
      jds: state.jds.map((jd) =>
        jd.id === jdId
          ? {
              ...jd,
              ...draft,
              updatedAt: new Date().toISOString(),
            }
          : jd,
      ),
    })),
  deleteJd: (jdId) =>
    set((state) => {
      const nextJds = state.jds.filter((jd) => jd.id !== jdId);
      const nextActiveJdId =
        state.activeJdId === jdId ? (nextJds[0]?.id ?? null) : state.activeJdId;

      return {
        activeJdId: nextActiveJdId,
        jds: nextJds.map((jd) => ({
          ...jd,
          isActive: jd.id === nextActiveJdId,
        })),
      };
    }),
  selectCandidate: (candidateId) => set({ selectedCandidateId: candidateId }),
  setSearchKeyword: (value) =>
    set((state) => ({
      searchKeyword: value,
      currentPage: value.trim().length > 0 ? 1 : state.currentPage,
    })),
  setCurrentPage: (page) => set({ currentPage: Math.max(1, page) }),
  setPageSize: (pageSize) =>
    set({
      pageSize: Math.max(1, pageSize),
      currentPage: 1,
    }),
  setUploadPanelOpen: (isOpen) => set({ isUploadPanelOpen: isOpen }),
}));
