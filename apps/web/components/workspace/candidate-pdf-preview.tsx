"use client";

import { AlertTriangle, FileText } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Skeleton } from "@/components/ui/skeleton";

type CandidatePdfPreviewProps = {
  fileUrl: string;
  title: string;
};

export function CandidatePdfPreview({ fileUrl, title }: CandidatePdfPreviewProps) {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const pagesRef = useRef<HTMLDivElement | null>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const element = viewportRef.current;

    if (!element) {
      return undefined;
    }

    const observer = new ResizeObserver((entries) => {
      const nextWidth = entries[0]?.contentRect.width ?? 0;
      setContainerWidth(nextWidth);
    });

    observer.observe(element);
    setContainerWidth(element.getBoundingClientRect().width);

    return () => {
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    if (!pagesRef.current || containerWidth <= 0) {
      return undefined;
    }

    let isDisposed = false;
    let loadingTask: ReturnType<
      typeof import("pdfjs-dist/legacy/build/pdf.mjs")["getDocument"]
    > | null = null;
    const renderTasks: Array<{ cancel: () => void }> = [];

    async function renderPreview() {
      const host = pagesRef.current;

      if (!host) {
        return;
      }

      setIsLoading(true);
      setErrorMessage(null);
      host.replaceChildren();

      try {
        const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");

        // 显式指定 worker，避免在 Next 环境里走到浏览器默认的 PDF 预览器。
        pdfjs.GlobalWorkerOptions.workerSrc = new URL(
          "pdfjs-dist/build/pdf.worker.min.mjs",
          import.meta.url,
        ).toString();

        loadingTask = pdfjs.getDocument(fileUrl);
        const pdf = await loadingTask.promise;

        if (isDisposed) {
          await loadingTask.destroy();
          return;
        }

        const availableWidth = Math.max(containerWidth - 48, 320);

        for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
          const page = await pdf.getPage(pageNumber);

          if (isDisposed) {
            break;
          }

          const baseViewport = page.getViewport({ scale: 1 });
          const scale = availableWidth / baseViewport.width;
          const viewport = page.getViewport({ scale });
          const outputScale = window.devicePixelRatio || 1;

          const pageCard = document.createElement("div");
          pageCard.className =
            "overflow-hidden rounded-[20px] border border-border bg-white shadow-[0_20px_40px_rgba(15,23,42,0.06)]";

          const canvas = document.createElement("canvas");
          const context = canvas.getContext("2d");

          if (!context) {
            continue;
          }

          canvas.width = Math.floor(viewport.width * outputScale);
          canvas.height = Math.floor(viewport.height * outputScale);
          canvas.style.width = `${viewport.width}px`;
          canvas.style.height = `${viewport.height}px`;
          canvas.style.display = "block";

          context.scale(outputScale, outputScale);

          pageCard.append(canvas);
          host.append(pageCard);

          const renderTask = page.render({
            canvas,
            canvasContext: context,
            viewport,
          });
          renderTasks.push(renderTask);

          await renderTask.promise;
        }

        if (!isDisposed) {
          setIsLoading(false);
        }
      } catch (error) {
        if (isDisposed) {
          return;
        }

        setErrorMessage(error instanceof Error ? error.message : "PDF 预览加载失败");
        setIsLoading(false);
      }
    }

    void renderPreview();

    return () => {
      isDisposed = true;
      for (const task of renderTasks) {
        task.cancel();
      }
      void loadingTask?.destroy();
    };
  }, [containerWidth, fileUrl]);

  return (
    <div
      ref={viewportRef}
      className="min-h-[78vh] rounded-xl border border-border bg-background px-5 py-5"
    >
      {errorMessage ? (
        <div className="flex min-h-[72vh] items-center justify-center rounded-[20px] border border-dashed border-rose-200 bg-rose-50 px-6 text-center">
          <div className="max-w-md space-y-3">
            <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-rose-100 text-rose-600">
              <AlertTriangle className="size-5" />
            </div>
            <p className="text-base font-semibold text-slate-950">PDF 预览加载失败</p>
            <p className="text-sm leading-6 text-slate-600">{errorMessage}</p>
          </div>
        </div>
      ) : (
        <>
          {isLoading ? <PdfPreviewSkeleton /> : null}
          <div ref={pagesRef} title={title} className={isLoading ? "hidden" : "space-y-5"} />
        </>
      )}
    </div>
  );
}

function PdfPreviewSkeleton() {
  return (
    <div className="space-y-5">
      <div className="flex min-h-[72vh] items-center justify-center rounded-[20px] border border-border bg-white px-4 py-4 shadow-[0_20px_40px_rgba(15,23,42,0.06)]">
        <div className="w-full max-w-[820px] space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
              <FileText className="size-5" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
          <Skeleton className="h-[960px] w-full rounded-[16px]" />
        </div>
      </div>
    </div>
  );
}
