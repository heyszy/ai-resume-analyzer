const DEFAULT_API_BASE_URL = "http://localhost:3001/v1";

export function getApiBaseUrl() {
  const value = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();
  return value && value.length > 0 ? value.replace(/\/+$/, "") : DEFAULT_API_BASE_URL;
}

export function buildApiUrl(path: string) {
  return `${getApiBaseUrl()}/${path.replace(/^\/+/, "")}`;
}

export function parseJson(text: string) {
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return undefined;
  }
}

export function readApiErrorMessage(payload: unknown, fallback: string) {
  if (payload && typeof payload === "object" && "message" in payload) {
    const message = Reflect.get(payload, "message");
    if (typeof message === "string" && message.trim().length > 0) {
      return message;
    }
  }

  return fallback;
}
