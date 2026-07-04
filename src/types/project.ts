// ============================================================================
// TYPES — Astrophotography Projects
// ============================================================================

export type ProjectStatus = 'planning' | 'in_progress' | 'completed' | 'archived';

/** SNR target quality levels — drives total integration time */
export type SNRTarget = 15 | 30 | 60 | 100;

export const SNR_TARGET_CONFIG: Record<SNRTarget, { label: string; description: string; icon: string }> = {
  15: { label: 'Aperçu rapide', description: 'Preview — visible but noisy', icon: '⚡' },
  30: { label: 'Bonne qualité', description: 'Good — clean details, some noise in shadows', icon: '📸' },
  60: { label: 'Qualité publication', description: 'Publication — smooth, low noise, print-ready', icon: '🏆' },
  100: { label: 'Chef-d\'œuvre ciel profond', description: 'Masterpiece — ultra-deep, maximum detail', icon: '💎' },
};

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
  subExposureMin: number;      // minimum recommended sub (seconds)
  subExposureMax: number;      // maximum recommended sub (seconds)
  subCount: number;
  totalExposureTime: number;   // seconds
  totalWithOverhead: number;    // seconds (including dither/download overhead)
  snrEstimate: string;
  snrValue: number;            // computed SNR value
  skyElectronRate: number;     // e-/px/s from sky (includes dark current)
  objectElectronRate: number;  // e-/px/s from object
  sampling: number;            // arcsec/pixel
  darkCurrent: number;         // e-/px/s
  tauSignal: number;            // filter transmission for object signal
  tauSky: number;               // filter transmission for sky background

  // ─── Exposure Tracking (Point 1) ─────────────────────────────────────
  // Snapshot of what the formula initially calculated vs what the user set.
  // Populated at project creation/edit; used to refine the formula over time.
  formulaSnapshot?: ExposureFormulaSnapshot;
}

/**
 * Snapshot of the formula calculation at the time the project was created/edited.
 * Stores both the formula inputs (for correlation) and outputs (for comparison).
 */
export interface ExposureFormulaSnapshot {
  formulaVersion: string;        // e.g. "V9"
  // Inputs that fed the formula
  inputs: {
    sqm: number;
    bortle: number;
    moonIllumination: number;
    moonAltitudeDeg: number;
    moonPhaseFactor: number;
    filter: string;
    aperture: number;
    focalLength: number;
    pixelSize: number;
    readNoise: number;
    quantumEfficiency: number;
    objectType: string;
    objectSurfaceBrightness: number;
    objectDiameterArcmin: number;
    isEmissionNebula: boolean;
  };
  // What the formula calculated
  formulaOutput: {
    subExposure: number;         // tSub (seconds)
    subCount: number;            // nSubs
    totalExposureTime: number;   // seconds
    snrValue: number;
    snrEstimate: string;
  };
  // What the user actually set (if different from formula)
  adjustedOutput?: {
    subExposure: number;
    subCount: number;
    adjustedAt: string;          // ISO timestamp
    reason?: string;             // why the adjustment (optional)
    skyToolsReference?: string;  // what SkyTools said (optional)
  };
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
  surfaceBrightness: number | null;
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

  // SNR target
  snrTarget: SNRTarget;

  // Imaging plan
  primaryFilter: string;
  primaryFilterId?: string | null; // ID of the actual AstroFilter from filter collection
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
  surfaceBrightness: number | null;
  targetImageUrl: string | null;
  locationSource: string;
  lat: number;
  lon: number;
  rigId: string | null;
  primaryFilter: string;
  snrTarget?: SNRTarget;
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