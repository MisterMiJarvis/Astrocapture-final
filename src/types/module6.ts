// ============================================================================
// TYPES MODULE 6 — Projets, Logs & Analyse Post-Session
// APLS v3 — Terrain Corrections
// ============================================================================

import { FilterType } from './module5';

// --- Plan de capture par filtre ---
export interface FilterPlan {
  filter: FilterType;
  targetSubs: number;
  targetSubLength: number;
  targetTotalTime: number;
  capturedSubs: number;
  capturedTime: number;
  isComplete: boolean;
}

// --- Session d'observation ---
export interface ImagingSession {
  id: string;
  projectId: string;
  date: Date;
  startTime: Date;
  endTime?: Date;
  status: 'planned' | 'in_progress' | 'completed' | 'cancelled';
  locationId: string;
  totalIntegrationTime: number;
  guidingRMS?: number;
  guidingRMSArcsec?: number;
  imagesCount: number;
  notes: string;
}

// --- Pose individuelle ---
export interface SubExposure {
  id: string;
  sessionId: string;
  filter: FilterType;
  duration: number;
  gain?: number;
  offset?: number;
  temperature?: number;
  guidingRMS?: number;
  starsDetected?: number;
  fwhm?: number;
  eccentricity?: number;
  fileName: string;
  isValid: boolean;
}

// --- Log de session ---
export interface SessionLog {
  timestamp: Date;
  level: 'info' | 'warning' | 'error' | 'success';
  category: 'weather' | 'guiding' | 'acquisition' | 'focus' | 'mount' | 'dither' | 'system';
  message: string;
  data?: Record<string, any>;
}

// --- Résumé guidage PHD2 ---
export interface GuidingLogSummary {
  totalRMS: number;
  rmsRA: number;
  rmsDec: number;
  peakRA: number;
  peakDec: number;
  starMass: number;
  snr: number;
  elapsedTime: number;
  samplesCount: number;
  ditherCount: number;
  ditherSettleTime: number;
}

// --- Log PHD2 parsé ---
export interface PHD2Log {
  id: string;
  sessionId: string;
  fileName: string;
  importDate: Date;
  guidingData: PHD2GuidingData;
  ditherData: PHD2DitherData;
  timeline: PHD2Event[];
  calibrationData?: PHD2Calibration;
}

export interface PHD2GuidingData {
  rmsTotalPixels: number;
  rmsTotalArcsec: number;
  pixelScaleGuiding: number;
  rmsRA: number;
  rmsDec: number;
  peakRA: number;
  peakDec: number;
  starMass: number;
  starMassMin: number;
  starMassMax: number;
  snr: number;
  samples: number;
  duration: number;
}

export interface PHD2DitherData {
  count: number;
  settleTimeAvg: number;
  settleTimeMax: number;
  failedSettles: number;
}

export interface PHD2Event {
  timestamp: Date;
  type: 'guide' | 'dither' | 'settle' | 'calibrate' | 'starlost' | 'resumed';
  ra?: number;
  dec?: number;
  rms?: number;
  starMass?: number;
  snr?: number;
}

export interface PHD2Calibration {
  calibrated: boolean;
  raRate: number;
  decRate: number;
  raAngle: number;
  decAngle: number;
  orthogonalityError: number;
}

// --- Log N.I.N.A. / ASIAIR parsé ---
export interface NINALog {
  id: string;
  sessionId: string;
  fileName: string;
  importDate: Date;
  timeline: NINAEvent[];
  autofocusRuns: AutofocusRun[];
  ditherEvents: DitherEvent[];
  weatherTrends: WeatherTrend[];
}

export interface NINAEvent {
  timestamp: Date;
  type: 'exposure_start' | 'exposure_end' | 'filter_change' | 'dither' | 'autofocus' | 'meridian_flip' | 'pause' | 'resume' | 'abort';
  filter?: FilterType;
  duration?: number;
  temperature?: number;
  fwhm?: number;
}

export interface AutofocusRun {
  timestamp: Date;
  filter: FilterType;
  temperature: number;
  focuserPosition: number;
  curveV: {
    positions: number[];
    hfrValues: number[];
    bestPosition: number;
    bestHfr: number;
  };
  isSuccessful: boolean;
}

export interface DitherEvent {
  timestamp: Date;
  settleTime: number;
  isSuccessful: boolean;
}

export interface WeatherTrend {
  timestamp: Date;
  temperature: number;
  humidity: number;
  cloudCover: number;
  windSpeed: number;
}

// --- Sync Telescopius ---
export interface TelescopiusSyncStatus {
  projectId: string;
  lastSyncAt?: Date;
  syncDirection: 'push' | 'pull' | 'bidirectional';
  sessionsSynced: number;
  imagesSynced: number;
  status: 'idle' | 'syncing' | 'error';
  errorMessage?: string;
}

// --- Rapport PDF ---
export interface PDFReportRequest {
  sessionId?: string;
  projectId?: string;
  type: 'session' | 'project' | 'historical';
  includeGuiding: boolean;
  includeWeather: boolean;
  includeTimeline: boolean;
  includeGallery: boolean;
}

export interface PDFReport {
  id: string;
  generatedAt: Date;
  url: string;
  sizeBytes: number;
  pages: number;
}

// --- DTOs API ---
export interface PHD2ImportRequest {
  sessionId: string;
  fileContent: string;
  fileName: string;
  pixelScaleImaging: number;
}

export interface NINAImportRequest {
  sessionId: string;
  fileContent: string;
  fileName: string;
}

export interface ProjectDetail {
  id: string;
  targetId: string;
  targetName: string;
  targetRa: string;
  targetDec: string;
  status: string;
  rigId: string;
  locationId: string;
  targetIntegrationTime: number;
  capturedIntegrationTime: number;
  progress: number;
  weatherScore: number;
  priority: string;
  notes: string;
  createdAt: Date;
  updatedAt: Date;
  filterPlans: FilterPlan[];
  sessions: ImagingSession[];
}
