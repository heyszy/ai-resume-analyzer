"use client";

import { LayoutPanelLeft } from "lucide-react";
import { useCallback, useDeferredValue, useEffect, useMemo, useState } from "react";
import { useAnalysisStream } from "@/hooks/use-analysis-stream";
import { useCandidateDetail } from "@/hooks/use-candidate-detail";
import { useCandidateScores } from "@/hooks/use-candidate-scores";
import { useCandidates } from "@/hooks/use-candidates";
import { useJds } from "@/hooks/use-jds";
import {
  type CandidateListResponse,
  deleteCandidate as deleteCandidateRequest,
  getCandidateDetailKey,
  updateCandidateProfile as updateCandidateProfileRequest,
  updateCandidateStatus as updateCandidateStatusRequest,
} from "@/lib/candidates";
import {
  createJd as createJdRequest,
  deleteJd as deleteJdRequest,
  updateJd as updateJdRequest,
} from "@/lib/jds";
import { CandidateDetailPanel } from "./candidate-detail-panel";
import { CandidateListPanel } from "./candidate-list-panel";
import { mapProfileResponseToCandidatePatch } from "./candidate-profile-editor";
import { CandidateTableDialog } from "./candidate-table-dialog";
import { JdPanel } from "./jd-panel";
import { useWorkspaceHomeStore } from "./workspace-home-store";
import {
  mergeCandidateProfile,
  mergeCandidateView,
  type WorkspaceCandidate,
  type WorkspaceCandidatePatch,
  type WorkspaceCandidateStatus,
  type WorkspaceCandidateSummary,
  type WorkspaceJd,
  type WorkspaceScore,
} from "./workspace-model";
import { WorkspaceScorePanel } from "./workspace-score-panel";

type ScoreGenerationTrace = {
  candidateId: string;
  jdId: string;
  progress: number;
  stage: string;
  message: string;
  commentary: string;
  steps: string[];
};

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
    data: selectedCandidateScores,
    error: selectedCandidateScoresError,
    isLoading: isSelectedCandidateScoresLoading,
    mutate: mutateSelectedCandidateScores,
  } = useCandidateScores(selectedCandidateId, activeJdId);
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
    Record<string, WorkspaceCandidate | WorkspaceCandidateSummary>
  >({});
  const [analysisCandidateIds, setAnalysisCandidateIds] = useState<string[]>([]);
  const [scoreGenerationRequest, setScoreGenerationRequest] = useState<{
    candidateId: string;
    jdId: string;
    regenerateScore: boolean;
  } | null>(null);
  const [scoreGenerationErrorState, setScoreGenerationErrorState] = useState<{
    candidateId: string;
    jdId: string;
    message: string;
  } | null>(null);
  const [scoreGenerationTrace, setScoreGenerationTrace] = useState<ScoreGenerationTrace | null>(
    null,
  );
  const [deletingCandidateId, setDeletingCandidateId] = useState<string | null>(null);
  const [updatingCandidateStatusId, setUpdatingCandidateStatusId] = useState<string | null>(null);
  const [updatingCandidateProfileId, setUpdatingCandidateProfileId] = useState<string | null>(null);
  const jds = jdList?.items ?? [];
  const isAnalysisRunning = analysisCandidateIds.length > 0;

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

  useEffect(() => {
    if (!activeJdId || !selectedCandidateId) {
      setScoreGenerationTrace(null);
      setScoreGenerationErrorState(null);
      return;
    }

    setScoreGenerationTrace(null);
    setScoreGenerationErrorState(null);
  }, [activeJdId, selectedCandidateId]);

  const selectedCandidateFromList = mergedCandidateList.find(
    (candidate) => candidate.id === selectedCandidateId,
  );
  const selectedCandidate = useMemo(() => {
    const matchedDetail =
      selectedCandidateDetail?.id === selectedCandidateId ? selectedCandidateDetail : null;
    const baseCandidate = matchedDetail ?? selectedCandidateFromList ?? null;

    if (!baseCandidate) {
      return null;
    }

    return mergeCandidateView(baseCandidate, candidateLivePatchById[baseCandidate.id]);
  }, [
    candidateLivePatchById,
    selectedCandidateDetail,
    selectedCandidateFromList,
    selectedCandidateId,
  ]);
  const activeJd = useMemo(
    () => jds.find((jd) => jd.id === activeJdId) ?? jds.find((jd) => jd.isActive) ?? jds[0] ?? null,
    [activeJdId, jds],
  );
  const activeScore = useMemo(
    () => pickCurrentScore(selectedCandidateScores?.items ?? [], activeJd?.id ?? null),
    [activeJd?.id, selectedCandidateScores?.items],
  );
  const activeScorePreview = useMemo(() => {
    if (!selectedCandidate || !activeJd) {
      return null;
    }

    const preview = selectedCandidate.currentScore;
    if (!preview || preview.jdId !== activeJd.id) {
      return null;
    }

    return preview;
  }, [activeJd, selectedCandidate]);

  useEffect(() => {
    if (!selectedCandidate || !activeJd) {
      return;
    }

    if (isSelectedCandidateScoresLoading) {
      return;
    }

    if (activeScore) {
      setCandidateLivePatchById((state) => {
        const previous =
          state[selectedCandidate.id] ??
          resolveCandidateSnapshot(
            selectedCandidate.id,
            selectedCandidateDetail,
            mergedCandidateList,
          );

        if (!previous) {
          return state;
        }

        const currentScorePreview = getCurrentScorePreview(previous, activeJd.id);
        const nextScorePreview = toScorePreview(activeScore, activeJd.title);
        const existingScores = getScoreList(previous);
        const hasCurrentScore = existingScores.some((score) => score.id === activeScore.id);

        if (
          currentScorePreview &&
          isSameScorePreview(currentScorePreview, nextScorePreview) &&
          hasCurrentScore
        ) {
          return state;
        }

        return {
          ...state,
          [selectedCandidate.id]: {
            ...previous,
            currentScore: nextScorePreview,
            scores: upsertScoreList(existingScores, activeScore),
            updatedAt: activeScore.scoredAt,
          },
        };
      });
      return;
    }

    if (selectedCandidateScoresError) {
      return;
    }

    setCandidateLivePatchById((state) => {
      const previous =
        state[selectedCandidate.id] ??
        resolveCandidateSnapshot(
          selectedCandidate.id,
          selectedCandidateDetail,
          mergedCandidateList,
        );

      if (!previous || !getCurrentScorePreview(previous, activeJd.id)) {
        return state;
      }

      return {
        ...state,
        [selectedCandidate.id]: {
          ...previous,
          currentScore: null,
        },
      };
    });
  }, [
    activeJd,
    activeScore,
    isSelectedCandidateScoresLoading,
    mergedCandidateList,
    selectedCandidateScoresError,
    selectedCandidateDetail,
    selectedCandidate,
  ]);

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

  useAnalysisStream({
    candidateIds: scoreGenerationRequest ? [scoreGenerationRequest.candidateId] : [],
    enabled: scoreGenerationRequest !== null,
    jdId: scoreGenerationRequest?.jdId,
    regenerateScore: scoreGenerationRequest?.regenerateScore ?? false,
    onProgress: (event) => {
      patchCandidate(event.candidateId, {
        processingStatus: event.processingStatus,
        processingErrorMessage: null,
        updatedAt: new Date().toISOString(),
      });

      if (!scoreGenerationRequest || event.candidateId !== scoreGenerationRequest.candidateId) {
        return;
      }

      setScoreGenerationTrace((current) => {
        const nextStep = formatScoreTraceStep(event.stage, event.message);

        if (
          !current ||
          current.candidateId !== scoreGenerationRequest.candidateId ||
          current.jdId !== scoreGenerationRequest.jdId
        ) {
          return {
            candidateId: scoreGenerationRequest.candidateId,
            jdId: scoreGenerationRequest.jdId,
            progress: event.progress,
            stage: event.stage,
            message: event.message,
            commentary: "",
            steps: [nextStep],
          };
        }

        return {
          ...current,
          progress: event.progress,
          stage: event.stage,
          message: event.message,
          steps: pushUniqueStep(current.steps, nextStep),
        };
      });
    },
    onScorePartial: (event) => {
      if (!scoreGenerationRequest || event.candidateId !== scoreGenerationRequest.candidateId) {
        return;
      }

      setScoreGenerationTrace((current) => {
        const commentary = event.commentary?.trim();
        const nextStep = formatScoreTraceStep(event.stage, event.message);

        if (
          !current ||
          current.candidateId !== scoreGenerationRequest.candidateId ||
          current.jdId !== scoreGenerationRequest.jdId
        ) {
          return {
            candidateId: scoreGenerationRequest.candidateId,
            jdId: scoreGenerationRequest.jdId,
            progress: 86,
            stage: event.stage,
            message: event.message,
            commentary: commentary ?? "",
            steps: [nextStep],
          };
        }

        return {
          ...current,
          progress: Math.max(current.progress, 86),
          stage: event.stage,
          message: event.message,
          commentary: mergeScoreTraceCommentary(current.commentary, commentary ?? ""),
          steps: pushUniqueStep(current.steps, nextStep),
        };
      });
    },
    onScoreFinal: (event) => {
      const score = event.score;
      const scorePreview = toScorePreview(score, score.jdTitle ?? null);

      setCandidateLivePatchById((state) => {
        const previous =
          state[event.candidateId] ??
          resolveCandidateSnapshot(event.candidateId, selectedCandidateDetail, mergedCandidateList);

        if (!previous) {
          return state;
        }

        return {
          ...state,
          [event.candidateId]: {
            ...previous,
            currentScore: scorePreview,
            scores: upsertScoreList(getScoreList(previous), score),
            updatedAt: score.scoredAt,
          },
        };
      });

      if (scoreGenerationRequest && event.candidateId === scoreGenerationRequest.candidateId) {
        setScoreGenerationTrace((current) => {
          if (
            !current ||
            current.candidateId !== scoreGenerationRequest.candidateId ||
            current.jdId !== scoreGenerationRequest.jdId
          ) {
            return {
              candidateId: scoreGenerationRequest.candidateId,
              jdId: scoreGenerationRequest.jdId,
              progress: 100,
              stage: "score.complete",
              message: "岗位评分已生成完成。",
              commentary: score.aiCommentary,
              steps: [formatScoreTraceStep("score.complete", "岗位评分已生成完成。")],
            };
          }

          return {
            ...current,
            progress: 100,
            stage: "score.complete",
            message: "岗位评分已生成完成。",
            commentary: score.aiCommentary,
            steps: pushUniqueStep(
              current.steps,
              formatScoreTraceStep("score.complete", "岗位评分已生成完成。"),
            ),
          };
        });
      }
    },
    onErrorEvent: (event) => {
      if (scoreGenerationRequest) {
        setScoreGenerationErrorState({
          candidateId: event.candidateId,
          jdId: scoreGenerationRequest.jdId,
          message: event.message,
        });
      }
      setScoreGenerationRequest(null);
      patchCandidate(event.candidateId, {
        processingStatus: "failed",
        processingErrorMessage: event.message,
        updatedAt: new Date().toISOString(),
      });
    },
    onConnectionError: () => {
      if (scoreGenerationRequest) {
        setScoreGenerationErrorState({
          candidateId: scoreGenerationRequest.candidateId,
          jdId: scoreGenerationRequest.jdId,
          message: "评分连接已断开，请重试。",
        });
      }
      setScoreGenerationRequest(null);
    },
    onAllDone: () => {
      setScoreGenerationRequest(null);
      void mutateCandidateList();
      if (selectedDetailKey) {
        void mutateSelectedCandidateDetail();
      }
      void mutateSelectedCandidateScores();
    },
  });

  const listErrorMessage = candidateListError instanceof Error ? candidateListError.message : null;
  const detailErrorMessage =
    selectedCandidateDetailError instanceof Error ? selectedCandidateDetailError.message : null;
  const scoreErrorMessage =
    selectedCandidateScoresError instanceof Error ? selectedCandidateScoresError.message : null;
  const jdErrorMessage = jdListError instanceof Error ? jdListError.message : null;
  const currentScoreGenerationErrorMessage =
    scoreGenerationErrorState &&
    scoreGenerationErrorState.candidateId === selectedCandidate?.id &&
    scoreGenerationErrorState.jdId === activeJd?.id
      ? scoreGenerationErrorState.message
      : null;
  const currentScoreGenerationTrace =
    scoreGenerationTrace &&
    scoreGenerationTrace.candidateId === selectedCandidate?.id &&
    scoreGenerationTrace.jdId === activeJd?.id
      ? scoreGenerationTrace
      : null;
  const isCurrentScoreGenerating =
    scoreGenerationRequest?.candidateId === selectedCandidate?.id &&
    scoreGenerationRequest?.jdId === activeJd?.id;
  const shouldHideCurrentScore =
    isCurrentScoreGenerating && currentScoreGenerationTrace?.stage !== "score.complete";

  const patchCandidate = useCallback(
    (candidateId: string, patch: WorkspaceCandidatePatch) => {
      setCandidateLivePatchById((state) => {
        const previous =
          state[candidateId] ??
          (selectedCandidateDetail?.id === candidateId
            ? selectedCandidateDetail
            : (mergedCandidateList.find((candidate) => candidate.id === candidateId) ?? null));

        if (!previous) {
          return state;
        }

        const nextProfile =
          typeof patch.profile === "undefined"
            ? undefined
            : mergeCandidateProfile("profile" in previous ? previous.profile : null, patch.profile);

        return {
          ...state,
          [candidateId]: {
            ...previous,
            ...patch,
            ...(typeof patch.profile === "undefined" ? {} : { profile: nextProfile }),
          },
        };
      });
    },
    [mergedCandidateList, selectedCandidateDetail],
  );

  function handleCandidateCreated(candidate: WorkspaceCandidate) {
    setCandidateLivePatchById((state) => ({
      ...state,
      [candidate.id]: candidate,
    }));
    selectCandidate(candidate.id);
    setCurrentPage(1);
  }

  function handleUploadBatchCompleted(candidates: WorkspaceCandidate[]) {
    setAnalysisCandidateIds(candidates.map((candidate) => candidate.id));

    if (candidates.length > 0) {
      selectCandidate(candidates[0].id);
      setCurrentPage(1);
    }

    void mutateCandidateList();
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
      const shouldMoveToPreviousPage = currentPage > 1 && remainingCandidates.length === 0;

      if (selectedCandidateId === candidateId) {
        selectCandidate(shouldMoveToPreviousPage ? null : (remainingCandidates[0]?.id ?? null));
      }

      if (shouldMoveToPreviousPage) {
        setCurrentPage(currentPage - 1);
      }

      await mutateCandidateList((current) => removeCandidateFromList(current, candidateId), false);

      if (!shouldMoveToPreviousPage) {
        await mutateCandidateList();
      }

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

  async function handleUpdateCandidateProfile(
    candidateId: string,
    payload: Parameters<typeof updateCandidateProfileRequest>[1],
  ) {
    const snapshot = resolveCandidateSnapshot(
      candidateId,
      selectedCandidateDetail,
      mergedCandidateList,
    );
    if (!snapshot) {
      return;
    }

    const previousProfile = "profile" in snapshot ? (snapshot.profile ?? null) : null;
    const previousPatch: WorkspaceCandidatePatch = {
      displayName: snapshot.displayName,
      email: snapshot.email,
      phone: snapshot.phone,
      city: snapshot.city,
      skillTags: snapshot.skillTags,
      profile: previousProfile,
      rawText: "rawText" in snapshot ? snapshot.rawText : null,
      cleanedText: "cleanedText" in snapshot ? snapshot.cleanedText : null,
      updatedAt: snapshot.updatedAt,
    };
    const optimisticUpdatedAt = new Date().toISOString();
    const optimisticProfile: NonNullable<WorkspaceCandidate["profile"]> = {
      basicInfo: {
        name: payload.basicInfo?.name ?? previousProfile?.basicInfo.name ?? snapshot.displayName,
        phone:
          payload.basicInfo?.phone ?? previousProfile?.basicInfo.phone ?? snapshot.phone ?? null,
        email:
          payload.basicInfo?.email ?? previousProfile?.basicInfo.email ?? snapshot.email ?? null,
        city: payload.basicInfo?.city ?? previousProfile?.basicInfo.city ?? snapshot.city ?? null,
      },
      educationHistory: payload.educationHistory ?? previousProfile?.educationHistory ?? [],
      workExperiences: payload.workExperiences ?? previousProfile?.workExperiences ?? [],
      skillTags: payload.skillTags ?? previousProfile?.skillTags ?? snapshot.skillTags ?? [],
      projectExperiences: payload.projectExperiences ?? previousProfile?.projectExperiences ?? [],
      sourceText: payload.sourceText ?? previousProfile?.sourceText ?? "",
      cleanedText: payload.cleanedText ?? previousProfile?.cleanedText ?? "",
      extractionNotes: payload.extractionNotes ?? previousProfile?.extractionNotes ?? "",
      extractedAt: optimisticUpdatedAt,
    };

    setUpdatingCandidateProfileId(candidateId);
    patchCandidate(
      candidateId,
      mapProfileResponseToCandidatePatch(optimisticProfile, optimisticUpdatedAt),
    );

    try {
      const response = await updateCandidateProfileRequest(candidateId, payload);
      patchCandidate(
        candidateId,
        mapProfileResponseToCandidatePatch(response.profile, new Date().toISOString()),
      );
      await mutateCandidateList();
      if (selectedDetailKey) {
        await mutateSelectedCandidateDetail();
      }
    } catch (error) {
      patchCandidate(candidateId, previousPatch);
      throw error;
    } finally {
      setUpdatingCandidateProfileId((current) => (current === candidateId ? null : current));
    }
  }

  function handleReanalyzeCandidate(candidateId: string) {
    if (isAnalysisRunning || scoreGenerationRequest) {
      return;
    }

    patchCandidate(candidateId, {
      processingStatus: "parsing",
      processingErrorMessage: null,
      updatedAt: new Date().toISOString(),
    });
    setAnalysisCandidateIds([candidateId]);
  }

  async function handleGenerateScore() {
    if (!selectedCandidate || !activeJd || scoreGenerationRequest) {
      return;
    }

    const regenerateScore = Boolean(activeScore || activeScorePreview);

    setScoreGenerationErrorState(null);
    setScoreGenerationTrace({
      candidateId: selectedCandidate.id,
      jdId: activeJd.id,
      progress: 0,
      stage: "score.prepare",
      message: regenerateScore ? "正在重新生成岗位匹配评分。" : "正在准备岗位匹配评分。",
      commentary: "",
      steps: [regenerateScore ? "已发起重新生成评分请求" : "已发起评分请求"],
    });
    setScoreGenerationRequest({
      candidateId: selectedCandidate.id,
      jdId: activeJd.id,
      regenerateScore,
    });
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
          page={currentPage}
          pageSize={pageSize}
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
          isUpdatingProfile={
            Boolean(selectedCandidate) && updatingCandidateProfileId === selectedCandidate?.id
          }
          onUpdateProfile={handleUpdateCandidateProfile}
          isReanalyzing={
            Boolean(selectedCandidate) && analysisCandidateIds.includes(selectedCandidate?.id ?? "")
          }
          onReanalyze={handleReanalyzeCandidate}
          isDeletingCandidate={
            Boolean(selectedCandidate) && deletingCandidateId === selectedCandidate?.id
          }
          onDeleteCandidate={handleDeleteCandidate}
          isLoading={isSelectedCandidateDetailLoading && !selectedCandidate}
          errorMessage={detailErrorMessage}
        />

        <div className="space-y-3">
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

          <WorkspaceScorePanel
            candidateName={selectedCandidate?.displayName ?? null}
            jobTitle={activeJd?.title ?? null}
            score={shouldHideCurrentScore ? null : activeScore}
            scorePreview={shouldHideCurrentScore ? null : activeScorePreview}
            isScoreLoading={isSelectedCandidateScoresLoading}
            isGenerating={isCurrentScoreGenerating}
            errorMessage={currentScoreGenerationErrorMessage ?? scoreErrorMessage}
            streamingMessage={currentScoreGenerationTrace?.message ?? null}
            streamingCommentary={currentScoreGenerationTrace?.commentary ?? null}
            onGenerate={() => void handleGenerateScore()}
          />
        </div>
      </div>

      <CandidateTableDialog
        open={isCandidateTableOpen}
        candidates={mergedCandidateList}
        total={candidateList?.total ?? mergedCandidateList.length}
        page={currentPage}
        pageSize={pageSize}
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

function getScoreList(candidate: ScoreCandidateLike | null) {
  return candidate?.scores ?? [];
}

function resolveCandidateSnapshot(
  candidateId: string,
  selectedCandidateDetail: WorkspaceCandidate | null | undefined,
  mergedCandidateList: (WorkspaceCandidate | WorkspaceCandidateSummary)[],
): WorkspaceCandidate | WorkspaceCandidateSummary | null {
  if (selectedCandidateDetail?.id === candidateId) {
    return selectedCandidateDetail;
  }

  return mergedCandidateList.find((candidate) => candidate.id === candidateId) ?? null;
}

function getCurrentScorePreview(
  candidate: WorkspaceCandidate | WorkspaceCandidateSummary,
  jdId: string,
) {
  const currentScore = candidate.currentScore;

  if (!currentScore || currentScore.jdId !== jdId) {
    return null;
  }

  return currentScore;
}

function pickCurrentScore(scores: WorkspaceScore[], jdId: string | null) {
  if (!jdId) {
    return null;
  }

  const orderedScores = [...scores];
  const scoreForJd = orderedScores.find((score) => score.jdId === jdId && !score.isStale);
  if (scoreForJd) {
    return scoreForJd;
  }

  return orderedScores.find((score) => score.jdId === jdId) ?? null;
}

function toScorePreview(score: WorkspaceScore, jdTitle?: string | null) {
  return {
    jdId: score.jdId,
    jdTitle: jdTitle ?? score.jdTitle,
    totalScore: score.totalScore,
    skillMatchScore: score.skillMatchScore,
    experienceRelevanceScore: score.experienceRelevanceScore,
    educationFitScore: score.educationFitScore,
    isStale: score.isStale,
    scoredAt: score.scoredAt,
  };
}

function isSameScorePreview(
  left: NonNullable<WorkspaceCandidate["currentScore"]>,
  right: NonNullable<WorkspaceCandidate["currentScore"]>,
) {
  return (
    left.jdId === right.jdId &&
    left.jdTitle === right.jdTitle &&
    left.totalScore === right.totalScore &&
    left.skillMatchScore === right.skillMatchScore &&
    left.experienceRelevanceScore === right.experienceRelevanceScore &&
    left.educationFitScore === right.educationFitScore &&
    left.isStale === right.isStale &&
    left.scoredAt === right.scoredAt
  );
}

function formatScoreTraceStep(stage: string, message: string) {
  const stageLabel = stage.startsWith("score.") ? stage.replace("score.", "评分·") : stage;
  return `${stageLabel}：${message}`;
}

function pushUniqueStep(steps: string[], step: string) {
  if (steps.includes(step)) {
    return steps;
  }

  return [...steps, step];
}

function mergeScoreTraceCommentary(previous: string, next: string) {
  const normalizedNext = next.trim();

  if (!normalizedNext) {
    return previous;
  }

  if (!previous) {
    return normalizedNext;
  }

  if (normalizedNext.startsWith(previous)) {
    return normalizedNext;
  }

  if (previous.endsWith(normalizedNext)) {
    return previous;
  }

  return `${previous}\n\n${normalizedNext}`;
}

function upsertScoreList(scores: WorkspaceCandidate["scores"], nextScore: WorkspaceScore) {
  const currentScores = scores ?? [];
  const nextScores = currentScores.filter((score) => score.jdId !== nextScore.jdId);

  return [...nextScores, nextScore];
}

type ScoreCandidateLike = Pick<WorkspaceCandidate, "id" | "currentScore"> &
  Partial<Pick<WorkspaceCandidate, "scores">>;
