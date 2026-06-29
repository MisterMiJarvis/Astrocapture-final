// ============================================================================
// TYPES MODULE 5 — Environnement, Filtres & Calculateur d'Exposition
// AstroCapture v5 — Pipeline Physique Refactorisé
// ============================================================================

import { ObjectType } from '../services/module5/exposureCalculator';

export type FilterType = 'UV_IR_Cut' | 'L_Ultimate' | 'LPS_D2' | 'Ha' | 'OIII' | 'SII' | 'RGB' | 'Luminance';

export type DewRiskLevel = 'Safe' | 'Warning' | 'Critical';

/** Profil de transmission d'un filtre */
export interface FilterProfile {
  type: FilterType;
  name: string;
  bandwidthNm: number;              // largeur de bande en nm
  transmission: number;             // τ_filter (transmission au pic)
  skySuppression: number;          // 0-1 (réduction du fond de ciel)
  continuumTransmission: number;   // 0-1 (transmission du spectre continu — galaxies)
  color: string;                    // hex pour UI
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

/** Paramètres de calcul d'exposition (v5) */
export interface ExposureParams {
  // Équipement & Capteur
  aperture: number;             // D — diamètre du télescope en mm
  focalLength: number;          // F — focale native du télescope en mm
  reducerFactor?: number;       // f_R — multiplicateur du réducteur (défaut: 1.0)
  pixelSize: number;            // p — taille des pixels en µm
  readNoise: number;            // RN — bruit de lecture en e⁻
  darkCurrent?: number;          // dc — courant d'obscurité en e⁻/px/s (défaut: 0.0005)
  quantumEfficiency: number;    // QE — efficacité quantique (0-1)
  kFactor: number;              // k — facteur de swamping (5 ou 10)

  // Environnement local & éphémérides
  skyMagnitude: number;         // m_sky — SQM effectif (mag/arcsec²)
  moonAltitudeDeg?: number;     // altitude de la Lune en degrés (défaut: 0)
  moonPhaseFactor?: number;     // intensité phase lunaire 0-3.5 (défaut: 0)
  moonSeparationDeg?: number;   // distance angulaire cible-Lune en degrés (défaut: 180)

  // Cible (objet)
  objectSurfaceBrightness?: number;  // SB_obj — brillance de surface (mag/arcsec²)
  objectDiameterArcmin?: number;      // diamètre apparent en minutes d'arc
  isEmissionNebula?: boolean;         // true = émission, false = continuum (galaxies/amas)
  targetName?: string;                // nom de la cible (pour auto-détection k_calib)
  objectType?: ObjectType;            // type d'objet (surcharge manuelle du k_calib)

  // Filtre (rétro-compat — l'UI passe ces valeurs)
  filterTransmission: number;   // τ_filter
  skySuppression?: number;      // réduction du fond de ciel (rétro-compat)
}

/** Résultat du calculateur d'exposition (v5) */
export interface ExposureResult {
  subExposureTime: number;      // t_sub — secondes optimales (clamped 30-600)
  totalSubsForSNR: number;      // N_subs — nombre de poses pour SNR cible
  totalIntegrationTime: number; // minutes totales
  totalIntegrationHours: number; // heures totales (v5)

  // Variables intermédiaires (v5 — pour debug/affichage)
  sqmEffective: number;         // SQM après dégradation lunaire
  sampling: number;              // arcsec/pixel
  bSky: number;                 // B_sky — e⁻/px/sec
  sObj: number;                  // S_obj — e⁻/px/sec (signal objet)
  fluxSky: number;               // Φ_sky — photons/m²/s/arcsec²
  apertureArea: number;          // A — m²
  swampingFactor: number;       // B_sky / RN²
  snrPerSub: number;             // SNR unitaire par pose
  contrast: number;              // S_obj / B_sky
  effectiveTargetSNR: number;    // SNR cible effectif (après pondération taille)
  tOptimumRaw: number;           // t_optimum avant clamping
  kDynamic: number;              // k effectif utilisé (2.5 narrowband, 5.0 broadband) — v6

  // Recommandations
  recommendation: string;
  warning?: string;
}

/** Impact du réducteur (rétro-compat) */
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