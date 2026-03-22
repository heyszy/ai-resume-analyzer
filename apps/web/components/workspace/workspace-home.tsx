"use client";

import { LayoutPanelLeft, Users } from "lucide-react";
import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { useAnalysisStream } from "@/hooks/use-analysis-stream";
import { useCandidateDetail } from "@/hooks/use-candidate-detail";
import { useCandidates } from "@/hooks/use-candidates";
import { type CandidateListResponse, getCandidateDetailKey } from "@/lib/candidates";
import { CandidateDetailPanel } from "./candidate-detail-panel";
import { CandidateListPanel } from "./candidate-list-panel";
import { JdPanel } from "./jd-panel";
import { useWorkspaceHomeStore } from "./workspace-home-store";
import {
  mergeCandidateView,
  type WorkspaceCandidate,
  type WorkspaceCandidatePatch,
  type WorkspaceProcessingStatus,
} from "./workspace-model";

export function WorkspaceHome() {
  const jds = useWorkspaceHomeStore((state) => state.jds);
  const activeJdId = useWorkspaceHomeStore((state) => state.activeJdId);
  const selectedCandidateId = useWorkspaceHomeStore((state) => state.selectedCandidateId);
  const searchKeyword = useWorkspaceHomeStore((state) => state.searchKeyword);
  const currentPage = useWorkspaceHomeStore((state) => state.currentPage);
  const pageSize = useWorkspaceHomeStore((state) => state.pageSize);
  const isUploadPanelOpen = useWorkspaceHomeStore((state) => state.isUploadPanelOpen);
  const selectActiveJd = useWorkspaceHomeStore((state) => state.selectActiveJd);
  const createJd = useWorkspaceHomeStore((state) => state.createJd);
  const updateJd = useWorkspaceHomeStore((state) => state.updateJd);
  const deleteJd = useWorkspaceHomeStore((state) => state.deleteJd);
  const selectCandidate = useWorkspaceHomeStore((state) => state.selectCandidate);
  const setSearchKeyword = useWorkspaceHomeStore((state) => state.setSearchKeyword);
  const setCurrentPage = useWorkspaceHomeStore((state) => state.setCurrentPage);
  const setUploadPanelOpen = useWorkspaceHomeStore((state) => state.setUploadPanelOpen);

  const deferredSearchKeyword = useDeferredValue(searchKeyword);
  const candidateQuery = useMemo(
    () => ({
      keyword: deferredSearchKeyword.trim() || undefined,
      page: currentPage,
      pageSize,
      sortBy: "uploadedAt" as const,
      sortOrder: "desc" as const,
    }),
    [currentPage, deferredSearchKeyword, pageSize],
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

  const [candidateLivePatchById, setCandidateLivePatchById] = useState<
    Record<string, WorkspaceCandidate>
  >({});
  const [analysisCandidateIds, setAnalysisCandidateIds] = useState<string[]>([]);

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
    () => jds.find((jd) => jd.id === activeJdId) ?? jds[0] ?? null,
    [activeJdId, jds],
  );

  const activeAnalysisCount = mergedCandidateList.filter((candidate) =>
    isProcessingCandidate(candidate.processingStatus),
  ).length;
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
      void mutateCandidateList();
      if (selectedDetailKey) {
        void mutateSelectedCandidateDetail();
      }
    },
  });

  const listErrorMessage = candidateListError instanceof Error ? candidateListError.message : null;
  const detailErrorMessage =
    selectedCandidateDetailError instanceof Error ? selectedCandidateDetailError.message : null;

  const totalCandidateCount = candidateList?.total ?? mergedCandidateList.length;
  const totalPageCount = Math.max(1, Math.ceil(totalCandidateCount / pageSize));

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

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-3">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-slate-950 text-white">
            <LayoutPanelLeft className="size-5" />
          </div>
          <p className="text-sm font-semibold text-slate-950">AI Resume Analyzer</p>
        </div>

        <div className="flex flex-wrap items-center gap-4 text-sm">
          <TopStat label="候选人总数" value={`${totalCandidateCount}`} />
          <TopStat
            label="当前页"
            value={`${candidateList?.page ?? currentPage}/${totalPageCount}`}
          />
          <TopStat label="解析中" value={`${activeAnalysisCount}`} />
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
          isLoading={isCandidateListLoading}
          errorMessage={listErrorMessage}
          onSearchChange={setSearchKeyword}
          onSelectCandidate={selectCandidate}
          onPageChange={handlePageChange}
          onUploadPanelOpenChange={setUploadPanelOpen}
          onCandidateCreated={handleCandidateCreated}
          onUploadBatchCompleted={handleUploadBatchCompleted}
        />

        <CandidateDetailPanel
          candidate={selectedCandidate}
          isLoading={isSelectedCandidateDetailLoading && !selectedCandidate}
          errorMessage={detailErrorMessage}
        />

        <JdPanel
          activeJd={activeJd}
          jds={jds}
          onSelectActiveJd={selectActiveJd}
          onCreateJd={createJd}
          onUpdateJd={updateJd}
          onDeleteJd={deleteJd}
        />
      </div>
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

function isProcessingCandidate(status: WorkspaceProcessingStatus) {
  return status === "uploaded" || status === "parsing" || status === "extracting";
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

function TopStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-2 text-sm text-slate-700">
      <Users className="size-3.5 text-slate-400" />
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-slate-950">{value}</span>
    </div>
  );
}
