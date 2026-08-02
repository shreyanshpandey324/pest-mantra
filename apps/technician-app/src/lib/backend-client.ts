import { ApiEnvelope } from "@/types/auth";

const BACKEND_API_URL = process.env.BACKEND_API_URL ?? "http://localhost:4000/api/v1";

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
  method?: "GET" | "POST" | "PATCH" | "DELETE";
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

  const response = await fetch(`${BACKEND_API_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });

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
