/**
 * ⚠️ UNVERIFIED AGAINST ACTUAL BACKEND CODE ⚠️
 *
 * Everything in this file is based on the field names and shapes
 * described in MODULE_3_TECHNICIAN_TRACKING.md (an audit/summary
 * document), not on the real backend source (models/controllers)
 * for MileageLog, LocationLog, or the updated Project schema — that
 * source was never provided. If your actual backend uses different
 * field names (e.g. `totalDistanceKm` instead of `distanceKm`), fix
 * the mismatches here and in the API route handlers under
 * `src/app/api/mileage/` and `src/app/api/tracking/` — those are
 * the only two places these shapes are used.
 */

export interface MileageLogEntry {
  technicianId: string;
  technicianName?: string; // present if the backend populates/joins the technician
  dutyStartAt: string;
  dutyEndAt?: string;
  odometerStart: number;
  odometerEnd?: number;
  distanceKm?: number;
}

export interface LocationLogEntry {
  technicianId: string;
  technicianName?: string;
  timestamp: string;
  lat: number;
  lng: number;
}

/**
 * The audit doc describes Project being updated with
 * `assignedTechnicians: ObjectId[]` for multi-technician support.
 * This app's own Project type (see project.ts) still has the
 * single `assignedTechnicianId` from Modules 1-2 — that model was
 * NOT changed here (backend is frozen/out of scope). This extra
 * optional field lets the UI show multi-technician data *if* the
 * connected backend actually returns it, without assuming it will.
 */
export interface ProjectWithAssignedTechnicians {
  assignedTechnicians?: string[];
}
