import type { UploadItem } from "./upload-store";

export function isPdfFile(file: File) {
  return file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
}

export function formatFileSize(bytes: number) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function countUploads(items: UploadItem[]) {
  return {
    total: items.length,
    queued: items.filter((item) => item.status === "queued").length,
    uploading: items.filter((item) => item.status === "uploading").length,
    success: items.filter((item) => item.status === "success").length,
    error: items.filter((item) => item.status === "error").length,
  };
}

export function getRejectedFileMessage(files: File[]) {
  if (files.length === 0) {
    return "";
  }

  const names = files.map((file) => file.name).join("、");
  return `仅支持 PDF 文件，已忽略：${names}`;
}
