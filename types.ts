

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

export interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
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