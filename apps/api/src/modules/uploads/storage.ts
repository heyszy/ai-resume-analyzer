import { basename } from "node:path";
import type { Readable } from "node:stream";

import { del, put } from "@vercel/blob";

import { UploadError } from "./errors";

type StoredPdfFile = {
  fileSize: number;
  pathname: string;
  url: string;
};

function sanitizeFileName(fileName: string) {
  return basename(fileName).replace(/[^a-zA-Z0-9._-]/g, "-");
}

function assertBlobToken() {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    throw new UploadError(
      500,
      "BLOB_TOKEN_MISSING",
      "缺少 BLOB_READ_WRITE_TOKEN，无法上传到 Vercel Blob。",
    );
  }
}

export function resolveUploadedFilePath(candidateId: string, fileName: string) {
  return `resumes/${candidateId}-${sanitizeFileName(fileName)}`;
}

async function readFileBuffer(fileStream: Readable, maxFileSize: number) {
  const chunks: Buffer[] = [];
  let totalSize = 0;

  for await (const chunk of fileStream) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    totalSize += buffer.length;

    if (totalSize > maxFileSize) {
      throw new UploadError(413, "FILE_TOO_LARGE", "单个 PDF 文件大小不能超过 10MB。", {
        fileSize: totalSize,
      });
    }

    chunks.push(buffer);
  }

  return Buffer.concat(chunks);
}

function verifyPdfHeader(fileBuffer: Buffer) {
  return fileBuffer.subarray(0, 4).toString("utf8") === "%PDF";
}

export async function saveUploadedPdf(
  fileStream: Readable,
  targetPath: string,
  maxFileSize: number,
): Promise<StoredPdfFile> {
  assertBlobToken();

  const fileBuffer = await readFileBuffer(fileStream, maxFileSize);
  if (!verifyPdfHeader(fileBuffer)) {
    throw new UploadError(400, "INVALID_PDF_FILE", "文件内容不是有效的 PDF。");
  }

  const blob = await put(targetPath, fileBuffer, {
    access: "private",
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: "application/pdf",
  });

  return {
    fileSize: fileBuffer.byteLength,
    pathname: blob.pathname,
    url: blob.url,
  };
}

export async function removeFileIfExists(filePath: string) {
  if (!filePath) {
    return;
  }

  try {
    await del(filePath);
  } catch {
    // 删除失败不阻塞回滚，避免掩盖主流程错误。
  }
}
