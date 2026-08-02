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
 * This client is server-only (used from Next.js Route Handlers /
 * Server Components), never imported into a Client Component —
 * it talks directly to the internal backend URL and must never
 * be exposed to the browser. BACKEND_API_URL is intentionally
 * a non-NEXT_PUBLIC_ env var so it cannot leak into client bundles.
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
