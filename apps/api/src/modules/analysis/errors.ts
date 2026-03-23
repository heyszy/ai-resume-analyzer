type AnalysisErrorCode =
  | "AI_CONFIG_MISSING"
  | "AI_EXTRACTION_FAILED"
  | "AI_SCORING_FAILED"
  | "BLOB_READ_FAILED"
  | "CANDIDATE_NOT_FOUND"
  | "CANDIDATE_PROFILE_NOT_FOUND"
  | "JOB_DESCRIPTION_NOT_FOUND"
  | "PDF_TEXT_EXTRACTION_FAILED"
  | "UNSUPPORTED_SCANNED_PDF";

export class AnalysisError extends Error {
  readonly code: AnalysisErrorCode;
  readonly details?: unknown;

  constructor(code: AnalysisErrorCode, message: string, details?: unknown) {
    super(message);
    this.code = code;
    this.details = details;
  }
}
