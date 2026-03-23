import { buildApiUrl } from "./api";

export type UploadResumeResult = {
  candidateId?: string;
  message?: string;
  originalFileName?: string;
  originalFilePath?: string;
  uploadStatus?: string;
};

export type UploadResumeArgs = {
  file: File;
  onProgress: (value: number) => void;
};

function parseJson(text: string) {
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return undefined;
  }
}

function readErrorMessage(payload: unknown, fallback: string) {
  if (payload && typeof payload === "object" && "message" in payload) {
    const message = Reflect.get(payload, "message");
    if (typeof message === "string" && message.trim().length > 0) {
      return message;
    }
  }

  return fallback;
}

function normalizeUploadResult(payload: unknown): UploadResumeResult {
  if (!payload || typeof payload !== "object") {
    return {};
  }

  const items = "items" in payload && Array.isArray(payload.items) ? payload.items : [];
  const firstItem = items[0];

  if (!firstItem || typeof firstItem !== "object") {
    return {
      message: "上传成功。",
    };
  }

  return {
    candidateId:
      "candidateId" in firstItem && typeof firstItem.candidateId === "string"
        ? firstItem.candidateId
        : undefined,
    originalFileName:
      "originalFileName" in firstItem && typeof firstItem.originalFileName === "string"
        ? firstItem.originalFileName
        : undefined,
    originalFilePath:
      "originalFilePath" in firstItem && typeof firstItem.originalFilePath === "string"
        ? firstItem.originalFilePath
        : undefined,
    uploadStatus:
      "processingStatus" in firstItem && typeof firstItem.processingStatus === "string"
        ? firstItem.processingStatus
        : undefined,
    message: "上传成功。",
  };
}

export function uploadResume({ file, onProgress }: UploadResumeArgs) {
  return new Promise<UploadResumeResult>((resolve, reject) => {
    const request = new XMLHttpRequest();

    request.open("POST", buildApiUrl("/uploads/resumes"));
    request.responseType = "text";

    request.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    };

    request.onload = () => {
      const responseText = request.responseText ?? "";
      const payload = responseText.length > 0 ? parseJson(responseText) : undefined;

      if (request.status >= 200 && request.status < 300) {
        onProgress(100);
        resolve(normalizeUploadResult(payload));
        return;
      }

      reject(new Error(readErrorMessage(payload, `上传失败，状态码 ${request.status}`)));
    };

    request.onerror = () => {
      reject(new Error("网络异常，上传失败"));
    };

    const formData = new FormData();
    formData.append("file", file);

    request.send(formData);
  });
}
