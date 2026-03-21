export class UploadError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "UploadError";
  }
}

export function toUploadErrorPayload(error: UploadError) {
  return {
    code: error.code,
    message: error.message,
    details: error.details,
  };
}
