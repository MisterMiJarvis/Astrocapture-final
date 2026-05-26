

export enum ViewState {
  GALLERY,
  POST_DETAIL,
  POST_PROCESSING,
  PROCESSING_POST_DETAIL,
  IMAGE_OF_THE_DAY,
  ABOUT,
  LICENSE,
  LEGAL_NOTICE,
  ADMIN_LOGIN,
  ADMIN_DASHBOARD,
  ASTRO_INDEX,
  BEST_TARGETS,
  WALL_OF_IMAGES,
  GEAR_REVIEWS,
  OBSERVATION_PLANNER,
  EQUIPMENT_V2,
  SESSION_PLANNER,
  JOURNAL,
  ASK_HAL,
  LOGIN,
  // Nova DSO Tracker features
  NOVA_MOSAIC,
  NOVA_LOG_ANALYZER,
  NOVA_YEARLY_HEATMAP,
  NOVA_EQUIPMENT_CALC,
  // Telescopius API Testing
  TELESCOPIUS_TEST,
  // APLS v3 — Module 2
  APLS_MODULE2,
  // APLS v3 — Modules 1,3,4,5,6
  APLS_MODULE1,
  APLS_MODULE3,
  APLS_MODULE4,
  APLS_MODULE5,
  APLS_MODULE6,
}

export interface HeroSlide {
  id: string;
  imageUrl: string;
  title: string;
  subtitle:string;
  description: string;
  linkText: string;
  linkUrl: string;
}

export interface APOD {
  copyright?: string;
  date: string;
  explanation: string;
  hdurl?: string;
  media_type: 'image' | 'video';
  service_version: string;
  title: string;
  url: string;
}

export interface AstrobinImage {
    title: string;
    url_gallery: string;
    user: string;
    description: string;
    likes: number;
    views: number;
    url_hd: string;
    resource_uri: string;
    astrobin_id: string;
}

export interface DeepSkyObject {
    id: string;
    commonName: string | null;
    objectType: string | null;
    constellation: string | null;
    rightAscension: string | null;
    declination: string | null;
    distance: number | null;
    distanceUnit: string;
    magnitude: number | null;
    catalogDenominations: string[] | null;
    composition: string[] | null;
    age: number | null;
    ageUnit: string;
    image?: string;
    difficulty?: 'Easy' | 'Medium' | 'Hard';
    angularSize?: { width: number; height: number }; // arcminutes
}

// Equipment with FOV-relevant specs for the Equipment Tracker feature
export interface AstroEquipment {
    id: string;
    name: string;
    category: 'Telescope' | 'Camera' | 'Mount' | 'Filter' | 'Accessory' | 'Software';
    imageUrl: string;
    // Telescope specs
    focalLength?: number;      // mm
    aperture?: number;         // mm
    fRatio?: number;           // f/x
    telescopeType?: string;    // Refractor, Reflector, Catadioptric, etc.
    // Camera specs  
    sensorWidth?: number;      // mm
    sensorHeight?: number;     // mm
    pixelSize?: number;        // micrometers
    resolution?: string;      // e.g. "3008x3008"
    cameraType?: string;       // Cooled CCD, DSLR, etc.
    // Mount specs
    payloadCapacity?: number;  // kg
    mountType?: string;        // EQ, Alt-Az, etc.
    // Filter specs
    filterType?: string;       // Broadband, Narrowband, etc.
    bandwidth?: number;        // nm
    // General
    specs: string;
    description: string;
    rating: number;
    isPersonal: boolean;       // true = owned, false = shared/remote observatory
}

export interface WorkflowStep {
  stepId: string;
  stepOrder: number;
  toolName: string;
  description: string;
  screenshotUrl?: string;
}

export interface ProcessingLog {
  id: string;
  parentImageId: string;
  totalIntegrationTime: string;
  bortleScale: number;
  softwareUsed: string[];
  workflowSteps: WorkflowStep[];
}

export interface AcquisitionLogEntry {
  id: string;
  date: string;
  filter: string;
  exposureCount: number;
  exposureLength: number;
}

export interface Post {
  id: string;
  title: string;
  imageUrl: string;
  objectName:string;
  captureDate: string;
  equipment: string;
  description: string;
  tags: string[];
  astrobinUrl?: string;
  rawDataUrl?: string;
  acquisitionLogs: AcquisitionLogEntry[];
  totalIntegrationTime: number;
  showOnWall?: boolean;
}

export interface ImageEntry {
  id: string;
  imageUrl: string;
  caption: string;
  showOnWall?: boolean;
}

export interface ProcessingPost {
  id: string;
  title: string;
  description: string;
  tags: string[];
  captureDate: string;
  postType: 'before-after' | 'research' | 'gallery' | 'gear-review';
  beforeImageUrl?: string;
  afterImageUrl?: string;
  featuredImageUrl?: string;
  galleryImages?: ImageEntry[];
  attachedAudioUrl?: string;
  attachedDocumentUrl?: string;
  showBeforeOnWall?: boolean;
  showAfterOnWall?: boolean;
  showFeaturedOnWall?: boolean;
  gearReviewData?: EquipmentItem;
}

export interface ProcessingConfig {
  title: string;
  subtitle: string;
  introParagraph: string;
}

export interface AboutConfig {
  title: string;
  subtitle: string;
  imageUrl: string;
  bio: string;
  gear: string[];
}

export interface FooterConfig {
  text: string;
  socialLinks: {
    instagram: string;
    twitter: string;
    facebook: string;
    youtube: string;
  };
}

export interface LicenseConfig {
  title: string;
  content: string;
}

export interface LegalNoticeConfig {
  title: string;
  content: string;
}

export interface CookieBannerConfig {
  enabled: boolean;
  title: string;
  message: string;
  acceptButtonText: string;
  declineButtonText: string;
}

export interface EquipmentItem {
  id: string;
  name: string;
  category: 'Camera' | 'Telescope' | 'Mount' | 'Filter' | 'Accessory' | 'Software' | 'Other';
  imageUrl: string;
  specs: string;
  description: string;
  rating: number;
  review: string;
}

export interface AppData {
  version: string;
  logoUrl: string;
  faviconUrl: string;
  posts: Post[];
  processingPosts: ProcessingPost[];
  heroSlides: HeroSlide[];
  about: AboutConfig;
  footer: FooterConfig;
  processingConfig: ProcessingConfig;
  license: LicenseConfig;
  legalNotice: LegalNoticeConfig;
  cookieBanner: CookieBannerConfig;
}

// This represents the nested object returned by the astronomy API
interface AstronomyApiObject {
  sunrise: string;
  sunset: string;
  moonrise: string;
  moonset: string;
  moon_phase: string;
  moon_illumination_percentage: number;
  morning: {
    astronomical_twilight_begin: string;
    astronomical_twilight_end: string;
  };
  evening: {
    astronomical_twilight_begin: string;
    astronomical_twilight_end: string;
  };
}

// The top-level response type from the API
export interface AstronomyData {
  astronomy: AstronomyApiObject;
}


export interface MappedAstronomyData {
  sunrise: string;
  sunset: string;
  moonrise: string;
  moonset: string;
  moonPhase: string;
  moonIllumination: string;
  fullNightBegins: string;
  fullNightEnds: string;
}

// Represents the raw hourly data from Open-Meteo
export interface AstroForecastResponse {
    time: string[];
    temperature_2m: number[];
    relative_humidity_2m: number[];
    dewpoint_2m: number[];
    precipitation: number[];
    cloud_cover: number[];
    cloud_cover_low: number[];
    cloud_cover_mid: number[];
    cloud_cover_high: number[];
    wind_speed_10m: number[];
    wind_gusts_10m: number[];
}

// Represents the clean, mapped data for a single hour of the imaging window
export interface AstroForecastHour {
  time: Date;
  temp: number;
  dewpoint: number;
  relativeHumidity: number;
  precipitation: number;
  clouds: {
    total: number;
    low: number;
    mid: number;
    high: number;
  };
  wind: {
    speed: number;
    gusts: number;
  };
  seeing: {
    antoniadi: 'I' | 'II' | 'III' | 'IV' | 'V'; // I: Excellent, V: Very Poor
    reason: string; // Explanation for score
    resolution: string; // e.g. "< 0.5""
  };
  skyCondition: 'Clear' | 'Mostly Clear' | 'Partly Cloudy' | 'Mostly Cloudy' | 'Overcast';
  dewRisk: {
    level: 'Critical' | 'Warning' | 'Safe';
    spread: number; // Temp - Dewpoint
  };
  astroIndex: {
    value: number; // 0-100 score
    color: string; // tailwind color class
    isGoodForImaging: boolean;
  };
}

export interface NightlyForecast {
  date: Date;
  minTemp: number;
  maxTemp: number;
  avgCloudCover: number;
  precipitationChance: number;
  moonPhase: string;
  condition: 'Excellent' | 'Good' | 'Fair' | 'Poor';
  summary: string;
}

// Observation Planner types
export interface ObservationTarget {
  id: string;
  objectId: string;       // DeepSkyObject.id e.g. "M31"
  commonName: string;
  objectType: string;
  constellation: string;
  magnitude: number | null;
  angularSizeArcmin: { width: number; height: number };
  priority: 'critical' | 'high' | 'medium' | 'low';
  notes: string;
  completed: boolean;
  completedDate?: string;  // ISO date when imaged
  acquisitionHours?: number; // total hours captured so far
  targetHours?: number;      // goal integration time
  imageUrl?: string;
}

export interface ObservationSession {
  id: string;
  date: string;           // ISO date planned
  location: {
    name: string;
    lat: number;
    lon: number;
  };
  moonIllumination: number;
  sunsetTime: string;
  darknessStart: string;
  darknessEnd: string;
  sunriseTime: string;
  targets: ObservationTarget[];
  status: 'planned' | 'in_progress' | 'completed' | 'cancelled' | 'weathered_out';
  weatherSummary?: string;
  notes: string;
  cloudCover?: number;    // %
  seeing?: string;        // seeing condition
}

// Equipment V2 — Enhanced equipment management
export interface EquipmentProfile {
  id: string;
  name: string;
  category: 'Telescope' | 'Camera' | 'Mount' | 'Filter' | 'Accessory' | 'Software';
  subcategory?: string;     // e.g. "Refractor", "Cooled CMOS", etc.
  brand: string;
  model: string;
  // Telescope specs
  focalLength?: number;     // mm
  aperture?: number;        // mm
  fRatio?: number;          // f/x
  telescopeType?: string;     // Refractor, Reflector, Catadioptric
  // Camera specs
  sensorWidth?: number;     // mm
  sensorHeight?: number;    // mm
  pixelSize?: number;       // micrometers
  resolution?: string;      // e.g. "3008x3008"
  cameraType?: string;      // Cooled CCD, DSLR, etc.
  // Mount specs
  payloadCapacity?: number; // kg
  mountType?: string;       // EQ, Alt-Az, etc.
  // Filter specs
  filterType?: string;        // Broadband, Narrowband, etc.
  bandwidth?: number;       // nm
  wavelength?: number;      // nm (narrowband)
  // Metadata
  specs: string;
  description: string;
  rating: number;
  isPersonal: boolean;
  imageUrl?: string;
  purchaseDate?: string;    // ISO date
  purchasePrice?: number;   // EUR
  // FOV calculator result (computed)
  fovWidth?: number;        // arcminutes (computed)
  fovHeight?: number;       // arcminutes (computed)
  pixelScale?: number;      // arcsec/pixel (computed)
}

// Ask Hal AI types
export interface AskHalMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export interface AskHalRankingResult {
  target: ObservationTarget;
  score: number;
  reasoning: string;
  recommendedFilters?: string[];
  recommendedExposure?: number; // seconds
  recommendedBinning?: number;
}

// Extended AppData
export interface AstroCaptureV2Data {
  equipment: EquipmentProfile[];
  sessions: ObservationSession[];
  askHalHistory: AskHalMessage[];
}

// ============================================================================
// APLS v3 — Module 2 : Équipement, Échantillonnage & Guidage
// ============================================================================

/** Profil de rig complet (tube + réducteur + capteur) */
export interface AplsRigProfile {
  id: string;
  name: string;
  isDefault: boolean;
  // Tube
  telescope: {
    focalLength: number;      // mm (focale native)
    aperture: number;         // mm (diamètre ouverture)
    fRatio: number;           // f/D
    type: 'Refractor' | 'Reflector' | 'SCT' | 'RC' | 'CDK';
  };
  // Modificateur optique
  opticModifier: {
    type: 'Reducer' | 'Corrector' | 'Reducer-Corrector' | 'Flattener' | 'Barlow' | 'None';
    factor: number;           // 0.6 = réducteur 0.6×
    effectiveFocalLength: number; // calculé : F × factor
  };
  // Capteur d'imagerie
  imagingCamera: {
    name: string;
    sensorWidth: number;      // mm
    sensorHeight: number;     // mm
    pixelSize: number;        // μm
    resolutionX: number;
    resolutionY: number;
    readNoise: number;        // e⁻
    quantumEfficiency: number; // 0-1
    isColor: boolean;
    hasCooling: boolean;
    binningAcquisition: number;      // 1 ou 2 (Binning matériel à la capture)
  };
  // Caméra de guidage
  guidingCamera?: {
    name: string;
    pixelSize: number;        // μm
    binning: number;          // 1×1, 2×2
    mode: 'GuideScope' | 'OAG';
  };
  // Monture
  mount: {
    name: string;
    type: string;
    maxPayload: number;       // kg
  };
}

/** Échantillonnage calculé */
export interface AplsSamplingResult {
  imagingPixelScale: number;    // "/pixel (inclut binningAcquisition)
  guidingPixelScale?: number;   // "/pixel
  ratioImagingToGuiding: number;
  fovWidth: number;             // arcmin
  fovHeight: number;            // arcmin
  fovDiagonal: number;          // arcmin
  isOversampled: boolean;
  isUndersampled: boolean;
  recommendation: AplsSamplingRecommendation;
}

/** Recommandation d'échantillonnage */
export interface AplsSamplingRecommendation {
  status: 'ideal' | 'undersampled_critical' | 'undersampled_moderate' | 'oversampled';
  drizzleRecommendation: '2x_aggressive' | '2x' | '1x' | 'none' | 'bin2x2';
  pixelDrop?: number;
  explanation: string;
  ditherRequired: boolean;
  ditherMinPixels: number;
}

/** Setup de guidage avec calculs */
export interface AplsGuidingSetup {
  cameraPixelSize: number;      // μm
  binning: number;
  focalLength: number;          // mm (focale lunette guide ou OAG)
  pixelScale: number;           // "/pixel (calculé)
  ditherPixels: number;         // pixels à entrer dans PHD2/NINA/ASIAIR
  ditherArcseconds: number;     // décalage physique en "/dither
}

/** Masque d'horizon local */
export interface AplsHorizonMask {
  id: string;
  name: string;
  locationId?: string;
  points: AplsHorizonPoint[];       // [ {az: 0, alt: 10}, {az: 45, alt: 15}, ... ]
  format: 'csv' | 'yaml' | 'telescopius';
}

export interface AplsHorizonPoint {
  azimuth: number;    // degrés 0-360
  altitude: number;   // degrés 0-90
}

// ============================================================================
// APLS v3 — Module 5 : Environnement, Filtres & Calculateur d'Exposition
// ============================================================================

export type AplsFilterType = 'UV_IR_Cut' | 'L_Ultimate' | 'LPS_D2' | 'Ha' | 'OIII' | 'SII' | 'RGB' | 'Luminance';

export interface AplsFilterProfile {
  type: AplsFilterType;
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

export interface AplsExposureParams {
  skyMagnitude: number;           // mag/arcsec² (SQM)
  aperture: number;                 // mm
  pixelSize: number;                // μm
  focalLength: number;              // mm
  quantumEfficiency: number;        // 0-1
  filterTransmission: number;       // τ
  readNoise: number;                // e⁻
  kFactor: number;                  // 5 ou 10
  // Calculés
  fluxSky: number;                  // Φ_sky
  apertureArea: number;             // m²
  bSky: number;                     // e⁻/px/sec
  tOptimum: number;                 // secondes
}

export interface AplsExposureResult {
  subExposureTime: number;          // secondes optimales
  totalSubsForSNR: number;          // nombre de poses pour SNR cible
  totalIntegrationTime: number;   // minutes totales
  bSky: number;                     // e⁻/px/sec
  swampingFactor: number;         // B_sky / RN²
  recommendation: string;
  warning?: string;
}
