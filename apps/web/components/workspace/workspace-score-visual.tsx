"use client";

import { useId } from "react";

type ScoreMetricSource = {
  totalScore: number;
  skillMatchScore: number;
  experienceRelevanceScore: number;
  educationFitScore: number;
};

type WorkspaceScoreVisualProps = {
  score: ScoreMetricSource;
};

export function WorkspaceScoreVisual({ score }: WorkspaceScoreVisualProps) {
  return (
    <div>
      <div className="flex flex-col items-center justify-center rounded-3xl border border-slate-200 bg-slate-950 px-4 py-4 text-white">
        <ScoreRing value={score.totalScore} />
        <div className="mt-2 text-center">
          <p className="text-xs uppercase tracking-[0.2em] text-white/55">综合匹配度</p>
          <p className="mt-1 text-sm text-white/72">后端返回评分</p>
        </div>
      </div>
    </div>
  );
}

function ScoreRing({ value }: { value: number }) {
  const ringGradientId = useId();
  const radius = 42;
  const strokeWidth = 10;
  const normalizedRadius = radius - strokeWidth / 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const clampedValue = Math.max(0, Math.min(100, value));
  const strokeDashoffset = circumference - (clampedValue / 100) * circumference;

  return (
    <div className="relative flex size-28 items-center justify-center">
      <svg className="size-full -rotate-90" viewBox="0 0 96 96" aria-hidden="true">
        <circle
          cx="48"
          cy="48"
          r={normalizedRadius}
          fill="transparent"
          stroke="rgba(255, 255, 255, 0.12)"
          strokeWidth={strokeWidth}
        />
        <circle
          cx="48"
          cy="48"
          r={normalizedRadius}
          fill="transparent"
          stroke={`url(#${ringGradientId})`}
          strokeLinecap="round"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          className="transition-[stroke-dashoffset] duration-300 ease-out"
        />
        <defs>
          <linearGradient id={ringGradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#f8fafc" />
            <stop offset="100%" stopColor="#94a3b8" />
          </linearGradient>
        </defs>
      </svg>

      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <p className="text-3xl font-semibold leading-none">{clampedValue}</p>
        <p className="mt-1 text-[10px] tracking-[0.24em] text-white/50">SCORE</p>
      </div>
    </div>
  );
}
