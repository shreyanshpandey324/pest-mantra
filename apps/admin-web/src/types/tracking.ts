export interface MileageLogEntry {
  technicianId: string;
  technicianName?: string;
  dutyStartAt: string;
  dutyEndAt?: string;
  odometerStart: number;
  odometerEnd?: number;
  distanceKm?: number;
}

export interface LocationLogEntry {
  technicianId: string;

  technicianName: string;

  employeeCode: string | null;

  dutyStatus: string | null;

  latitude: number;

  longitude: number;

  accuracy: number;

  speed: number;

  heading: number;

  batteryLevel: number | null;

  isCharging: boolean | null;

  recordedAt: string;

  ageSeconds: number;

  isLive: boolean;
}

export interface ProjectWithAssignedTechnicians {
  assignedTechnicians?: string[];
}