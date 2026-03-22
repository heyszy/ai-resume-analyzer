"use client";

import { LayoutPanelLeft } from "lucide-react";
import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { useAnalysisStream } from "@/hooks/use-analysis-stream";
import { useCandidateDetail } from "@/hooks/use-candidate-detail";
import { useCandidates } from "@/hooks/use-candidates";
import { useJds } from "@/hooks/use-jds";
import {
  type CandidateListResponse,
  deleteCandidate as deleteCandidateRequest,
  getCandidateDetailKey,
  updateCandidateStatus as updateCandidateStatusRequest,
} from "@/lib/candidates";
import {
  createJd as createJdRequest,
  deleteJd as deleteJdRequest,
  updateJd as updateJdRequest,
} from "@/lib/jds";
import { CandidateDetailPanel } from "./candidate-detail-panel";
import { CandidateListPanel } from "./candidate-list-panel";
import { CandidateTableDialog } from "./candidate-table-dialog";
import { JdPanel } from "./jd-panel";
import { useWorkspaceHomeStore } from "./workspace-home-store";
import {
  mergeCandidateView,
  type WorkspaceCandidate,
  type WorkspaceCandidatePatch,
  type WorkspaceCandidateStatus,
  type WorkspaceJd,
} from "./workspace-model";

export function WorkspaceHome() {
  const activeJdId = useWorkspaceHomeStore((state) => state.activeJdId);
  const selectedCandidateId = useWorkspaceHomeStore((state) => state.selectedCandidateId);
  const searchKeyword = useWorkspaceHomeStore((state) => state.searchKeyword);
  const candidateSortKey = useWorkspaceHomeStore((state) => state.candidateSortKey);
  const candidateStatusFilter = useWorkspaceHomeStore((state) => state.candidateStatusFilter);
  const currentPage = useWorkspaceHomeStore((state) => state.currentPage);
  const pageSize = useWorkspaceHomeStore((state) => state.pageSize);
  const isUploadPanelOpen = useWorkspaceHomeStore((state) => state.isUploadPanelOpen);
  const isCandidateTableOpen = useWorkspaceHomeStore((state) => state.isCandidateTableOpen);
  const selectActiveJd = useWorkspaceHomeStore((state) => state.selectActiveJd);
  const selectCandidate = useWorkspaceHomeStore((state) => state.selectCandidate);
  const setSearchKeyword = useWorkspaceHomeStore((state) => state.setSearchKeyword);
  const setCandidateSortKey = useWorkspaceHomeStore((state) => state.setCandidateSortKey);
  const setCandidateStatusFilter = useWorkspaceHomeStore((state) => state.setCandidateStatusFilter);
  const setCurrentPage = useWorkspaceHomeStore((state) => state.setCurrentPage);
  const setUploadPanelOpen = useWorkspaceHomeStore((state) => state.setUploadPanelOpen);
  const setCandidateTableOpen = useWorkspaceHomeStore((state) => state.setCandidateTableOpen);

  const deferredSearchKeyword = useDeferredValue(searchKeyword);
  const backendSort = useMemo(() => {
    if (candidateSortKey === "name") {
      return {
        sortBy: "name" as const,
        sortOrder: "asc" as const,
      };
    }

    if (candidateSortKey === "score") {
      return {
        sortBy: "score" as const,
        sortOrder: "desc" as const,
      };
    }

    return {
      sortBy: "uploadedAt" as const,
      sortOrder: "desc" as const,
    };
  }, [candidateSortKey]);
  const candidateQuery = useMemo(
    () => ({
      keyword: deferredSearchKeyword.trim() || undefined,
      jdId: activeJdId ?? undefined,
      status: candidateStatusFilter === "all" ? undefined : [candidateStatusFilter],
      page: currentPage,
      pageSize,
      sortBy: backendSort.sortBy,
      sortOrder: backendSort.sortOrder,
    }),
    [
      activeJdId,
      backendSort.sortBy,
      backendSort.sortOrder,
      candidateStatusFilter,
      currentPage,
      deferredSearchKeyword,
      pageSize,
    ],
  );

  const {
    data: candidateList,
    error: candidateListError,
    isLoading: isCandidateListLoading,
    mutate: mutateCandidateList,
  } = useCandidates(candidateQuery);
  const selectedDetailKey = getCandidateDetailKey(selectedCandidateId);
  const {
    data: selectedCandidateDetail,
    error: selectedCandidateDetailError,
    isLoading: isSelectedCandidateDetailLoading,
    mutate: mutateSelectedCandidateDetail,
  } = useCandidateDetail(selectedCandidateId);
  const {
    data: jdList,
    error: jdListError,
    isLoading: isJdListLoading,
    mutate: mutateJdList,
  } = useJds({
    page: 1,
    pageSize: 100,
    sortBy: "updatedAt",
    sortOrder: "desc",
  });

  const [candidateLivePatchById, setCandidateLivePatchById] = useState<
    Record<string, WorkspaceCandidate>
  >({});
  const [analysisCandidateIds, setAnalysisCandidateIds] = useState<string[]>([]);
  const [deletingCandidateId, setDeletingCandidateId] = useState<string | null>(null);
  const [updatingCandidateStatusId, setUpdatingCandidateStatusId] = useState<string | null>(null);
  const jds = jdList?.items ?? [];

  const mergedCandidateList = useMemo(() => {
    const items = candidateList?.items ?? [];

    return items.map((candidate) =>
      mergeCandidateView(candidate, candidateLivePatchById[candidate.id]),
    );
  }, [candidateList?.items, candidateLivePatchById]);

  useEffect(() => {
    if (selectedCandidateId || mergedCandidateList.length === 0) {
      return;
    }

    selectCandidate(mergedCandidateList[0]?.id ?? null);
  }, [mergedCandidateList, selectCandidate, selectedCandidateId]);

  useEffect(() => {
    if (jds.length === 0) {
      if (activeJdId !== null) {
        selectActiveJd(null);
      }
      return;
    }

    const hasSelectedJd = activeJdId ? jds.some((jd) => jd.id === activeJdId) : false;

    if (hasSelectedJd) {
      return;
    }

    const preferredJd = jds.find((jd) => jd.isActive) ?? jds[0] ?? null;

    if (preferredJd) {
      selectActiveJd(preferredJd.id);
    }
  }, [activeJdId, jds, selectActiveJd]);

  const selectedCandidateFromList = mergedCandidateList.find(
    (candidate) => candidate.id === selectedCandidateId,
  );
  const selectedCandidate = useMemo(() => {
    const baseCandidate = selectedCandidateDetail ?? selectedCandidateFromList ?? null;

    if (!baseCandidate) {
      return null;
    }

    return mergeCandidateView(baseCandidate, candidateLivePatchById[baseCandidate.id]);
  }, [candidateLivePatchById, selectedCandidateDetail, selectedCandidateFromList]);
  const activeJd = useMemo(
    () => jds.find((jd) => jd.id === activeJdId) ?? jds.find((jd) => jd.isActive) ?? jds[0] ?? null,
    [activeJdId, jds],
  );

  useAnalysisStream({
    candidateIds: analysisCandidateIds,
    enabled: analysisCandidateIds.length > 0,
    onProgress: (event) => {
      patchCandidate(event.candidateId, {
        processingStatus: event.processingStatus,
        processingErrorMessage: null,
        updatedAt: new Date().toISOString(),
      });
    },
    onResumePartial: (event) => {
      patchCandidate(event.candidateId, {
        processingStatus: "extracting",
        profile: event.profile,
        updatedAt: new Date().toISOString(),
      });
    },
    onResumeFinal: (event) => {
      patchCandidate(event.candidateId, {
        processingStatus: "ready",
        profile: event.profile,
        rawText: event.profile.sourceText || null,
        cleanedText: event.profile.cleanedText || null,
        updatedAt: new Date().toISOString(),
      });
    },
    onErrorEvent: (event) => {
      patchCandidate(event.candidateId, {
        processingStatus: "failed",
        processingErrorMessage: event.message,
        updatedAt: new Date().toISOString(),
      });
    },
    onAllDone: () => {
      setAnalysisCandidateIds([]);
      void mutateCandidateList();
      if (selectedDetailKey) {
        void mutateSelectedCandidateDetail();
      }
    },
  });

  const listErrorMessage = candidateListError instanceof Error ? candidateListError.message : null;
  const detailErrorMessage =
    selectedCandidateDetailError instanceof Error ? selectedCandidateDetailError.message : null;
  const jdErrorMessage = jdListError instanceof Error ? jdListError.message : null;

  function patchCandidate(candidateId: string, patch: WorkspaceCandidatePatch) {
    setCandidateLivePatchById((state) => {
      const previous = state[candidateId];

      if (!previous) {
        return state;
      }

      return {
        ...state,
        [candidateId]: {
          ...previous,
          ...patch,
          profile:
            typeof patch.profile === "undefined"
              ? previous?.profile
              : mergeLiveProfile(
                  previous?.profile,
                  patch.profile as WorkspaceCandidate["profile"] | null | undefined,
                ),
        },
      };
    });
  }

  function handleCandidateCreated(candidate: WorkspaceCandidate) {
    setCandidateLivePatchById((state) => ({
      ...state,
      [candidate.id]: candidate,
    }));
    selectCandidate(candidate.id);

    void mutateCandidateList((current) => upsertCandidateToList(current, candidate), false);
  }

  function handleUploadBatchCompleted(candidates: WorkspaceCandidate[]) {
    setAnalysisCandidateIds(candidates.map((candidate) => candidate.id));

    if (candidates.length > 0) {
      selectCandidate(candidates[0].id);
    }
  }

  function handlePageChange(nextPage: number) {
    setCurrentPage(nextPage);
  }

  async function handleCreateJd(
    draft: Pick<WorkspaceJd, "title" | "description" | "requiredSkills" | "bonusSkills">,
  ) {
    const created = await createJdRequest({
      ...draft,
      isActive: false,
    });

    await mutateJdList();
    // 先等待列表刷新，再切到新建职位，避免被旧列表中的默认选中逻辑覆盖。
    selectActiveJd(created.id);
  }

  async function handleUpdateJd(
    jdId: string,
    draft: Pick<WorkspaceJd, "title" | "description" | "requiredSkills" | "bonusSkills">,
  ) {
    await updateJdRequest(jdId, draft);
    await mutateJdList();
  }

  async function handleDeleteJd(jdId: string) {
    await deleteJdRequest(jdId);

    const remainingJds = jds.filter((jd) => jd.id !== jdId);
    const nextActiveJd = remainingJds.find((jd) => jd.id === activeJdId) ?? remainingJds[0] ?? null;
    selectActiveJd(nextActiveJd?.id ?? null);

    await mutateJdList();
  }

  async function handleDeleteCandidate(candidateId: string) {
    setDeletingCandidateId(candidateId);

    try {
      await deleteCandidateRequest(candidateId);

      setCandidateLivePatchById((state) => {
        if (!(candidateId in state)) {
          return state;
        }

        const nextState = { ...state };
        delete nextState[candidateId];
        return nextState;
      });
      setAnalysisCandidateIds((state) => state.filter((id) => id !== candidateId));

      const remainingCandidates = mergedCandidateList.filter(
        (candidate) => candidate.id !== candidateId,
      );
      if (selectedCandidateId === candidateId) {
        selectCandidate(remainingCandidates[0]?.id ?? null);
      }
      if (remainingCandidates.length === 0 && currentPage > 1) {
        setCurrentPage(currentPage - 1);
      }

      await mutateCandidateList((current) => removeCandidateFromList(current, candidateId), false);

      if (selectedCandidateId === candidateId) {
        await mutateSelectedCandidateDetail(undefined, false);
      }
    } finally {
      setDeletingCandidateId(null);
    }
  }

  async function handleUpdateCandidateStatus(status: WorkspaceCandidateStatus) {
    if (!selectedCandidate) {
      return;
    }

    const candidateId = selectedCandidate.id;
    const previousStatus = selectedCandidate.status;

    if (previousStatus === status) {
      return;
    }

    setUpdatingCandidateStatusId(candidateId);
    patchCandidate(candidateId, {
      status,
      updatedAt: new Date().toISOString(),
    });

    try {
      await updateCandidateStatusRequest(candidateId, status);
      await mutateCandidateList();
      if (selectedDetailKey) {
        await mutateSelectedCandidateDetail();
      }
    } catch {
      patchCandidate(candidateId, {
        status: previousStatus,
      });
    } finally {
      setUpdatingCandidateStatusId((current) => (current === candidateId ? null : current));
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-3">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-slate-950 text-white">
            <LayoutPanelLeft className="size-5" />
          </div>
          <p className="text-sm font-semibold text-slate-950">AI Resume Analyzer</p>
        </div>
      </div>

      <div className="grid gap-3 xl:grid-cols-[300px_minmax(0,1fr)_320px]">
        <CandidateListPanel
          candidates={mergedCandidateList}
          total={candidateList?.total ?? mergedCandidateList.length}
          page={candidateList?.page ?? currentPage}
          pageSize={candidateList?.pageSize ?? pageSize}
          selectedCandidateId={selectedCandidate?.id ?? selectedCandidateId}
          searchKeyword={searchKeyword}
          isUploadPanelOpen={isUploadPanelOpen}
          isCandidateTableOpen={isCandidateTableOpen}
          isLoading={isCandidateListLoading}
          errorMessage={listErrorMessage}
          onSearchChange={setSearchKeyword}
          onSelectCandidate={selectCandidate}
          onPageChange={handlePageChange}
          onUploadPanelOpenChange={setUploadPanelOpen}
          onCandidateTableOpenChange={setCandidateTableOpen}
          onCandidateCreated={handleCandidateCreated}
          onUploadBatchCompleted={handleUploadBatchCompleted}
        />

        <CandidateDetailPanel
          candidate={selectedCandidate}
          isUpdatingStatus={
            Boolean(selectedCandidate) && updatingCandidateStatusId === selectedCandidate?.id
          }
          onStatusChange={handleUpdateCandidateStatus}
          isDeletingCandidate={
            Boolean(selectedCandidate) && deletingCandidateId === selectedCandidate?.id
          }
          onDeleteCandidate={handleDeleteCandidate}
          isLoading={isSelectedCandidateDetailLoading && !selectedCandidate}
          errorMessage={detailErrorMessage}
        />

        <JdPanel
          activeJd={activeJd}
          jds={jds}
          isLoading={isJdListLoading}
          panelErrorMessage={jdErrorMessage}
          onSelectActiveJd={selectActiveJd}
          onCreateJd={handleCreateJd}
          onUpdateJd={handleUpdateJd}
          onDeleteJd={handleDeleteJd}
        />
      </div>

      <CandidateTableDialog
        open={isCandidateTableOpen}
        candidates={mergedCandidateList}
        total={candidateList?.total ?? mergedCandidateList.length}
        page={candidateList?.page ?? currentPage}
        pageSize={candidateList?.pageSize ?? pageSize}
        sortKey={candidateSortKey}
        statusFilter={candidateStatusFilter}
        searchKeyword={searchKeyword}
        deletingCandidateId={deletingCandidateId}
        onOpenChange={setCandidateTableOpen}
        onSortChange={setCandidateSortKey}
        onStatusFilterChange={setCandidateStatusFilter}
        onSearchChange={setSearchKeyword}
        onPageChange={handlePageChange}
        onSelectCandidate={selectCandidate}
        onDeleteCandidate={handleDeleteCandidate}
      />
    </div>
  );
}

function upsertCandidateToList(
  current: CandidateListResponse | undefined,
  candidate: WorkspaceCandidate,
): CandidateListResponse {
  const items = current?.items ?? [];
  const index = items.findIndex((item) => item.id === candidate.id);

  if (index >= 0) {
    return {
      page: current?.page ?? 1,
      pageSize: current?.pageSize ?? 10,
      total: current?.total ?? items.length,
      items: items.map((item) => (item.id === candidate.id ? candidate : item)),
    };
  }

  return {
    page: current?.page ?? 1,
    pageSize: current?.pageSize ?? 10,
    total: (current?.total ?? items.length) + 1,
    items: [candidate, ...items],
  };
}

function removeCandidateFromList(
  current: CandidateListResponse | undefined,
  candidateId: string,
): CandidateListResponse | undefined {
  if (!current) {
    return current;
  }

  const items = current.items.filter((candidate) => candidate.id !== candidateId);
  return {
    ...current,
    items,
    total: Math.max(0, current.total - (items.length === current.items.length ? 0 : 1)),
  };
}

function mergeLiveProfile(
  base: WorkspaceCandidate["profile"] | null | undefined,
  patch: WorkspaceCandidate["profile"] | null | undefined,
) {
  if (typeof patch === "undefined") {
    return base ?? null;
  }

  if (patch === null) {
    return null;
  }

  if (!base) {
    return {
      basicInfo: {
        name: patch.basicInfo?.name ?? null,
        phone: patch.basicInfo?.phone ?? null,
        email: patch.basicInfo?.email ?? null,
        city: patch.basicInfo?.city ?? null,
      },
      educationHistory: patch.educationHistory ?? [],
      workExperiences: patch.workExperiences ?? [],
      skillTags: patch.skillTags ?? [],
      projectExperiences: patch.projectExperiences ?? [],
      sourceText: patch.sourceText ?? "",
      cleanedText: patch.cleanedText ?? "",
      extractionNotes: patch.extractionNotes ?? "",
      extractedAt: patch.extractedAt,
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
