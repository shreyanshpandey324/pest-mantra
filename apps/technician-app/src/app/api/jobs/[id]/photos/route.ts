import { NextRequest, NextResponse } from "next/server";
import { BACKEND_API_URL } from "@/lib/backend-client";
import { requireAccessToken } from "@/lib/require-token";

/**
 * Doesn't use backendFetch — that helper always JSON.stringifies
 * its body, which can't carry a file. Instead this reads the
 * incoming multipart form (browser → Next.js) and rebuilds a new
 * FormData to forward (Next.js → Express backend), copying only
 * the two fields the backend's multer middleware expects
 * (see upload.middleware.ts / photoUploadBodySchema in Module 2):
 * `photo` (the file) and `photoType` ('before' | 'after').
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const token = requireAccessToken(req);
  if (token instanceof NextResponse) return token;

  const { id } = await params;

  let incoming: FormData;
  try {
    incoming = await req.formData();
  } catch {
    return NextResponse.json({ success: false, message: "Invalid form data" }, { status: 400 });
  }

  const photo = incoming.get("photo");
  const photoType = incoming.get("photoType");

  if (!(photo instanceof File)) {
    return NextResponse.json(
      { success: false, message: "No photo file was uploaded (expected field name 'photo')" },
      { status: 400 }
    );
  }
  if (photoType !== "before" && photoType !== "after") {
    return NextResponse.json(
      { success: false, message: "photoType must be 'before' or 'after'" },
      { status: 400 }
    );
  }

  const outgoing = new FormData();
  outgoing.append("photo", photo, photo.name);
  outgoing.append("photoType", photoType);

  try {
    const backendRes = await fetch(`${BACKEND_API_URL}/projects/${id}/photos`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: outgoing,
      cache: "no-store",
    });

    const json = await backendRes.json().catch(() => null);

    if (!backendRes.ok || !json?.success) {
      return NextResponse.json(
        { success: false, message: json?.message ?? "Photo upload failed" },
        { status: backendRes.status || 502 }
      );
    }

    return NextResponse.json({ success: true, message: "Photo uploaded", data: json.data });
  } catch {
    return NextResponse.json(
      { success: false, message: "Unable to reach the server. Please try again." },
      { status: 502 }
    );
  }
}
