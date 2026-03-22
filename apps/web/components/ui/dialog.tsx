"use client";

import { X } from "lucide-react";
import { type ReactNode, useEffect } from "react";
import { createPortal } from "react-dom";

import { cn } from "@/lib/utils";

type DialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
};

export function Dialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  className,
  bodyClassName,
}: DialogProps) {
  useEffect(() => {
    if (!open) {
      return;
    }

    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onOpenChange(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = overflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onOpenChange]);

  if (!open) {
    return null;
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-8">
      <button
        type="button"
        aria-label="关闭弹窗"
        className="absolute inset-0 bg-slate-950/24"
        onMouseDown={() => onOpenChange(false)}
      />

      <div
        className={cn(
          "relative z-10 flex max-h-[calc(100vh-4rem)] w-full max-w-3xl flex-col overflow-hidden rounded-xl border border-border bg-background",
          className,
        )}
      >
        <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
          <div className="space-y-1">
            <h2 className="text-base font-semibold text-slate-950">{title}</h2>
            {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
          </div>

          <button
            type="button"
            aria-label="关闭"
            onClick={() => onOpenChange(false)}
            className="flex size-8 items-center justify-center rounded-lg border border-border bg-background text-slate-500 transition-colors hover:bg-muted"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className={cn("min-h-0 px-5 py-4", bodyClassName)}>{children}</div>
      </div>
    </div>,
    document.body,
  );
}
