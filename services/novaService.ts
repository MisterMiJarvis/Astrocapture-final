/**
 * Nova DSO Tracker Service — Ported from Python to TypeScript
 * Astrophotography calculations and utilities
 */

export interface NovaEquipmentProfile {
  id: string;
  name: string;
  type: 'telescope' | 'camera' | 'mount' | 'guide_scope' | 'guide_camera';
  focalLength?: number; // mm
  aperture?: number; // mm
  sensorWidth?: number; // mm
  sensorHeight?: number; // mm
  pixelSize?: number; // micrometers
  resolution?: string;
}

export interface FOVResult {
  widthArcmin: number;
  heightArcmin: number;
  widthDegrees: number;
  heightDegrees: number;
  pixelScale: number; // arcsec/pixel
  diagonalArcmin: number;
  areaSquareDeg: number;
}

export interface DitherRecommendation {
  mainPixelScale: number;
  guidePixelScale: number;
  recommendedDitherPixels: number;
  recommendedDitherArcsec: number;
  explanation: string;
}

export interface ExposureCalculatorParams {
  fRatio: number;
  pixelSize: number; // micrometers
  skyBackground: 'dark' | 'moderate' | 'bright';
  filter: 'L' | 'R' | 'G' | 'B' | 'Ha' | 'OIII' | 'SII' | 'narrowband';
  desiredSNR?: number;
  readNoise?: number; // e-
}

export interface ExposureResult {
  recommendedExposure: number; // seconds
  totalIntegrationTime: number; // hours for SNR 30
  subexposureCount: number;
  explanation: string;
}

/**
 * Calculate Field of View from equipment specs
 */
export function calculateFOV(
  focalLength: number,
  sensorWidth: number,
  sensorHeight: number,
  pixelSize: number
): FOVResult {
  const widthArcmin = (sensorWidth / focalLength) * 3438;
  const heightArcmin = (sensorHeight / focalLength) * 3438;
  const pixelScale = (pixelSize / focalLength) * 206.265;
  const diagonalArcmin = Math.sqrt(widthArcmin ** 2 + heightArcmin ** 2);
  const areaSquareDeg = (widthArcmin * heightArcmin) / 3600;

  return {
    widthArcmin,
    heightArcmin,
    widthDegrees: widthArcmin / 60,
    heightDegrees: heightArcmin / 60,
    pixelScale,
    diagonalArcmin,
    areaSquareDeg,
  };
}

/**
 * Calculate pixel scale (arcsec/pixel)
 */
export function calculatePixelScale(
  pixelSize: number, // micrometers
  focalLength: number // mm
): number {
  return (pixelSize / focalLength) * 206.265;
}

/**
 * Calculate dither recommendation based on guide vs main camera pixel scales
 * Formula: dither_px = (guide_pixel_scale / main_pixel_scale) * desired_px
 */
export function calculateDitherRecommendation(
  mainPixelSize: number,
  mainFocalLength: number,
  guidePixelSize: number,
  guideFocalLength: number,
  desiredDitherPixels: number = 5
): DitherRecommendation {
  const mainPixelScale = calculatePixelScale(mainPixelSize, mainFocalLength);
  const guidePixelScale = calculatePixelScale(guidePixelSize, guideFocalLength);

  const recommendedDitherPixels = (guidePixelScale / mainPixelScale) * desiredDitherPixels;
  const recommendedDitherArcsec = recommendedDitherPixels * mainPixelScale;

  return {
    mainPixelScale,
    guidePixelScale,
    recommendedDitherPixels: Math.round(recommendedDitherPixels * 10) / 10,
    recommendedDitherArcsec: Math.round(recommendedDitherArcsec * 10) / 10,
    explanation: `Guide pixel scale (${guidePixelScale.toFixed(2)}") is ${(guidePixelScale / mainPixelScale).toFixed(1)}× main pixel scale (${mainPixelScale.toFixed(2)}"). ` +
      `To dither ${desiredDitherPixels}px on main camera, set dither to ${recommendedDitherPixels.toFixed(1)} guide pixels (${recommendedDitherArcsec.toFixed(1)} arcsec).`,
  };
}

/**
 * Calculate recommended exposure time based on f-ratio and conditions
 * Using the "NPF rule" adapted for astrophotography
 */
export function calculateExposureTime(params: ExposureCalculatorParams): ExposureResult {
  const { fRatio, pixelSize, skyBackground, filter, desiredSNR = 30, readNoise = 1.5 } = params;

  // Base exposure multiplier based on f-ratio (square law)
  const fRatioMultiplier = fRatio ** 2;

  // Sky background factor
  const skyFactors: Record<string, number> = {
    dark: 1.0,
    moderate: 1.5,
    bright: 2.5,
  };
  const skyFactor = skyFactors[skyBackground] || 1.0;

  // Filter factor
  const filterFactors: Record<string, number> = {
    L: 1.0,
    R: 1.2,
    G: 1.2,
    B: 1.5,
    Ha: 3.0,
    OIII: 4.0,
    SII: 5.0,
    narrowband: 4.0,
  };
  const filterFactor = filterFactors[filter] || 1.0;

  // Calculate base exposure (seconds)
  const baseExposure = 60; // 1 minute baseline
  const recommendedExposure = Math.round(
    baseExposure * fRatioMultiplier * skyFactor * filterFactor / 100
  );

  // Clamp to reasonable range
  const clampedExposure = Math.max(30, Math.min(recommendedExposure, 1800));

  // Estimate total integration for SNR 30
  const totalIntegrationHours = Math.round(
    (desiredSNR ** 2 * readNoise ** 2 * filterFactor * skyFactor) / (clampedExposure * 0.1)
  ) / 10;

  // Typical subexposure count
  const subexposureCount = Math.ceil((totalIntegrationHours * 3600) / clampedExposure);

  return {
    recommendedExposure: clampedExposure,
    totalIntegrationTime: totalIntegrationHours,
    subexposureCount,
    explanation: `At f/${fRatio} with ${skyBackground} skies in ${filter}: ` +
      `${clampedExposure}s subs recommended. ` +
      `For SNR ${desiredSNR}, aim for ~${totalIntegrationHours}h total ` +
      `(${subexposureCount} frames).`,
  };
}

/**
 * Calculate number of mosaic panes needed
 */
export function calculateMosaicPanes(
  targetWidthArcmin: number,
  targetHeightArcmin: number,
  fovWidthArcmin: number,
  fovHeightArcmin: number,
  overlapPercent: number = 20
): { cols: number; rows: number; totalPanes: number; coveragePercent: number } {
  const effectiveFovW = fovWidthArcmin * (1 - overlapPercent / 100);
  const effectiveFovH = fovHeightArcmin * (1 - overlapPercent / 100);

  const cols = Math.ceil(targetWidthArcmin / effectiveFovW);
  const rows = Math.ceil(targetHeightArcmin / effectiveFovH);

  const totalFovW = cols * fovWidthArcmin - (cols - 1) * (fovWidthArcmin * overlapPercent / 100);
  const totalFovH = rows * fovHeightArcmin - (rows - 1) * (fovHeightArcmin * overlapPercent / 100);

  const coveragePercent = Math.min(100,
    ((totalFovW * totalFovH) / (targetWidthArcmin * targetHeightArcmin)) * 100
  );

  return { cols, rows, totalPanes: cols * rows, coveragePercent };
}

/**
 * Parse PHD2 guiding log
 */
export interface PHD2LogEntry {
  timestamp: string;
  raRms: number; // arcsec
  decRms: number;
  totalRms: number;
  starMass: number;
  snr: number;
  pixelScale: number;
}

export function parsePHD2Log(logContent: string): {
  entries: PHD2LogEntry[];
  summary: {
    avgRaRms: number;
    avgDecRms: number;
    avgTotalRms: number;
    bestRms: number;
    worstRms: number;
    totalDuration: number; // minutes
  };
} {
  const lines = logContent.split('\n');
  const entries: PHD2LogEntry[] = [];

  for (const line of lines) {
    // Match PHD2 log format: timestamp,RA,Dec,TotalRMS,StarMass,SNR,PixelScale
    const match = line.match(
      /(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2})\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)/
    );
    if (match) {
      entries.push({
        timestamp: match[1],
        raRms: parseFloat(match[2]),
        decRms: parseFloat(match[3]),
        totalRms: parseFloat(match[4]),
        starMass: parseFloat(match[5]),
        snr: parseFloat(match[6]),
        pixelScale: parseFloat(match[7]),
      });
    }
  }

  if (entries.length === 0) {
    return {
      entries: [],
      summary: { avgRaRms: 0, avgDecRms: 0, avgTotalRms: 0, bestRms: 0, worstRms: 0, totalDuration: 0 },
    };
  }

  const rmsValues = entries.map(e => e.totalRms);
  const firstTime = new Date(entries[0].timestamp).getTime();
  const lastTime = new Date(entries[entries.length - 1].timestamp).getTime();

  return {
    entries,
    summary: {
      avgRaRms: entries.reduce((s, e) => s + e.raRms, 0) / entries.length,
      avgDecRms: entries.reduce((s, e) => s + e.decRms, 0) / entries.length,
      avgTotalRms: entries.reduce((s, e) => s + e.totalRms, 0) / entries.length,
      bestRms: Math.min(...rmsValues),
      worstRms: Math.max(...rmsValues),
      totalDuration: (lastTime - firstTime) / 60000,
    },
  };
}

/**
 * Parse ASIAIR log
 */
export interface ASIAIRLogEntry {
  timestamp: string;
  type: 'exposure' | 'guide' | 'focus' | 'slew' | 'error';
  duration?: number;
  filter?: string;
  target?: string;
  message: string;
}

export function parseASIAIRLog(logContent: string): {
  entries: ASIAIRLogEntry[];
  summary: {
    totalExposures: number;
    totalIntegrationMinutes: number;
    filterBreakdown: Record<string, number>;
    errorCount: number;
    targetBreakdown: Record<string, number>;
  };
} {
  const lines = logContent.split('\n');
  const entries: ASIAIRLogEntry[] = [];

  for (const line of lines) {
    // ASIAIR log format varies, try common patterns
    const timestampMatch = line.match(/^(\d{4}-\d{2}-\d{2}[T\s]\d{2}:\d{2}:\d{2})/);
    const timestamp = timestampMatch ? timestampMatch[1] : new Date().toISOString();

    if (line.includes('Exposure') || line.includes('exposure')) {
      const durationMatch = line.match(/(\d+)\s*s/);
      const filterMatch = line.match(/filter[:\s]+(\w+)/i);
      entries.push({
        timestamp,
        type: 'exposure',
        duration: durationMatch ? parseInt(durationMatch[1]) : undefined,
        filter: filterMatch ? filterMatch[1] : undefined,
        message: line,
      });
    } else if (line.includes('Guide') || line.includes('guiding')) {
      entries.push({ timestamp, type: 'guide', message: line });
    } else if (line.includes('Focus') || line.includes('focusing')) {
      entries.push({ timestamp, type: 'focus', message: line });
    } else if (line.includes('Slew') || line.includes('slew')) {
      const targetMatch = line.match(/to\s+(.+)/i);
      entries.push({
        timestamp,
        type: 'slew',
        target: targetMatch ? targetMatch[1].trim() : undefined,
        message: line,
      });
    } else if (line.includes('Error') || line.includes('error') || line.includes('FAIL')) {
      entries.push({ timestamp, type: 'error', message: line });
    }
  }

  const exposures = entries.filter(e => e.type === 'exposure');
  const filterBreakdown: Record<string, number> = {};
  const targetBreakdown: Record<string, number> = {};

  for (const exp of exposures) {
    if (exp.filter) {
      filterBreakdown[exp.filter] = (filterBreakdown[exp.filter] || 0) + (exp.duration || 0);
    }
  }

  const slews = entries.filter(e => e.type === 'slew');
  for (const slew of slews) {
    if (slew.target) {
      targetBreakdown[slew.target] = (targetBreakdown[slew.target] || 0) + 1;
    }
  }

  return {
    entries,
    summary: {
      totalExposures: exposures.length,
      totalIntegrationMinutes: exposures.reduce((s, e) => s + (e.duration || 0), 0) / 60,
      filterBreakdown,
      errorCount: entries.filter(e => e.type === 'error').length,
      targetBreakdown,
    },
  };
}

/**
 * Calculate target visibility over the year (heatmap data)
 */
export interface VisibilityMonth {
  month: number; // 0-11
  monthName: string;
  bestAltitude: number; // degrees
  visibilityHours: number; // hours above 30°
  moonConflictDays: number; // days with moon > 50% near target
  score: number; // 0-100
}

export function calculateYearlyVisibility(
  ra: number, // hours
  dec: number, // degrees
  lat: number, // observer latitude
  lon: number // observer longitude
): VisibilityMonth[] {
  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ];

  const results: VisibilityMonth[] = [];

  for (let month = 0; month < 12; month++) {
    // Approximate LST at midnight for mid-month
    const date = new Date(2026, month, 15);
    const lst = (18.697374558 + 24.06570982441908 * (date.getTime() / 86400000 - 10957.5)) % 24;

    // Hour angle when target transits
    const ha = lst - ra;

    // Altitude at transit
    const altRad = Math.asin(
      Math.sin(dec * Math.PI / 180) * Math.sin(lat * Math.PI / 180) +
      Math.cos(dec * Math.PI / 180) * Math.cos(lat * Math.PI / 180) * Math.cos(ha * Math.PI / 12)
    );
    const bestAltitude = altRad * 180 / Math.PI;

    // Approximate visibility window (hours above 30°)
    const cosH = (
      Math.sin(30 * Math.PI / 180) - Math.sin(dec * Math.PI / 180) * Math.sin(lat * Math.PI / 180)
    ) / (Math.cos(dec * Math.PI / 180) * Math.cos(lat * Math.PI / 180));

    let visibilityHours = 0;
    if (cosH >= -1 && cosH <= 1) {
      const h = Math.acos(cosH) * 12 / Math.PI;
      visibilityHours = h * 2;
    } else if (cosH < -1) {
      visibilityHours = 24; // Circumpolar
    }

    // Moon phase conflict (simplified: full moon is ~day 14-15 each month)
    const moonConflictDays = bestAltitude > 30 ? 3 : 0;

    // Score based on altitude and visibility window
    const score = Math.min(100, Math.round(
      (bestAltitude / 90) * 40 + (visibilityHours / 12) * 40 + (1 - moonConflictDays / 7) * 20
    ));

    results.push({
      month,
      monthName: months[month],
      bestAltitude: Math.round(bestAltitude * 10) / 10,
      visibilityHours: Math.round(visibilityHours * 10) / 10,
      moonConflictDays,
      score,
    });
  }

  return results;
}

/**
 * Calculate imaging capacity for a night
 */
export function estimateNightCapacity(
  darknessHours: number,
  targets: Array<{ priority: string; targetHours: number; acquisitionHours: number }>
): {
  totalCapacity: number;
  recommendedTargets: Array<{ targetId: string; hours: number }>;
} {
  const usableHours = darknessHours * 0.85; // 85% efficiency

  // Sort by priority then remaining hours
  const sorted = [...targets]
    .filter(t => (t.acquisitionHours || 0) < (t.targetHours || 0))
    .sort((a, b) => {
      const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      return (priorityOrder[a.priority as keyof typeof priorityOrder] || 2) -
             (priorityOrder[b.priority as keyof typeof priorityOrder] || 2);
    });

  const recommended: Array<{ targetId: string; hours: number }> = [];
  let remaining = usableHours;

  for (const target of sorted) {
    const needed = (target.targetHours || 0) - (target.acquisitionHours || 0);
    const allocate = Math.min(needed, remaining, 3); // Max 3h per target per night
    if (allocate > 0.5) {
      recommended.push({ targetId: target.priority, hours: Math.round(allocate * 10) / 10 });
      remaining -= allocate;
    }
    if (remaining < 0.5) break;
  }

  return {
    totalCapacity: Math.round(usableHours * 10) / 10,
    recommendedTargets: recommended,
  };
}
