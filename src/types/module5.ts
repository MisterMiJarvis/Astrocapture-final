// ============================================================================
// TYPES MODULE 5 — Environnement, Filtres & Calculateur d'Exposition
// APLS v3 — Terrain Corrections
// ============================================================================

export type FilterType = 'UV_IR_Cut' | 'L_Ultimate' | 'LPS_D2' | 'Ha' | 'OIII' | 'SII' | 'RGB' | 'Luminance';

export type DewRiskLevel = 'Safe' | 'Warning' | 'Critical';

/** Profil de transmission d'un filtre */
export interface FilterProfile {
  type: FilterType;
  name: string;
  bandwidthNm: number;          // largeur de bande en nm
  transmission: number;         // τ (0-1)
  skySuppression: number;       // 0-1
  color: string;                // hex pour UI
  description: string;
  useCases: string[];
  moonCompatible: boolean;
  recommendedTargets: string[];
}

/** Modélisation SQM avec dégradation lunaire */
export interface SQMDynamicModel {
  sqmBase: number;              // mag/arcsec² sans Lune
  sqmEffective: number;         // mag/arcsec² avec Lune
  moonPhase: number;            // 0-1
  moonAltitude: number;         // degrés
  moonAzimuth: number;          // degrés
  targetMoonSeparation: number; // degrés (calculé par trigonométrie sphérique)
  bortleScale: number;          // 1-9
  degradation: number;          // mag de dégradation
}

/** Paramètres de calcul d'exposition */
export interface ExposureParams {
  skyMagnitude: number;         // mag/arcsec² (SQM effectif)
  aperture: number;             // mm
  pixelSize: number;            // μm
  focalLength: number;          // mm
  quantumEfficiency: number;    // 0-1
  filterTransmission: number;   // τ
  readNoise: number;            // e⁻
  kFactor: number;              // 5 ou 10
}

/** Résultat du calculateur d'exposition */
export interface ExposureResult {
  subExposureTime: number;      // secondes optimales
  totalSubsForSNR: number;      // nombre de poses pour SNR cible
  totalIntegrationTime: number; // minutes totales
  bSky: number;                 // e⁻/px/sec
  swampingFactor: number;       // B_sky / RN²
  recommendation: string;
  warning?: string;
  fluxSky: number;              // Φ_sky
  apertureArea: number;         // m²
}

/** Impact du réducteur */
export interface ReducerImpact {
  withoutReducer: ExposureResult;
  withReducer: ExposureResult;
  ratio: number;                // t_optimum sans / t_optimum avec
  timeSavedPercent: number;
}

/** Point de simulation SNR */
export interface SNRPoint {
  subsCount: number;
  subDuration: number;
  totalMinutes: number;
  snr: number;
}

/** Simulateur SNR */
export interface SNRSimulation {
  params: ExposureParams;
  targetSNR: number;
  points: SNRPoint[];
  subsToReachTarget: number;
  minutesToReachTarget: number;
}

/** Conditions environnementales pour un session */
export interface EnvironmentConditions {
  temperature: number;          // °C
  dewpoint: number;             // °C
  humidity: number;             // %
  cloudCover: number;         // %
  windSpeed: number;            // km/h
  seeing: number;               // Antoniadi I-V
  sqm: SQMDynamicModel;
  dewRisk: DewRiskLevel;
  dewPointDelta: number;        // °C (T - T_dew)
}

/** Alerte Dashboard pour rosée */
export interface DewAlert {
  level: DewRiskLevel;
  message: string;
  recommendation: string;
  delta: number;
}

/** DTO pour requête calculateur */
export interface ExposureCalculatorRequest {
  rigId: string;
  locationId: string;
  filterType: FilterType;
  kFactor: 5 | 10;
  moonPhase?: number;
  moonAltitude?: number;
  targetRADeg?: number;
  targetDecDeg?: number;
}

/** DTO pour requête simulateur SNR */
export interface SNRSimulatorRequest {
  rigId: string;
  locationId: string;
  filterType: FilterType;
  targetSNR: number;
  maxSubs: number;
  subDurationSeconds?: number;
}
