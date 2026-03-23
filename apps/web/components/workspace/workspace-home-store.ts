"use client";

import { create } from "zustand";
import type { WorkspaceCandidateStatus } from "./workspace-model";

type CandidateStatusFilter = WorkspaceCandidateStatus | "all";

type WorkspaceHomeState = {
  activeJdId: string | null;
  selectedCandidateId: string | null;
  searchKeyword: string;
  candidateSortKey: "uploadedAt" | "name" | "score";
  candidateStatusFilter: CandidateStatusFilter;
  currentPage: number;
  pageSize: number;
  isUploadPanelOpen: boolean;
  isCandidateTableOpen: boolean;
  selectActiveJd: (jdId: string | null) => void;
  selectCandidate: (candidateId: string | null) => void;
  setSearchKeyword: (value: string) => void;
  setCandidateSortKey: (sortKey: "uploadedAt" | "name" | "score") => void;
  setCandidateStatusFilter: (status: CandidateStatusFilter) => void;
  setCurrentPage: (page: number) => void;
  setPageSize: (pageSize: number) => void;
  setUploadPanelOpen: (isOpen: boolean) => void;
  setCandidateTableOpen: (isOpen: boolean) => void;
};

export const useWorkspaceHomeStore = create<WorkspaceHomeState>((set) => ({
  activeJdId: null,
  selectedCandidateId: null,
  searchKeyword: "",
  candidateSortKey: "uploadedAt",
  candidateStatusFilter: "all",
  currentPage: 1,
  pageSize: 10,
  isUploadPanelOpen: false,
  isCandidateTableOpen: false,
  selectActiveJd: (jdId) => set({ activeJdId: jdId }),
  selectCandidate: (candidateId) => set({ selectedCandidateId: candidateId }),
  setSearchKeyword: (value) =>
    set({
      searchKeyword: value,
      currentPage: 1,
    }),
  setCandidateSortKey: (sortKey) =>
    set({
      candidateSortKey: sortKey,
      currentPage: 1,
    }),
  setCandidateStatusFilter: (status) =>
    set({
      candidateStatusFilter: status,
      currentPage: 1,
    }),
  setCurrentPage: (page) => set({ currentPage: Math.max(1, page) }),
  setPageSize: (pageSize) =>
    set({
      pageSize: Math.max(1, pageSize),
      currentPage: 1,
    }),
  setUploadPanelOpen: (isOpen) => set({ isUploadPanelOpen: isOpen }),
  setCandidateTableOpen: (isOpen) => set({ isCandidateTableOpen: isOpen }),
}));
