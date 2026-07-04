// ============================================================================
// PLANNER SERVICE — Astrometry, imaging window scoring, weather snapshot
// for single-target observation planning.
// ============================================================================

import type { Project } from '../types/project';
import type { AstroForecastResponse, MappedAstronomyData } from '../../types';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface AltitudePoint {
  time: Date;           // UTC
  timeLocal: string;    // HH:MM local label
  altitude: number;     // degrees
  azimuth: number;      // degrees
  isAboveHorizon: boolean;
  isOptimal: boolean;   // > 30° altitude
}

export interface ImagingWindowSlot {
  startTime: Date;
  endTime: Date;
  durationMinutes: number;
  avgAltitude: number;
  maxAltitude: number;
  qualityScore: number;        // 0-100
  qualityLabel: 'Excellent' | 'Good' | 'Fair' | 'Poor' | 'Impossible';
  moonIllumination: number | null;
  moonAltitude: number | null;
  weather: WeatherSnapshot | null;
  isBestWindow: boolean;
}

export interface WeatherSnapshot {
  tempC: number;
  humidityPct: number;
  cloudCoverPct: number;
  windKmh: number;
  seeing: number | null;       // arcsec FWHM (estimated)
  seeingLabel: string;
  dewRisk: 'Safe' | 'Warning' | 'Critical';
  dewPointDelta: number;       // temp - dewpoint (°C)
  isGoodForImaging: boolean;
}

export interface PlannerResult {
  altitudeCurve: AltitudePoint[];
  transitTime: Date | null;
  transitAltitude: number;
  windows: ImagingWindowSlot[];
  bestWindow: ImagingWindowSlot | null;
  totalObservableHours: number;
  nightStart: Date | null;
  nightEnd: Date | null;
}

// ─── Coordinate parsing ────────────────────────────────────────────────────

function parseRaToDegrees(ra: string | number): number {
  if (typeof ra === 'number') return ra * 15;
  if (!ra) return 0;
  if (!ra.includes(':')) return (parseFloat(ra) || 0) * 15;
  const parts = ra.split(':').map(Number);
  return parts[0] * 15 + parts[1] * 15 / 60 + parts[2] * 15 / 3600;
}

function parseDecToDegrees(dec: string | number): number {
  if (typeof dec === 'number') return dec;
  if (!dec) return 0;
  const sign = dec.startsWith('-') ? -1 : 1;
  const parts = dec.replace(/^[+-]/, '').split(':').map(Number);
  return sign * (parts[0] + parts[1] / 60 + parts[2] / 3600);
}

// ─── Astronomical calculations ──────────────────────────────────────────────
// Simplified but accurate enough for planning.
// Uses standard formulas for altitude/azimuth from RA/Dec and observer location.

const DEG2RAD = Math.PI / 180;
const RAD2DEG = 180 / Math.PI;

/** Julian Day from a Date (UTC) */
function julianDay(date: Date): number {
  return date.getTime() / 86400000 + 2440587.5;
}

/** Greenwich Mean Sidereal Time in degrees */
function gmst(jd: number): number {
  const T = (jd - 2451545.0) / 36525.0;
  let theta = 280.46061837 + 360.98564736629 * (jd - 2451545.0)
    + 0.000387933 * T * T - T * T * T / 38710000;
  theta = theta % 360;
  if (theta < 0) theta += 360;
  return theta;
}

/** Local Mean Sidereal Time in degrees */
function lmst(jd: number, longitudeDeg: number): number {
  const g = gmst(jd);
  let lst = g + longitudeDeg;
  lst = lst % 360;
  if (lst < 0) lst += 360;
  return lst;
}

/**
 * Calculate altitude and azimuth for equatorial coordinates.
 * Returns altitude and azimuth in degrees.
 */
function altAz(
  raDeg: number, decDeg: number,
  lstDeg: number, latDeg: number
): { alt: number; az: number } {
  const ha = (lstDeg - raDeg) * DEG2RAD;  // hour angle in radians
  const dec = decDeg * DEG2RAD;
  const lat = latDeg * DEG2RAD;

  const sinAlt = Math.sin(dec) * Math.sin(lat) + Math.cos(dec) * Math.cos(lat) * Math.cos(ha);
  const alt = Math.asin(Math.max(-1, Math.min(1, sinAlt)));

  const cosAz = (Math.sin(dec) - Math.sin(alt) * Math.sin(lat)) / (Math.cos(alt) * Math.cos(lat));
  let az = Math.acos(Math.max(-1, Math.min(1, cosAz)));
  if (Math.sin(ha) > 0) az = 2 * Math.PI - az;

  return {
    alt: alt * RAD2DEG,
    az: az * RAD2DEG,
  };
}

// ─── Moon position (simplified) ─────────────────────────────────────────────

/**
 * Calculate moon illumination fraction (0-1) for a given date.
 * Approximation — good enough for planning.
 */
export function moonIllumination(date: Date): number {
  const jd = julianDay(date);
  // Days since new moon reference (2000-01-06 18:14 UTC ≈ JD 2451550.26)
  const daysSinceNew = jd - 2451550.26;
  const synodic = 29.530588853;
  const phase = (daysSinceNew % synodic) / synodic;
  const angle = phase * 2 * Math.PI;
  return (1 - Math.cos(angle)) / 2;
}

/**
 * Calculate moon altitude (simplified — uses mean orbital elements).
 * Good to ~1° for planning purposes.
 */
export function moonAltitude(date: Date, latDeg: number, lonDeg: number): number {
  const jd = julianDay(date);
  const T = (jd - 2451545.0) / 36525.0;

  // Mean longitude of the moon
  const L = (218.316 + 481267.8813 * T) % 360;
  // Mean anomaly
  const M = (134.963 + 477198.8676 * T) % 360 * DEG2RAD;
  // Mean distance argument
  const F = (93.272 + 483202.0175 * T) % 360 * DEG2RAD;

  // Ecliptic longitude (simplified)
  let lambda = L + 6.289 * Math.sin(M);
  lambda = lambda * DEG2RAD;

  // Ecliptic latitude (simplified)
  const beta = 5.128 * Math.sin(F) * DEG2RAD;

  // Obliquity of ecliptic
  const eps = (23.439 - 0.00056 * T) * DEG2RAD;

  // To equatorial
  const dec = Math.asin(
    Math.sin(beta) * Math.cos(eps) + Math.cos(beta) * Math.sin(eps) * Math.sin(lambda)
  );
  const ra = Math.atan2(
    Math.sin(lambda) * Math.cos(eps) - Math.tan(beta) * Math.sin(eps),
    Math.cos(lambda)
  );

  const lst = lmst(jd, lonDeg);
  const ha = (lst * DEG2RAD - ra + 2 * Math.PI) % (2 * Math.PI);
  const lat = latDeg * DEG2RAD;
  const sinAlt = Math.sin(dec) * Math.sin(lat) + Math.cos(dec) * Math.cos(lat) * Math.cos(ha);
  return Math.asin(Math.max(-1, Math.min(1, sinAlt))) * RAD2DEG;
}

// ─── Seeing estimation (cloud-based, no API seeing model) ──────────────────

/**
 * Estimate seeing from cloud cover and wind.
 * This is a rough proxy — real seeing requires atmospheric models.
 * Clear + low wind → ~1.5-2", heavy clouds → 3-4"+.
 */
function estimateSeeing(cloudCover: number, windSpeed: number): number {
  // Base seeing for a clear night at sea level ~ 2.0"
  // Clouds degrade seeing by up to 2"
  // High wind degrades by up to 1"
  const cloudPenalty = (cloudCover / 100) * 2.0;
  const windPenalty = Math.min(1.0, Math.max(0, (windSpeed - 15) / 20));
  return Math.max(0.5, 2.0 + cloudPenalty + windPenalty);
}

function seeingLabelToAntoniadi(seeing: number): string {
  if (seeing < 1.0) return 'I';
  if (seeing < 2.0) return 'I-II';
  if (seeing < 3.0) return 'II-III';
  if (seeing < 4.0) return 'III-IV';
  return 'IV-V';
}

// ─── Dew risk ───────────────────────────────────────────────────────────────

function dewRisk(tempC: number, dewpointC: number): { level: 'Safe' | 'Warning' | 'Critical'; delta: number } {
  const delta = tempC - dewpointC;
  if (delta < 2) return { level: 'Critical', delta };
  if (delta < 5) return { level: 'Warning', delta };
  return { level: 'Safe', delta };
}

// ─── Night boundaries ──────────────────────────────────────────────────────

/**
 * Calculate astronomical night start/end (sun 18° below horizon).
 * Returns UTC dates for the night of the given date.
 */
function astronomicalNight(date: Date, latDeg: number, lonDeg: number): { start: Date; end: Date } | null {
  // Sun's declination (simplified)
  const jd = julianDay(date);
  const T = (jd - 2451545.0) / 36525.0;
  const n = jd - 2451545.0;
  const L0 = (280.46646 + 36000.76983 * T) % 360;
  const M = (357.52911 + 35999.05029 * T) % 360 * DEG2RAD;
  const C = (1.914602 - 0.004817 * T) * Math.sin(M) + 0.019993 * Math.sin(2 * M);
  const sunLon = (L0 + C) * DEG2RAD;
  const eps = (23.439 - 0.00056 * T) * DEG2RAD;
  const sunDec = Math.asin(Math.sin(eps) * Math.sin(sunLon));
  const sunRa = Math.atan2(Math.cos(eps) * Math.sin(sunLon), Math.cos(sunLon));

  const lat = latDeg * DEG2RAD;
  // Hour angle for sun at -18° altitude
  const cosHa = (Math.sin(-18 * DEG2RAD) - Math.sin(sunDec) * Math.sin(lat)) / (Math.cos(sunDec) * Math.cos(lat));

  if (cosHa > 1 || cosHa < -1) {
    // No astronomical night (polar day/night) — use civil twilight as fallback
    return null;
  }

  const ha = Math.acos(cosHa);  // radians

  // Calculate start (evening) and end (morning)
  const lstEvening = lmst(jd - 0.5, lonDeg);  // approximate LST at evening
  const lstMorning = lmst(jd + 0.5, lonDeg);   // approximate LST at morning

  // Sunset time approximation: LST when sun is at -18° = sunRa + ha (evening), sunRa - ha (morning)
  const sunsetLst = (sunRa * RAD2DEG + ha * RAD2DEG) % 360;
  const sunriseLst = (sunRa * RAD2DEG - ha * RAD2DEG + 360) % 360;

  // Convert LST to UTC — this is approximate (within ~10 min)
  const gmstEvening = gmst(jd - 0.5);
  const gmstMorning = gmst(jd + 0.5);

  const utcOffsetEvening = (sunsetLst - gmstEvening - lonDeg) / 15.0;  // hours from noon
  const utcOffsetMorning = (sunriseLst - gmstMorning - lonDeg) / 15.0;

  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  start.setTime(start.getTime() + (12 + utcOffsetEvening) * 3600000);

  const end = new Date(date);
  end.setHours(0, 0, 0, 0);
  end.setTime(end.getTime() + (12 + utcOffsetMorning) * 3600000);

  // If start > end, start is actually for the previous evening
  if (start > end) {
    start.setTime(start.getTime() - 86400000);
  }

  return { start, end };
}

// ─── Main planning function ─────────────────────────────────────────────────

/**
 * Compute the full planner result for a project on a given date.
 * Altitude curve, transit, imaging windows with quality scores.
 */
export function computePlanner(
  project: Project,
  date: Date,
  astroData?: MappedAstronomyData | null,
  weatherData?: AstroForecastResponse | null,
): PlannerResult {
  const raDeg = parseRaToDegrees(project.targetRa);
  const decDeg = parseDecToDegrees(project.targetDec);
  const lat = project.lat;
  const lon = project.lon;

  // Night boundaries — use astroData if available, otherwise compute
  let nightStart: Date | null = null;
  let nightEnd: Date | null = null;

  if (astroData?.fullNightBegins && astroData?.fullNightEnds) {
    // Parse HH:MM strings and create dates for the night of `date`
    const [sh, sm] = astroData.fullNightBegins.split(':').map(Number);
    const [eh, em] = astroData.fullNightEnds.split(':').map(Number);
    nightStart = new Date(date);
    nightStart.setHours(sh, sm, 0, 0);
    nightEnd = new Date(date);
    // If end is in the morning (small hour), it's the next day
    if (eh < 12) {
      nightEnd = new Date(date.getTime() + 86400000);
    }
    nightEnd.setHours(eh, em, 0, 0);
  } else {
    const night = astronomicalNight(date, lat, lon);
    if (night) {
      nightStart = night.start;
      nightEnd = night.end;
    }
  }

  if (!nightStart || !nightEnd) {
    return {
      altitudeCurve: [],
      transitTime: null,
      transitAltitude: 0,
      windows: [],
      bestWindow: null,
      totalObservableHours: 0,
      nightStart: null,
      nightEnd: null,
    };
  }

  // ─── Altitude curve (5-min steps) ──────────────────────────────────────────
  const stepMs = 5 * 60 * 1000;  // 5 minutes
  const curve: AltitudePoint[] = [];
  let transitTime: Date | null = null;
  let transitAlt = -90;

  for (let t = nightStart.getTime(); t <= nightEnd.getTime(); t += stepMs) {
    const d = new Date(t);
    const jd = julianDay(d);
    const lst = lmst(jd, lon);
    const { alt, az } = altAz(raDeg, decDeg, lst, lat);

    const isAbove = alt > 0;
    const isOptimal = alt > 30;

    curve.push({
      time: d,
      timeLocal: d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
      altitude: alt,
      azimuth: az,
      isAboveHorizon: isAbove,
      isOptimal,
    });

    if (alt > transitAlt) {
      transitAlt = alt;
      transitTime = d;
    }
  }

  // ─── Weather data index (if available) ─────────────────────────────────────
  // Build a map of time → weather data for quick lookup
  const weatherMap = new Map<string, WeatherSnapshot>();
  if (weatherData && weatherData.time) {
    for (let i = 0; i < weatherData.time.length; i++) {
      const t = weatherData.time[i];
      const temp = weatherData.temperature_2m?.[i] ?? 0;
      const dewpoint = weatherData.dewpoint_2m?.[i] ?? 0;
      const humidity = weatherData.relative_humidity_2m?.[i] ?? 0;
      const clouds = weatherData.cloud_cover?.[i] ?? 0;
      const wind = weatherData.wind_speed_10m?.[i] ?? 0;
      const dew = dewRisk(temp, dewpoint);
      const seeing = estimateSeeing(clouds, wind);

      const key = t.substring(0, 13);  // "2026-07-04T21"
      weatherMap.set(key, {
        tempC: temp,
        humidityPct: humidity,
        cloudCoverPct: clouds,
        windKmh: wind,
        seeing,
        seeingLabel: seeingLabelToAntoniadi(seeing),
        dewRisk: dew.level,
        dewPointDelta: dew.delta,
        isGoodForImaging: clouds < 60 && wind < 25 && dew.level !== 'Critical',
      });
    }
  }

  function getWeatherForTime(d: Date): WeatherSnapshot | null {
    if (weatherMap.size === 0) return null;
    const key = d.toISOString().substring(0, 13);
    return weatherMap.get(key) || null;
  }

  // ─── Imaging windows (contiguous above-horizon + optimal segments) ──────
  // Split the night into windows where target is above horizon (>0°)
  // Then score each window for quality

  const windows: ImagingWindowSlot[] = [];
  let windowStart: AltitudePoint | null = null;
  let windowPoints: AltitudePoint[] = [];

  for (const pt of curve) {
    if (pt.isAboveHorizon) {
      if (!windowStart) {
        windowStart = pt;
        windowPoints = [];
      }
      windowPoints.push(pt);
    } else {
      if (windowStart && windowPoints.length > 0) {
        const slot = buildWindowSlot(windowStart, windowPoints, lat, lon, getWeatherForTime);
        if (slot) windows.push(slot);
      }
      windowStart = null;
      windowPoints = [];
    }
  }
  // Don't forget last window
  if (windowStart && windowPoints.length > 0) {
    const slot = buildWindowSlot(windowStart, windowPoints, lat, lon, getWeatherForTime);
    if (slot) windows.push(slot);
  }

  // ─── Score and find best window ────────────────────────────────────────────
  if (windows.length > 0) {
    // Mark best window (highest quality score, prefer longer + higher altitude)
    const best = windows.reduce((a, b) => a.qualityScore > b.qualityScore ? a : b);
    best.isBestWindow = true;
  }

  const totalObservable = windows.reduce((sum, w) => sum + w.durationMinutes, 0) / 60;

  return {
    altitudeCurve: curve,
    transitTime,
    transitAltitude: transitAlt > -90 ? transitAlt : 0,
    windows,
    bestWindow: windows.find(w => w.isBestWindow) || null,
    totalObservableHours: totalObservable,
    nightStart,
    nightEnd,
  };
}

// ─── Build a window slot from a contiguous altitude segment ────────────────

function buildWindowSlot(
  startPt: AltitudePoint,
  points: AltitudePoint[],
  lat: number,
  lon: number,
  getWeather: (d: Date) => WeatherSnapshot | null,
): ImagingWindowSlot | null {
  if (points.length === 0) return null;

  const startTime = startPt.time;
  const endTime = points[points.length - 1].time;
  const durationMinutes = (endTime.getTime() - startTime.getTime()) / 60000;

  // Altitude stats
  const altitudes = points.map(p => p.altitude);
  const avgAlt = altitudes.reduce((a, b) => a + b, 0) / altitudes.length;
  const maxAlt = Math.max(...altitudes);

  // Moon
  const moonIllum = moonIllumination(startTime);
  const moonAlt = moonAltitude(startTime, lat, lon);

  // Weather — sample at midpoint
  const midTime = new Date((startTime.getTime() + endTime.getTime()) / 2);
  const weather = getWeather(midTime);

  // ─── Quality score ─────────────────────────────────────────────────────────
  // Score components:
  //   - Altitude (40 pts): higher = better, max at 60°+
  //   - Duration (25 pts): longer = better, max at 4h+
  //   - Weather (25 pts): clear + low wind + no dew = best
  //   - Moon interference (10 pts): moon below horizon or low illumination = best

  let score = 0;

  // Altitude score
  if (maxAlt >= 60) score += 40;
  else if (maxAlt >= 45) score += 30;
  else if (maxAlt >= 30) score += 20;
  else if (maxAlt >= 15) score += 10;
  else score += 5;

  // Duration score
  const durHours = durationMinutes / 60;
  if (durHours >= 4) score += 25;
  else if (durHours >= 2) score += 18;
  else if (durHours >= 1) score += 12;
  else if (durHours >= 0.5) score += 6;
  else score += 2;

  // Weather score
  if (weather) {
    if (weather.cloudCoverPct < 20) score += 15;
    else if (weather.cloudCoverPct < 40) score += 12;
    else if (weather.cloudCoverPct < 60) score += 8;
    else if (weather.cloudCoverPct < 80) score += 4;
    else score += 0;

    if (weather.windKmh < 10) score += 5;
    else if (weather.windKmh < 20) score += 4;
    else if (weather.windKmh < 30) score += 2;
    else score += 0;

    if (weather.dewRisk === 'Safe') score += 5;
    else if (weather.dewRisk === 'Warning') score += 2;
    else score += 0;
  } else {
    // No weather data — assume average
    score += 12;
  }

  // Moon score
  if (moonAlt < 0) score += 10;        // Moon below horizon = best
  else if (moonIllum < 0.25) score += 8;
  else if (moonIllum < 0.5) score += 5;
  else if (moonIllum < 0.75) score += 2;
  else score += 0;

  // Quality label
  let label: ImagingWindowSlot['qualityLabel'];
  if (score >= 80) label = 'Excellent';
  else if (score >= 60) label = 'Good';
  else if (score >= 40) label = 'Fair';
  else if (score >= 20) label = 'Poor';
  else label = 'Impossible';

  return {
    startTime,
    endTime,
    durationMinutes,
    avgAltitude: avgAlt,
    maxAltitude: maxAlt,
    qualityScore: Math.round(score),
    qualityLabel: label,
    moonIllumination: moonIllum,
    moonAltitude: moonAlt,
    weather,
    isBestWindow: false,
  };
}

// ─── Convenience: fetch weather for project location + date ──────────────────

export async function fetchPlannerWeather(
  lat: number,
  lon: number,
  date: Date,
): Promise<AstroForecastResponse | null> {
  const formatDate = (d: Date) => d.toISOString().split('T')[0];
  const endDate = new Date(date);
  endDate.setDate(date.getDate() + 2);

  const params = new URLSearchParams({
    latitude: lat.toFixed(2),
    longitude: lon.toFixed(2),
    hourly: 'temperature_2m,dewpoint_2m,relative_humidity_2m,cloud_cover,cloud_cover_low,cloud_cover_mid,cloud_cover_high,wind_speed_10m,wind_gusts_10m,precipitation',
    models: 'best_match',
    timezone: 'auto',
    start_date: formatDate(date),
    end_date: formatDate(endDate),
  });

  try {
    const res = await fetch(`/api/apls/weather/forecast?${params.toString()}`);
    if (!res.ok) return null;
    const data = await res.json();
    return data.hourly as AstroForecastResponse;
  } catch {
    return null;
  }
}

// ─── Convenience: fetch astronomy data (sun/moon times) ──────────────────────

export async function fetchPlannerAstronomy(
  lat: number,
  lon: number,
  date: Date,
): Promise<MappedAstronomyData | null> {
  const formatDate = (d: Date) => d.toISOString().split('T')[0];
  const params = new URLSearchParams({
    latitude: lat.toFixed(2),
    longitude: lon.toFixed(2),
    daily: 'sunrise,sunset,moonrise,moonset,moon_phase',
    timezone: 'auto',
    start_date: formatDate(date),
    end_date: formatDate(date),
  });

  try {
    const res = await fetch(`/api/apls/weather/astronomy?${params.toString()}`);
    if (!res.ok) return null;
    const data = await res.json();
    const d = data.daily;
    if (!d) return null;

    // Determine full night (astronomical twilight) — approximate from sunset/sunrise
    // Open-Meteo doesn't provide astronomical twilight directly in this query
    const sunset = d.sunset?.[0];
    const sunrise = d.sunset?.[1] || d.sunrise?.[0];
    const moonIllumRaw = d.moon_phase?.[0] ?? 0.5;

    // Parse moon phase number → illumination
    // Open-Meteo moon_phase: 0 = new, 0.25 = first quarter, 0.5 = full, 0.75 = last quarter
    const moonIllum = Math.abs((moonIllumRaw % 0.5) * 2);  // 0-1
    const moonPhaseName = moonPhaseName(moonIllumRaw);

    return {
      sunrise: d.sunrise?.[0] || '',
      sunset: sunset || '',
      moonrise: d.moonrise?.[0] || '',
      moonset: d.moonset?.[0] || '',
      moonPhase: moonPhaseName,
      moonIllumination: moonIllum.toFixed(2),
      // Approximate astronomical night: sunset + 1h to sunrise - 1h
      fullNightBegins: sunset ? addHours(sunset, 1) : '',
      fullNightEnds: d.sunrise?.[0] ? addHours(d.sunrise?.[0], -1) : '',
    };
  } catch {
    return null;
  }
}

function addHours(isoTime: string, hours: number): string {
  const d = new Date(isoTime);
  d.setTime(d.getTime() + hours * 3600000);
  return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

function moonPhaseName(phase: number): string {
  if (phase < 0.0625 || phase > 0.9375) return 'New Moon';
  if (phase < 0.1875) return 'Waxing Crescent';
  if (phase < 0.3125) return 'First Quarter';
  if (phase < 0.4375) return 'Waxing Gibbous';
  if (phase < 0.5625) return 'Full Moon';
  if (phase < 0.6875) return 'Waning Gibbous';
  if (phase < 0.8125) return 'Last Quarter';
  return 'Waning Crescent';
}