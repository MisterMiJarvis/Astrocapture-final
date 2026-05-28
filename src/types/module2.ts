// ============================================================================
// TYPES MODULE 2 — Équipement, Échantillonnage & Guidage
// APLS v3
// ============================================================================

/** Type de télescope */
export type TelescopeType = 'Refractor' | 'Reflector' | 'SCT' | 'RC' | 'CDK' | 'Newtonian' | 'Maksutov';

/** Type de modificateur optique */
export type ModifierType = 'None' | 'Reducer' | 'Corrector' | 'Reducer-Corrector' | 'Flattener' | 'Barlow';

/** Type de monture */
export type MountType = 'EQ' | 'AZ' | 'AltAz' | 'Dobsonian' | 'Fork';

/** Mode de guidage */
export type GuidingMode = 'GuideScope' | 'OAG' | 'Integrated';

/** Profil de rig complet */
export interface RigProfile {
  id: string;
  name: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
  
  // Tube optique
  telescope: {
    name: string;
    focalLength: number;        // mm (focale native)
    aperture: number;           // mm (diamètre)
    fRatio: number;             // f/D calculé
    type: TelescopeType;
  };
  
  // Modificateur optique
  modifier: {
    type: ModifierType;
    factor: number;             // ex: 0.73, 0.8, 1.0, 2.0
  };
  
  // Capteur d'imagerie
  camera: {
    name: string;
    sensorWidth: number;        // mm
    sensorHeight: number;       // mm
    pixelSize: number;          // μm
    resolutionX: number;        // px
    resolutionY: number;        // px
    readNoise: number;          // e⁻
    quantumEfficiency: number;  // 0-1
    isColor: boolean;
    hasCooling: boolean;
    binningAcquisition: 1 | 2;  // 1x1 ou 2x2
  };
  
  // Guidage
  guiding: {
    cameraName: string;
    pixelSize: number;          // μm
    binning: 1 | 2;
    mode: GuidingMode;
    focalLength?: number;       // mm (focale guidage)
  };
  
  // Monture
  mount: {
    name: string;
    type: MountType;
    maxPayload: number;         // kg
  };
}

/** Valeurs calculées automatiquement */
export interface RigCalculations {
  effectiveFocalLength: number;  // mm
  pixelScale: number;            // "/px
  fovWidth: number;              // arcmin
  fovHeight: number;             // arcmin
  fRatio: number;                // f/D effectif
  
  // Guidage
  guidingPixelScale?: number;    // "/px
  guidingRatio?: number;        // imaging/guide
  guidingRatioValid?: boolean;
  
  // Dither
  recommendedDitherPixels?: number;
}

/** Recommandation d'échantillonnage */
export interface SamplingRecommendation {
  status: 'undersampled_critical' | 'undersampled_moderate' | 'ideal' | 'oversampled';
  drizzleRecommendation: '2x_aggressive' | '2x' | 'none' | 'bin2x2';
  pixelDrop?: number;            // pour Drizzle
  explanation: string;
  ditherRequired: boolean;
  ditherMinPixels: number;
  colorCode: 'red' | 'orange' | 'green' | 'blue';
}

/** Configuration de dithering */
export interface DitherConfig {
  imagingPixelScale: number;     // "/px
  guidingPixelScale: number;     // "/px
  desiredDitherArcsec: number;   // " (décalage souhaité sur capteur principal)
  ditherPixelsImaging: number;   // px sur capteur principal
  ditherPixelsGuiding: number;   // px à entrer dans PHD2/NINA/ASIAIR
}

/** Point du masque d'horizon */
export interface HorizonPoint {
  azimuth: number;   // 0-360°
  altitude: number;  // 0-90°
}

/** Masque d'horizon */
export interface HorizonMask {
  id: string;
  name: string;
  locationId?: string;
  points: HorizonPoint[];
  format: 'csv' | 'yaml';
}

/** DTO pour créer/mettre à jour un profil */
export interface CreateRigProfileDTO {
  name: string;
  telescope: RigProfile['telescope'];
  modifier: RigProfile['modifier'];
  camera: RigProfile['camera'];
  guiding: RigProfile['guiding'];
  mount: RigProfile['mount'];
  isDefault?: boolean;
}

/** DTO pour la configuration guidage seule */
export interface GuidingConfigDTO {
  cameraName: string;
  pixelSize: number;
  binning: 1 | 2;
  mode: GuidingMode;
  focalLength?: number;
}

/** Export/Import de profil */
export interface RigProfileExport {
  version: 'apls-v3';
  profile: RigProfile;
  exportedAt: string;
}
