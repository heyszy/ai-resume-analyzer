import { randomUUID } from "node:crypto";
import { basename, extname } from "node:path";

import type { MultipartFile } from "@fastify/multipart";

import { createUploadedCandidate, removeUploadedCandidate } from "../candidates";
import { UploadError } from "./errors";
import { removeFileIfExists, resolveUploadedFilePath, saveUploadedPdf } from "./storage";
import type { UploadItem, UploadPart, UploadResponse } from "./types";

const MAX_FILES = 10;
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const PDF_MIME_TYPE: "application/pdf" = "application/pdf";

function deriveDisplayName(fileName: string) {
  const stem = basename(fileName, extname(fileName)).trim();
  return stem || "未命名简历";
}

function mapCandidateRecordToUploadItem(
  candidate: Awaited<ReturnType<typeof createUploadedCandidate>>,
): UploadItem {
  return {
    candidateId: candidate.id,
    displayName: candidate.displayName,
    originalFileName: candidate.originalFileName,
    originalFilePath: candidate.originalFilePath,
    mimeType: PDF_MIME_TYPE,
    fileSize: candidate.fileSize,
    pageCount: candidate.pageCount,
    status: candidate.status,
    processingStatus: candidate.processingStatus,
    uploadedAt: candidate.uploadedAt.toISOString(),
  };
}

function assertPdfFile(file: MultipartFile) {
  if (!file.filename || extname(file.filename).toLowerCase() !== ".pdf") {
    throw new UploadError(400, "INVALID_PDF_FILE", "只允许上传 PDF 文件。", {
      filename: file.filename,
    });
  }

  if (file.mimetype !== PDF_MIME_TYPE) {
    throw new UploadError(400, "INVALID_PDF_FILE", "只允许上传 PDF 文件。", {
      filename: file.filename,
      mimetype: file.mimetype,
    });
  }
}

async function buildCandidateItem(file: MultipartFile): Promise<UploadItem> {
  assertPdfFile(file);

  const candidateId = randomUUID();
  const originalFileName = file.filename;
  const blobPath = resolveUploadedFilePath(candidateId, originalFileName);

  const storedFile = await saveUploadedPdf(file.file, blobPath, MAX_FILE_SIZE);
  try {
    const candidate = await createUploadedCandidate({
      id: candidateId,
      displayName: deriveDisplayName(originalFileName),
      originalFileName,
      originalFilePath: storedFile.pathname,
      mimeType: PDF_MIME_TYPE,
      fileSize: storedFile.fileSize,
      pageCount: 0,
      uploadedAt: new Date(),
    });

    return mapCandidateRecordToUploadItem(candidate);
  } catch (error) {
    await Promise.allSettled([
      removeFileIfExists(storedFile.pathname),
      removeUploadedCandidate(candidateId),
    ]);
    throw error;
  }
}

async function rollbackFiles(uploadedItems: UploadItem[]) {
  for (const item of uploadedItems) {
    await Promise.allSettled([
      removeFileIfExists(item.originalFilePath),
      removeUploadedCandidate(item.candidateId),
    ]);
  }
}

export async function handleUploadFiles(parts: AsyncIterable<UploadPart>) {
  const uploadedItems: UploadItem[] = [];
  let fileCount = 0;

  try {
    for await (const part of parts) {
      if (part.type === "field") {
        continue;
      }

      fileCount += 1;
      if (fileCount > MAX_FILES) {
        throw new UploadError(400, "TOO_MANY_FILES", "单次最多上传 10 份简历。", {
          maxFiles: MAX_FILES,
        });
      }

      const item = await buildCandidateItem(part);
      uploadedItems.push(item);
    }

    if (uploadedItems.length === 0) {
      throw new UploadError(400, "EMPTY_UPLOAD", "请至少选择 1 份 PDF 简历。");
    }

    return {
      totalFiles: uploadedItems.length,
      items: uploadedItems,
    } satisfies UploadResponse;
  } catch (error) {
    if (uploadedItems.length > 0) {
      await rollbackFiles(uploadedItems);
    }

    throw error;
  }
}
