// ============================================================================
// TYPES MODULE 4 — Planification Temporelle
// APLS v3 — Terrain Corrections
// ============================================================================

// --- Planification multi-nuits ---
export interface MultiNightPlan {
  id: string;
  targetId: string;
  targetName: string;
  raDeg: number;
  decDeg: number;
  locationId: string;
  rigId: string;
  nights: PlannedNight[];
  createdAt: Date;
}

export interface PlannedNight {
  date: Date;
  sunset: Date;
  sunrise: Date;
  astroDusk: Date;
  astroDawn: Date;
  transitTime: Date;
  meridianFlipTime: Date;
  riseTime?: Date;
  setTime?: Date;
  hoursAboveHorizon: number;
  hoursAboveMask?: number;
  isVisible: boolean;
  moonPhase: number;
  moonAltitude: number;
  weatherScore?: number;
  imagingWindow: TimeWindow[];
}

export interface TimeWindow {
  start: Date;
  end: Date;
  type: 'imaging' | 'meridian_flip' | 'day' | 'weather_block';
  label: string;
}

// --- Yearly heatmap / waterfall ---
export interface YearlyVisibility {
  targetId: string;
  targetName: string;
  months: MonthlyVisibility[];
  blackNightsCount: number;
  totalImagingHours: number;
}

export interface MonthlyVisibility {
  month: number;
  monthName: string;
  hours: HourlyVisibility[];
  moonPhases: DailyMoonPhase[];
  isTargetVisible: boolean;
  totalVisibleHours: number;
}

export interface HourlyVisibility {
  hour: number;
  isVisible: boolean;
  altitude: number;
  isAboveHorizon: boolean;
  isAboveMask: boolean;
}

export interface DailyMoonPhase {
  day: number;
  phase: number;
  phaseName: string;
  isBlackNight: boolean;
}

// --- Export formats ---
export interface ExportPlanRequest {
  planId: string;
  format: 'nina_json' | 'asiair_json' | 'csv_generic';
  includeMeridianFlip: boolean;
  includeDithering: boolean;
}

export interface NINASequence {
  targetName: string;
  ra: string;
  dec: string;
  rotation: number;
  exposureTime: number;
  totalSubs: number;
  filter: string;
  binning: number;
  gain: number;
  offset: number;
  meridianFlip: boolean;
  dithering: boolean;
}

export interface ASIAIRPlan {
  planName: string;
  target: string;
  ra: string;
  dec: string;
  exposure: number;
  count: number;
  filter: string;
  delay: number;
}

// --- Requêtes API ---
export interface MultiNightPlanRequest {
  targetId: string;
  locationId: string;
  rigId: string;
  nightsCount: number;
  startDate?: string;
  useHorizonMask?: boolean;
}

export interface YearlyVisibilityRequest {
  targetId: string;
  locationId: string;
  year?: number;
}

// --- Meridian flip ---
export interface MeridianFlipInfo {
  targetId: string;
  date: Date;
  transitTime: Date;
  flipTime: Date;
  preFlipMinutes: number;
  postFlipMinutes: number;
  recommendation: string;
}
