import { ApiEnvelope } from "@/types/auth";

const internalBackend = process.env.BACKEND_INTERNAL_HOSTPORT?.trim();
const BACKEND_API_URL = (
  process.env.BACKEND_API_URL ??
  (internalBackend ? `http://${internalBackend}/api/v1` : "http://localhost:4000/api/v1")
).replace(/\/$/, "");

const configuredTimeout = Number(process.env.BACKEND_REQUEST_TIMEOUT_MS ?? 15_000);
export const BACKEND_REQUEST_TIMEOUT_MS =
  Number.isFinite(configuredTimeout) && configuredTimeout >= 1_000 && configuredTimeout <= 120_000
    ? Math.floor(configuredTimeout)
    : 15_000;

export function backendRequestSignal(timeoutMs = BACKEND_REQUEST_TIMEOUT_MS): AbortSignal {
  return AbortSignal.timeout(timeoutMs);
}

export class BackendApiError extends Error {
  public readonly statusCode: number;
  public readonly details?: unknown;

  constructor(statusCode: number, message: string, details?: unknown) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
  }
}

interface BackendRequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  accessToken?: string;
  cookieHeader?: string;
}

/**
 * Same BFF pattern as admin-web's backend-client.ts: server-only,
 * talks directly to the internal backend URL, never imported into
 * a Client Component. JSON-only — the photo upload route handler
 * (jobs/[id]/photos) uses a separate raw fetch with FormData
 * instead of this helper, since multipart bodies can't be
 * JSON.stringify'd.
 */
export async function backendFetch<T>(
  path: string,
  options: BackendRequestOptions = {}
): Promise<T> {
  const { method = "GET", body, accessToken, cookieHeader } = options;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }
  if (cookieHeader) {
    headers.Cookie = cookieHeader;
  }

  let response: Response;
  try {
    response = await fetch(`${BACKEND_API_URL}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      cache: "no-store",
      signal: backendRequestSignal(),
    });
  } catch (error) {
    const timedOut =
      error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError");
    throw new BackendApiError(
      timedOut ? 504 : 502,
      timedOut
        ? "The server took too long to respond. Please retry."
        : "Unable to reach the server. Please try again.",
    );
  }

  let json: ApiEnvelope<T> | null = null;
  try {
    json = (await response.json()) as ApiEnvelope<T>;
  } catch {
    // Non-JSON response (e.g. network-level failure page) — fall through.
  }

  if (!response.ok || !json?.success) {
    throw new BackendApiError(
      response.status,
      json?.message ?? "Something went wrong. Please try again.",
      json?.details
    );
  }

  return json.data as T;
}

export { BACKEND_API_URL };
