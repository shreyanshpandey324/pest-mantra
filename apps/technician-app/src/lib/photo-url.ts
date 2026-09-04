/**
 * Backend photo records return an authenticated API path such as
 * /api/v1/projects/:projectId/photos/:photoId. Browsers cannot attach
 * the technician app's httpOnly JWT cookie as a Bearer token to a
 * direct backend <img> request, so convert that path to our same-origin
 * BFF photo route. The BFF injects the access token server-side.
 */
export function toAbsolutePhotoUrl(fileUrl: string): string {
  const secureMatch = fileUrl.match(
    /^\/api\/v1\/projects\/([^/]+)\/photos\/([^/?#]+)$/
  );

  if (secureMatch) {
    const [, projectId, photoId] = secureMatch;
    return `/api/jobs/${encodeURIComponent(projectId)}/photos/${encodeURIComponent(photoId)}`;
  }

  // Backward compatibility for older records that stored /uploads/... .
  // In production the backend origin must be explicit; silently pointing a
  // deployed app at localhost makes legacy photos look randomly broken.
  if (fileUrl.startsWith("/uploads/")) {
    const origin = process.env.NEXT_PUBLIC_BACKEND_ORIGIN?.replace(/\/$/, "");

    if (!origin) {
      return fileUrl;
    }

    return `${origin}${fileUrl}`;
  }

  return fileUrl;
}
