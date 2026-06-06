// ============================================================================
// TYPES — Astrophotography Projects
// ============================================================================

export type ProjectStatus = 'planning' | 'in_progress' | 'completed' | 'archived';

export interface ProjectObservation {
  id: string;
  date: string;                 // ISO date
  exposuresTaken: number;
  exposureDuration: number;     // seconds per sub
  filter: string;
  seeing: number | null;        // arcsec FWHM
  guidingRms: number | null;    // arcsec
  moonIllumination: number | null;
  notes: string;
  createdAt: string;
}

export interface ProjectImagingWindow {
  start: string;
  end: string;
  hours: number;
  moonIllumination: number | null;
  moonDistance: number | null;
}

export interface ProjectExposurePlan {
  filter: string;
  subExposure: number;         // seconds
  subCount: number;
  totalExposureTime: number;   // seconds
  snrEstimate: string;
}

export interface Project {
  id: string;
  title: string;
  status: ProjectStatus;

  // Target info
  targetId: string;
  targetName: string;
  targetType: string;
  targetRa: string;
  targetDec: string;
  targetMagnitude: number | null;
  targetSizeArcmin: number | null;
  targetImageUrl: string | null;

  // Location
  locationSource: string;
  lat: number;
  lon: number;

  // Rig
  rigId: string | null;
  rigName: string | null;
  focalLength: number | null;
  aperture: number | null;
  pixelSize: number | null;
  sensorWidth: number | null;
  sensorHeight: number | null;

  // Imaging plan
  primaryFilter: string;
  exposurePlan: ProjectExposurePlan[];
  totalPlannedHours: number;

  // Observations
  observations: ProjectObservation[];

  // Computed progress
  totalExposureSeconds: number;
  completionPercent: number;

  // Metadata
  createdAt: string;
  updatedAt: string;
}

export interface CreateProjectData {
  title: string;
  targetId: string;
  targetName: string;
  targetType: string;
  targetRa: string;
  targetDec: string;
  targetMagnitude: number | null;
  targetSizeArcmin: number | null;
  targetImageUrl: string | null;
  locationSource: string;
  lat: number;
  lon: number;
  rigId: string | null;
  primaryFilter: string;
}

export interface AddObservationData {
  date: string;
  exposuresTaken: number;
  exposureDuration: number;
  filter: string;
  seeing?: number | null;
  guidingRms?: number | null;
  moonIllumination?: number | null;
  notes?: string;
}