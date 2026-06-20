// ============================================================================
// TYPES MODULE 1 — Dashboard Central & Exploration
// APLS v3 — Terrain Corrections
// ============================================================================

import { FilterType } from './module5';

// ─────────────────────────────────────────────────────────────────────────────
// Best Targets Tonight filters
// ─────────────────────────────────────────────────────────────────────────────

export interface BestTargetFilters {
  lat: number;
  lon: number;
  timezone?: string;
  minAlt?: number;
  magMax?: number;
  subrMax?: number;
  sizeMin?: number;
  sizeMax?: number;
  moonIllumMax?: number;
  moonDistMin?: number;
  minImagingHours?: number;
  types?: string;
  page?: number;
  perPage?: number;
}

// --- Localisation astronomique du setup ---
export interface AstroLocation {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  elevation: number;
  timezone: string;
  bortleScale: number;
  sqmBase: number;
}

// --- Profil de rig complet (simplifié pour Module 1) ---
export interface RigProfileSummary {
  id: string;
  name: string;
  isDefault: boolean;
  focalLength: number;
  aperture: number;
  pixelSize: number;
  sensorWidth: number;
  sensorHeight: number;
  binningAcquisition: number;
}

// --- Données météo prévisionnelles ---
export interface WeatherForecast {
  date: Date;
  hourly: HourlyWeather[];
  nightly: NightlyWeather[];
  weeklyHeatmap: WeeklyWeatherDay[];
}

export interface HourlyWeather {
  time: Date;
  temperature: number;
  dewpoint: number;
  humidity: number;
  cloudTotal: number;
  cloudLow: number;
  cloudMid: number;
  cloudHigh: number;
  windSpeed: number;
  windGusts: number;
  precipitation: number;
  seeing?: number;
  astroIndex: number;
  isImagingWindow: boolean;
  skyCondition: 'Clear' | 'Mostly Clear' | 'Partly Cloudy' | 'Mostly Cloudy' | 'Overcast';
  dewRisk: 'Safe' | 'Warning' | 'Critical';
  dewPointDelta: number;
}

export interface NightlyWeather {
  date: Date;
  minTemp: number;
  maxTemp: number;
  avgCloudCover: number;
  precipitationChance: number;
  moonPhase: string;
  condition: 'Excellent' | 'Good' | 'Fair' | 'Poor';
  summary: string;
}

export interface WeeklyWeatherDay {
  date: Date;
  astroScore: number;
  cloudCoverNight: number;
  seeing: number;
  moonPhase: number;
  isBlackNight: boolean;
  isGoodForImaging: boolean;
}

// --- Cible astronomique (DSO) ---
export interface AstroTarget {
  id: string;
  name: string;
  catalogName: string;
  ra: string;
  dec: string;
  raDeg: number;
  decDeg: number;
  type: 'Galaxy' | 'Nebula' | 'Cluster' | 'Supernova' | 'Quasar';
  subtype: string;
  magnitude: number | null;
  surfaceBrightness?: number | null;
  sizeArcmin: number | null;
  sizeArcminX?: number;
  sizeArcminY?: number;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced' | 'Expert';
  recommendedFilters: FilterType[];
  // Telescopius type codes for dynamic filter matching
  telescopiusTypes?: string[];
  // Visibility
  altitudeMax?: number;
  altitudeCurrent?: number;
  transitTime?: Date;
  setTime?: Date;
  riseTime?: Date;
  moonSeparation?: number;
  isVisible: boolean;
  isAboveHorizon: boolean;
  isInImagingWindow: boolean;
  // Imaging
  imagingWindows: ImagingWindow[];
  totalImagingHours: number;
  // UI
  imageUrl?: string | null;
  constellation?: string;
  commonNames?: string[];
  novaRank: number;
  scoreDetails: NovaScoreDetails;
}

export interface ImagingWindow {
  start: string;
  end: string;
  hours: number;
  moonIllumination: number | null;
  moonDistance: number | null;
}

export interface NovaScoreDetails {
  altitudeScore: number;
  timeToTransitScore: number;
  moonScore: number;
  filterScore: number;
  visibilityScore: number;
  imagingHours: number;
  framingFit: 'perfect' | 'good' | 'tight' | 'too_large' | 'unknown';
  coveragePercent: number | null;
}

// --- Projet d'imagerie ---
export type ProjectStatus =
  | 'waiting_weather'
  | 'waiting_moon'
  | 'in_progress'
  | 'paused'
  | 'ready_processing'
  | 'completed';

export interface ImagingProject {
  id: string;
  targetId: string;
  targetName: string;
  status: ProjectStatus;
  rigId: string;
  locationId: string;
  targetIntegrationTime: number;
  capturedIntegrationTime: number;
  progress: number;
  weatherScore: number;
  createdAt: Date;
  updatedAt: Date;
  priority: 'low' | 'medium' | 'high' | 'critical';
  notes: string;
  sessionsCount?: number;
}

// --- KPIs globaux pour le Dashboard ---
export interface DashboardKPIs {
  totalIntegrationTime: number;
  totalSessionsCompleted: number;
  totalProjectsCompleted: number;
  activeProjectsCount: number;
  averageGuidingRMS: number;
  bestGuidingRMS: number;
  worstGuidingRMS: number;
  filterDistribution: FilterDistributionItem[];
  monthlyIntegrationTrend: MonthlyTrendItem[];
  mountHealthScore: number;
  lastMaintenanceDate?: Date;
}

export interface FilterDistributionItem {
  filter: FilterType;
  hours: number;
  percentage: number;
}

export interface MonthlyTrendItem {
  month: string;
  hours: number;
}

// --- Données agrégées Dashboard ---
export interface DashboardData {
  location: AstroLocation;
  currentRig: RigProfileSummary | null;
  weather: WeatherForecast | null;
  targetsTonight: AstroTarget[];
  activeProjects: ImagingProject[];
  kpis: DashboardKPIs;
  isNightMode: boolean;
}

// --- Suggestion Telescopius ---
export interface TelescopiusSuggestion {
  id: string;
  name: string;
  catalogName: string;
  raDeg: number;
  decDeg: number;
  type: string;
  magnitude: number | null;
  sizeArcmin: number | null;
  altitudeMax: number;
  imageUrl?: string;
  badges: string[];
}

// --- DTOs API ---
export interface DashboardQueryParams {
  locationId?: string;
  rigId?: string;
  date?: string;
}

export interface TargetsTonightQuery {
  lat: number;
  lon: number;
  rigId?: string;
  minAltitude?: number;
  maxMoonSeparation?: number;
  filterType?: FilterType;
  limit?: number;
}

export interface NightModeState {
  enabled: boolean;
  theme: 'red' | 'dark';
}
