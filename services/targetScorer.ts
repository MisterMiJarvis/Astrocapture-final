/**
 * AstroCapture Target Scorer
 * Inspired by APTS (Astro-Pożar Tool Set) multi-factor scoring engine
 * Pure TypeScript implementation for frontend use
 */

import { MessierObject } from '../data/messierCatalog';

export interface ScorerConfig {
  // Equipment parameters
  focalLength: number; // mm
  sensorWidth: number; // mm
  sensorHeight: number; // mm
  pixelSize: number; // μm

  // Observation conditions
  latitude: number;
  longitude: number;
  date?: Date;

  // Filter strategy
  filterStrategy: 'BROADBAND' | 'NARROWBAND';

  // Custom thresholds (optional)
  minAltitude?: number;
  maxMoonIllumination?: number;
}

export interface TargetScore {
  totalScore: number;
  maxScore: number;
  percentage: number;
  details: {
    altitude: { score: number; max: number; value: number };
    imagingWindow: { score: number; max: number; hours: number };
    fovFit: { score: number; max: number; ratio: number };
    moonPenalty: { score: number; max: number; separation: number };
    brightness: { score: number; max: number; magnitude: number };
  };
  recommendation: string;
}

/**
 * Calculate object altitude at a given time using simplified formula
 * Returns altitude in degrees
 */
function calculateAltitude(
  ra: number, // hours
  dec: number, // degrees
  lat: number,
  lon: number,
  date: Date
): number {
  const lst = calculateLST(lon, date);
  const ha = lst - ra; // hour angle in hours
  const haRad = ha * 15 * Math.PI / 180; // convert to radians
  const decRad = dec * Math.PI / 180;
  const latRad = lat * Math.PI / 180;

  const sinAlt = Math.sin(decRad) * Math.sin(latRad) + 
                 Math.cos(decRad) * Math.cos(latRad) * Math.cos(haRad);
  
  return Math.asin(sinAlt) * 180 / Math.PI;
}

/**
 * Calculate Local Sidereal Time
 */
function calculateLST(longitude: number, date: Date): number {
  const jd = calculateJD(date);
  const d = jd - 2451545.0;
  const gmst = 18.697374558 + 24.06570982441908 * d;
  const lst = (gmst + longitude / 15) % 24;
  return lst < 0 ? lst + 24 : lst;
}

/**
 * Calculate Julian Date
 */
function calculateJD(date: Date): number {
  const y = date.getUTCFullYear();
  const m = date.getUTCMonth() + 1;
  const d = date.getUTCDate() + date.getUTCHours() / 24 + date.getUTCMinutes() / 1440;
  
  let jd: number;
  if (m > 2) {
    jd = d + Math.floor(365.25 * (y - 2000)) + Math.floor(30.6001 * (m + 1)) + 2451544.5;
  } else {
    jd = d + Math.floor(365.25 * (y - 2001)) + Math.floor(30.6001 * (m + 13)) + 2451544.5;
  }
  return jd;
}

/**
 * Parse RA from string ("18h18m48s" → hours)
 */
function parseRA(raStr: string): number {
  const match = raStr.match(/(\d+)h(\d+)m([\d.]+)s/);
  if (!match) return 0;
  return parseInt(match[1]) + parseInt(match[2]) / 60 + parseFloat(match[3]) / 3600;
}

/**
 * Parse Dec from string ("-13°47'" → degrees)
 */
function parseDec(decStr: string): number {
  const match = decStr.match(/(-?\d+)°(\d+)'/);
  if (!match) return 0;
  const sign = decStr.startsWith('-') ? -1 : 1;
  return sign * (Math.abs(parseInt(match[1])) + parseInt(match[2]) / 60);
}

/**
 * Calculate Moon position and illumination (simplified)
 */
function calculateMoonData(date: Date): { illumination: number; ra: number; dec: number } {
  // Simplified calculation - in production, use a proper ephemeris library
  const daysSinceNew = (date.getTime() - new Date('2024-01-11').getTime()) / (1000 * 3600 * 24);
  const lunarCycle = 29.53059;
  const phase = (daysSinceNew % lunarCycle) / lunarCycle;
  
  // Illumination: 0-100%
  const illumination = Math.sin(phase * Math.PI) * 100;
  
  // Simplified moon position (roughly opposite sun)
  const dayOfYear = getDayOfYear(date);
  const sunRa = (dayOfYear / 365.25 * 24) % 24;
  const moonRa = (sunRa + 12 + phase * 24) % 24;
  
  return {
    illumination: Math.abs(illumination),
    ra: moonRa,
    dec: Math.sin(phase * 2 * Math.PI) * 28 // Moon declination varies ±28°
  };
}

function getDayOfYear(date: Date): number {
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = date.getTime() - start.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

/**
 * Calculate angular separation between two objects
 */
function angularSeparation(ra1: number, dec1: number, ra2: number, dec2: number): number {
  const ra1Rad = ra1 * 15 * Math.PI / 180;
  const ra2Rad = ra2 * 15 * Math.PI / 180;
  const dec1Rad = dec1 * Math.PI / 180;
  const dec2Rad = dec2 * Math.PI / 180;

  const cosSep = Math.sin(dec1Rad) * Math.sin(dec2Rad) + 
                 Math.cos(dec1Rad) * Math.cos(dec2Rad) * Math.cos(ra1Rad - ra2Rad);
  
  return Math.acos(Math.min(1, Math.max(-1, cosSep))) * 180 / Math.PI;
}

// ============================================
// SCORING FUNCTIONS (from APTS)
// ============================================

function scoreAltitude(altitude: number): number {
  if (altitude >= 65) return 30;
  if (altitude >= 50) return 25;
  if (altitude >= 35) return 18;
  if (altitude >= 20) return 10;
  return 0;
}

function scoreImagingWindow(hours: number): number {
  if (hours >= 5) return 20;
  if (hours >= 3) return 16;
  if (hours >= 2) return 12;
  if (hours >= 1) return 8;
  return 0;
}

function scoreFovFit(fovRatio: number): number {
  if (fovRatio >= 30 && fovRatio <= 110) return 30;
  if (fovRatio >= 10 && fovRatio <= 200) return 18;
  return 0;
}

function scoreMoonPenalty(moonSeparation: number, filterStrategy: 'BROADBAND' | 'NARROWBAND'): number {
  if (filterStrategy === 'NARROWBAND') return 20;
  return Math.max(0, 20 - (moonSeparation * 0.22));
}

function scoreBrightness(magnitude: number): number {
  if (magnitude < 5) return 10;
  if (magnitude < 8) return 7;
  if (magnitude < 11) return 4;
  return 1;
}

/**
 * Calculate FOV in arcminutes
 */
function calculateFOV(sensorSize: number, focalLength: number): number {
  return (sensorSize / focalLength) * 3438; // 3438 = 180/π * 60
}

/**
 * Calculate FOV ratio (object size vs FOV percentage)
 */
function calculateFovRatio(objectSize: number, fov: number): number {
  // objectSize in arcminutes, fov in arcminutes
  return (objectSize / fov) * 100;
}

/**
 * Estimate imaging window (hours above min altitude)
 */
function estimateImagingWindow(
  ra: number,
  dec: number,
  lat: number,
  lon: number,
  date: Date,
  minAlt: number = 20
): number {
  let hours = 0;
  const testDate = new Date(date);
  
  // Test every 30 minutes for 24h
  for (let i = 0; i < 48; i++) {
    testDate.setMinutes(testDate.getMinutes() + 30);
    const alt = calculateAltitude(ra, dec, lat, lon, testDate);
    if (alt > minAlt) hours += 0.5;
  }
  
  return hours;
}

// ============================================
// MAIN SCORER
// ============================================

export class AstroTargetScorer {
  private config: ScorerConfig;

  constructor(config: ScorerConfig) {
    this.config = {
      ...config,
      date: config.date || new Date(),
    };
  }

  score(target: MessierObject): TargetScore {
    const { date, latitude, longitude, focalLength, sensorWidth, sensorHeight, filterStrategy } = this.config;
    const observationDate = date!;

    // Parse coordinates
    const ra = parseRA(target.ra);
    const dec = parseDec(target.dec);
    const magnitude = parseFloat(target.magnitude) || 99;

    // 1. Calculate current altitude
    const altitude = calculateAltitude(ra, dec, latitude, longitude, observationDate);
    const sAlt = scoreAltitude(altitude);

    // 2. Estimate imaging window
    const windowHours = estimateImagingWindow(ra, dec, latitude, longitude, observationDate);
    const sWin = scoreImagingWindow(windowHours);

    // 3. FOV Fit
    const fovW = calculateFOV(sensorWidth, focalLength);
    const fovH = calculateFOV(sensorHeight, focalLength);
    const fovDiag = Math.sqrt(fovW * fovW + fovH * fovH);
    
    // Parse object size (e.g., "7' × 3'")
    const sizeMatch = target.size.match(/([\d.]+)'/);
    const objectSize = sizeMatch ? parseFloat(sizeMatch[1]) : 10;
    const fovRatio = calculateFovRatio(objectSize, fovDiag);
    const sFov = scoreFovFit(fovRatio);

    // 4. Moon penalty
    const moonData = calculateMoonData(observationDate);
    const moonSep = angularSeparation(ra, dec, moonData.ra, moonData.dec);
    const sMoon = scoreMoonPenalty(moonSep, filterStrategy);

    // 5. Brightness
    const sBright = scoreBrightness(magnitude);

    // Total
    const totalScore = sAlt + sWin + sFov + sMoon + sBright;
    const maxScore = 110;

    // Generate recommendation
    let recommendation = '';
    if (totalScore >= 90) recommendation = '🌟 Excellent target for tonight!';
    else if (totalScore >= 70) recommendation = '✅ Good target, worth imaging';
    else if (totalScore >= 50) recommendation = '⚠️ Fair conditions, consider alternatives';
    else if (altitude < 20) recommendation = '❌ Too low on the horizon';
    else recommendation = '❌ Poor conditions tonight';

    return {
      totalScore,
      maxScore,
      percentage: (totalScore / maxScore) * 100,
      details: {
        altitude: { score: sAlt, max: 30, value: Math.round(altitude) },
        imagingWindow: { score: sWin, max: 20, hours: Math.round(windowHours * 10) / 10 },
        fovFit: { score: sFov, max: 30, ratio: Math.round(fovRatio) },
        moonPenalty: { score: sMoon, max: 20, separation: Math.round(moonSep) },
        brightness: { score: sBright, max: 10, magnitude },
      },
      recommendation,
    };
  }

  /**
   * Score multiple targets and return sorted list
   */
  scoreMultiple(targets: MessierObject[]): Array<{ target: MessierObject; score: TargetScore }> {
    return targets
      .map(target => ({ target, score: this.score(target) }))
      .sort((a, b) => b.score.totalScore - a.score.totalScore);
  }
}

// Export default config for AstroCapture
export const DEFAULT_SCORER_CONFIG: ScorerConfig = {
  focalLength: 560, // TSAPO102 + reducer
  sensorWidth: 11.3, // ASI2600MC
  sensorHeight: 7.5,
  pixelSize: 3.76,
  latitude: 43.7889, // Saint-Étienne-du-Grès
  longitude: 4.7533,
  filterStrategy: 'NARROWBAND',
};

export default AstroTargetScorer;
