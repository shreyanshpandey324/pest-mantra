import { cookies } from "next/headers";
import Link from "next/link";
import { ACCESS_COOKIE_NAME } from "@/lib/session";
import { backendFetch, BackendApiError } from "@/lib/backend-client";
import { Job, JobPhoto } from "@/types/job";
import { ui } from "@/lib/ui-classes";
import { JobDetailClient } from "@/components/JobDetailClient";

interface JobDetailPageProps {
  params: Promise<{ id: string }>;
}

/**
 * The backend's GET /projects/:id applies the same
 * assertProjectVisible() check as every other project-scoped read
 * (Module 2's project.service.ts) — a technician requesting a job
 * that isn't theirs gets a 404 from the backend, which surfaces
 * here as the error state below, not this job's data.
 */
export default async function JobDetailPage({ params }: JobDetailPageProps) {
  const { id } = await params;
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(ACCESS_COOKIE_NAME)?.value;

  let job: Job | null = null;
  let photos: JobPhoto[] = [];
  let loadError: string | null = null;

  try {
    const [jobData, photosData] = await Promise.all([
      backendFetch<{ project: Job }>(`/projects/${id}`, { accessToken }),
      backendFetch<{ photos: JobPhoto[] }>(`/projects/${id}/photos`, { accessToken }),
    ]);
    job = jobData.project;
    photos = photosData.photos;
  } catch (err) {
    loadError = err instanceof BackendApiError ? err.message : "Could not load this job.";
  }

  return (
    <div className="flex flex-col gap-4">
      <Link href="/jobs" className="text-sm text-ink-muted">
        ← Back to jobs
      </Link>

      {loadError && <p className={ui.errorText}>{loadError}</p>}
      {job && <JobDetailClient initialJob={job} initialPhotos={photos} />}
    </div>
  );
}
