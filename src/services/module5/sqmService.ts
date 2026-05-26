// ============================================================================
// SERVICE — SQM Dynamique & Conditions Environnementales
// APLS v3 — Module 5
// ============================================================================

import {
  SQMDynamicModel,
  EnvironmentConditions,
  DewAlert,
  DewRiskLevel,
} from '../../types/module5';

import {
  calculateEffectiveSQM,
  calculateMoonSeparation,
  calculateDewRisk,
  generateDewAlert,
} from './exposureCalculator';

// ============================================================================
// API Open-Meteo (proxy local)
// ============================================================================

const OPEN_METEO_BASE = '/api/apls/weather';

interface OpenMeteoHourly {
  time: string[];
  temperature_2m: number[];
  dewpoint_2m: number[];
  relative_humidity_2m: number[];
  cloudcover_total: number[];
  cloudcover_low: number[];
  cloudcover_mid: number[];
  cloudcover_high: number[];
  windspeed_10m: number[];
  windgusts_10m: number[];
  precipitation_probability: number[];
}

interface OpenMeteoResponse {
  hourly: OpenMeteoHourly;
  daily?: {
    time: string[];
    moon_phase: number[];
  };
}

/**
 * Récupère les données météo prévisionnelles depuis Open-Meteo.
 */
export async function fetchWeatherForecast(
  lat: number,
  lon: number,
  days: number = 7
): Promise<OpenMeteoResponse | null> {
  try {
    const url = `${OPEN_METEO_BASE}/forecast?lat=${lat}&lon=${lon}&days=${days}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Open-Meteo error: ${res.status}`);
    return await res.json();
  } catch (err) {
    console.error('Failed to fetch weather forecast:', err);
    return null;
  }
}

// ============================================================================
// TELESCOPIUS API (proxy local)
// ============================================================================

const TELESCOPIUS_BASE = '/api/apls/targets';

interface TelescopiusMoonData {
  phase: number;
  altitude: number;
  azimuth: number;
  ra: string;
  dec: string;
  raDeg: number;
  decDeg: number;
}

/**
 * Récupère les données lunaires depuis Telescopius.
 */
export async function fetchMoonData(
  lat: number,
  lon: number,
  date?: string
): Promise<TelescopiusMoonData | null> {
  try {
    const url = `${TELESCOPIUS_BASE}/moon?lat=${lat}&lon=${lon}${date ? `&date=${date}` : ''}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Telescopius error: ${res.status}`);
    return await res.json();
  } catch (err) {
    console.error('Failed to fetch moon data:', err);
    return null;
  }
}

// ============================================================================
// CALCULS COMBINÉS — SQM + Rosée
// ============================================================================

/**
 * Calcule le modèle SQM complet pour une cible donnée.
 * Utilise la trigonométrie sphérique pour la séparation Lune-cible.
 */
export async function computeSQMDynamic(
  sqmBase: number,
  targetRADeg: number,
  targetDecDeg: number,
  lat: number,
  lon: number,
  date?: string
): Promise<SQMDynamicModel | null> {
  const moon = await fetchMoonData(lat, lon, date);
  if (!moon) return null;

  const separation = calculateMoonSeparation(
    targetRADeg,
    targetDecDeg,
    moon.raDeg,
    moon.decDeg
  );

  return calculateEffectiveSQM(sqmBase, moon.phase, moon.altitude, separation);
}

/**
 * Calcule les conditions environnementales complètes pour une session.
 */
export async function computeEnvironmentConditions(
  sqmBase: number,
  targetRADeg: number,
  targetDecDeg: number,
  lat: number,
  lon: number,
  hourIndex: number = 0,
  date?: string
): Promise<{ conditions: EnvironmentConditions; dewAlert: DewAlert } | null> {
  const [forecast, moon] = await Promise.all([
    fetchWeatherForecast(lat, lon, 1),
    fetchMoonData(lat, lon, date),
  ]);

  if (!forecast || !moon) return null;

  const temp = forecast.hourly.temperature_2m[hourIndex] ?? 15;
  const dew = forecast.hourly.dewpoint_2m[hourIndex] ?? 10;
  const humidity = forecast.hourly.relative_humidity_2m[hourIndex] ?? 60;
  const clouds = forecast.hourly.cloudcover_total[hourIndex] ?? 0;
  const wind = forecast.hourly.windspeed_10m[hourIndex] ?? 10;

  const separation = calculateMoonSeparation(
    targetRADeg,
    targetDecDeg,
    moon.raDeg,
    moon.decDeg
  );

  const sqmModel = calculateEffectiveSQM(sqmBase, moon.phase, moon.altitude, separation);

  const conditions: EnvironmentConditions = {
    temperature: temp,
    dewpoint: dew,
    humidity,
    cloudCover: clouds,
    windSpeed: wind,
    seeing: estimateSeeing(clouds, wind), // Antoniadi I-V
    sqm: sqmModel,
    dewRisk: calculateDewRisk(temp, dew),
    dewPointDelta: Math.round((temp - dew) * 10) / 10,
  };

  return {
    conditions,
    dewAlert: generateDewAlert(conditions),
  };
}

/**
 * Estimation grossière du seeing selon météo.
 */
function estimateSeeing(cloudCover: number, windSpeed: number): number {
  let seeing = 2; // Antoniadi II par défaut
  if (cloudCover < 10 && windSpeed < 5) seeing = 1; // I — Excellent
  if (windSpeed > 15) seeing = 3; // III — Médiocre
  if (windSpeed > 25 || cloudCover > 60) seeing = 4; // IV — Mauvais
  if (windSpeed > 40) seeing = 5; // V — Très mauvais
  return seeing;
}

// ============================================================================
// DASHBOARD ALERTS
// ============================================================================

/**
 * Génère les alertes pour le Dashboard.
 */
export function generateDashboardAlerts(
  conditions: EnvironmentConditions
): { dewAlert: DewAlert; sqmAlert?: { message: string; severity: 'info' | 'warning' | 'critical' } } {
  const dewAlert = generateDewAlert(conditions);

  let sqmAlert: { message: string; severity: 'info' | 'warning' | 'critical' } | undefined;

  if (conditions.sqm.sqmEffective < 18) {
    sqmAlert = {
      message: `SQM critique (${conditions.sqm.sqmEffective}). Pollution + Lune sévère.`,
      severity: 'critical',
    };
  } else if (conditions.sqm.sqmEffective < 20) {
    sqmAlert = {
      message: `SQM dégradé (${conditions.sqm.sqmEffective}). Filtre narrowband recommandé.`,
      severity: 'warning',
    };
  }

  return { dewAlert, sqmAlert };
}
