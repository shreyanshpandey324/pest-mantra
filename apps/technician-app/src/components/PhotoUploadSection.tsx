"use client";

import { useRef, useState } from "react";
import { JobPhoto, PhotoType } from "@/types/job";
import { ui } from "@/lib/ui-classes";

interface PhotoUploadSectionProps {
  jobId: string;
  photoType: PhotoType;
  photos: JobPhoto[];
  onUploaded: (photo: JobPhoto) => void;
}

export function PhotoUploadSection({ jobId, photoType, photos, onUploaded }: PhotoUploadSectionProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const matchingPhotos = photos.filter((p) => p.photoType === photoType);
  const label = photoType === PhotoType.BEFORE ? "Before" : "After";

  async function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same file name later
    if (!file) return;

    setError(null);
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("photo", file);
      formData.append("photoType", photoType);

      const res = await fetch(`/api/jobs/${jobId}/photos`, { method: "POST", body: formData });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json.message ?? "Could not upload this photo.");
        return;
      }
      onUploaded(json.data.photo);
    } catch {
      setError("Unable to reach the server. Please try again.");
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <p className={ui.label}>{label} photos</p>
        <span className="font-mono text-xs text-ink-faint">{matchingPhotos.length} added</span>
      </div>

      {matchingPhotos.length > 0 && (
        <div className="mb-3 grid grid-cols-3 gap-2">
          {matchingPhotos.map((photo) => (
            // eslint-disable-next-line @next/next/no-img-element -- authenticated job photos are streamed through the same-origin BFF route
            <img
              key={photo._id}
              src={`/api/jobs/${encodeURIComponent(jobId)}/photos/${encodeURIComponent(photo._id)}`}
              alt={`${label} photo`}
              className="aspect-square w-full rounded-lg border border-border-default object-cover"
            />
          ))}
        </div>
      )}

      {error && <p className={`${ui.errorText} mb-2`}>{error}</p>}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileSelected}
      />
      <button
        type="button"
        className={ui.btnActionSecondary}
        onClick={() => inputRef.current?.click()}
        disabled={isUploading}
        aria-busy={isUploading}
      >
        {isUploading ? "Uploading…" : `+ Add ${label} Photo`}
      </button>
    </div>
  );
}
