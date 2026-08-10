// ============================================================================
// SERVICE MÉTÉO — Module 1 Dashboard
// Multi-modèles: AROME France HD (J1-J2) + ARPEGE Europe (J3-J4) + GFS (J5+)
// Merge des 3 sources Open-Meteo via le service partagé
// ============================================================================

import { WeatherForecast, HourlyWeather, NightlyWeather, WeeklyWeatherDay } from '../../types/module1';
import { fetchMergedForecast } from '@/services/weatherService';

export interface WeatherServiceConfig {
  latitude: number;
  longitude: number;
  days?: number;
  timezone?: string;
}

/**
 * Calcule le score astro 0-100 pour une heure donnée
 */
function calculateAstroIndex(hour: HourlyWeather): number {
  let score = 100;

  // Nuages (pondération forte)
  if (hour.cloudTotal < 10) score -= 0;
  else if (hour.cloudTotal < 30) score -= 10;
  else if (hour.cloudTotal < 50) score -= 25;
  else if (hour.cloudTotal < 70) score -= 45;
  else if (hour.cloudTotal < 90) score -= 70;
  else score -= 90;

  // Nuages bas (pénalité supplémentaire)
  if (hour.cloudLow > 20) score -= 15;
  if (hour.cloudLow > 50) score -= 20;

  // Vent
  if (hour.windSpeed > 25) score -= 30;
  else if (hour.windSpeed > 15) score -= 15;
  else if (hour.windSpeed > 10) score -= 5;

  // Rafales
  if (hour.windGusts > 35) score -= 15;

  // Seeing (Antoniadi)
  if (hour.seeing && hour.seeing > 3) {
    score -= (hour.seeing - 3) * 10;
  }

  // Lune (illumination approximée via phase si dispo, sinon fallback)
  // Note: moonIllumination n'est pas dans HourlyWeather, géré au niveau nightly

  return Math.max(0, Math.min(100, Math.round(score)));
}

/**
 * Détermine le risque de rosée
 */
function calculateDewRisk(temp: number, dewpoint: number): { risk: 'Safe' | 'Warning' | 'Critical'; delta: number } {
  const delta = temp - dewpoint;
  if (delta <= 2) return { risk: 'Critical', delta };
  if (delta <= 4) return { risk: 'Warning', delta };
  return { risk: 'Safe', delta };
}

/**
 * Détermine la condition du ciel
 */
function calculateSkyCondition(cloudTotal: number): HourlyWeather['skyCondition'] {
  if (cloudTotal < 10) return 'Clear';
  if (cloudTotal < 30) return 'Mostly Clear';
  if (cloudTotal < 60) return 'Partly Cloudy';
  if (cloudTotal < 85) return 'Mostly Cloudy';
  return 'Overcast';
}

/**
 * Fetch météo multi-modèles (AROME HD + ARPEGE Europe + GFS)
 * Les 3 sources sont fetch en parallèle puis mergées.
 */
export async function fetchWeatherForecast(config: WeatherServiceConfig): Promise<WeatherForecast> {
  const { latitude, longitude, days = 14 } = config;

  const merged = await fetchMergedForecast(latitude, longitude, days);
  const data = merged.hourly as any;
  const dailyData = merged.daily;

  // Parse hourly data
  const hourly: HourlyWeather[] = [];
  const hourlyTimes = (data as any).time || [];
  for (let i = 0; i < hourlyTimes.length; i++) {
    const temp = data.hourly.temperature_2m?.[i] ?? 0;
    const dewpoint = data.hourly.dewpoint_2m?.[i] ?? 0;
    const dew = calculateDewRisk(temp, dewpoint);

    const hour: HourlyWeather = {
      time: new Date(hourlyTimes[i]),
      temperature: temp,
      dewpoint,
      humidity: data.hourly.relative_humidity_2m?.[i] ?? 0,
      cloudTotal: data.hourly.cloud_cover?.[i] ?? 0,
      cloudLow: data.hourly.cloud_cover_low?.[i] ?? 0,
      cloudMid: data.hourly.cloud_cover_mid?.[i] ?? 0,
      cloudHigh: data.hourly.cloud_cover_high?.[i] ?? 0,
      windSpeed: data.hourly.wind_speed_10m?.[i] ?? 0,
      windGusts: data.hourly.wind_gusts_10m?.[i] ?? 0,
      precipitation: data.hourly.precipitation?.[i] ?? 0,
      seeing: undefined,
      astroIndex: 0,
      isImagingWindow: false,
      skyCondition: calculateSkyCondition(data.hourly.cloud_cover?.[i] ?? 0),
      dewRisk: dew.risk,
      dewPointDelta: dew.delta,
    };

    hour.astroIndex = calculateAstroIndex(hour);
    hour.isImagingWindow = hour.astroIndex >= 70 && hour.cloudTotal < 30 && hour.windSpeed < 20;

    hourly.push(hour);
  }

  // Parse nightly summaries (groupement par nuit astronomique: 20h jour J → 5h jour J+1)
  const nightly: NightlyWeather[] = [];
  const dailyTimes = data.daily?.time || [];
  for (let i = 0; i < dailyTimes.length; i++) {
    const nightDate = new Date(dailyTimes[i]);
    // Nuit du jour J = 20h-23h du jour J + 0h-5h du jour J+1
    const nextDay = new Date(nightDate);
    nextDay.setDate(nextDay.getDate() + 1);
    const nightHours = hourly.filter(h => {
      const hDate = new Date(h.time);
      const hour = h.time.getHours();
      // Heures du soir (20h-23h) du jour J
      if (hDate.toDateString() === nightDate.toDateString() && hour >= 20) return true;
      // Heures du matin (0h-5h) du jour J+1
      if (hDate.toDateString() === nextDay.toDateString() && hour <= 5) return true;
      return false;
    });

    const avgCloud = nightHours.length > 0
      ? nightHours.reduce((sum, h) => sum + h.cloudTotal, 0) / nightHours.length
      : 0;

    const minAstroIndex = nightHours.length > 0
      ? Math.min(...nightHours.map(h => h.astroIndex))
      : 0;

    let condition: NightlyWeather['condition'] = 'Poor';
    if (minAstroIndex >= 80 && avgCloud < 20) condition = 'Excellent';
    else if (minAstroIndex >= 60 && avgCloud < 40) condition = 'Good';
    else if (minAstroIndex >= 40) condition = 'Fair';

    nightly.push({
      date: nightDate,
      minTemp: data.daily.temperature_2m_min?.[i] ?? 0,
      maxTemp: data.daily.temperature_2m_max?.[i] ?? 0,
      avgCloudCover: Math.round(avgCloud),
      precipitationChance: 0,
      moonPhase: getMoonPhaseName(data.daily.moon_phase?.[i] ?? 0),
      condition,
      summary: `${condition} — Astro index ${Math.round(minAstroIndex)}/100, clouds ~${Math.round(avgCloud)}%`,
    });
  }

  // Weekly heatmap (7 jours)
  const weeklyHeatmap: WeeklyWeatherDay[] = nightly.map((night, idx) => ({
    date: night.date,
    astroScore: 0,
    cloudCoverNight: night.avgCloudCover,
    seeing: 0,
    moonPhase: data.daily?.moon_phase?.[idx] ?? 0,
    isBlackNight: night.moonPhase === 'New Moon' && night.avgCloudCover < 20,
    isGoodForImaging: night.condition === 'Excellent' || night.condition === 'Good',
  }));

  return {
    date: new Date(),
    hourly,
    nightly,
    weeklyHeatmap,
  };
}

function getMoonPhaseName(phase: number): string {
  if (phase < 0.05 || phase > 0.95) return 'New Moon';
  if (phase < 0.2) return 'Waxing Crescent';
  if (phase < 0.3) return 'First Quarter';
  if (phase < 0.45) return 'Waxing Gibbous';
  if (phase < 0.55) return 'Full Moon';
  if (phase < 0.7) return 'Waning Gibbous';
  if (phase < 0.8) return 'Last Quarter';
  return 'Waning Crescent';
}

/**
 * Récupère le forecast depuis le cache ou l'API
 */
export async function getWeatherWithCache(locationId: string, lat: number, lon: number): Promise<WeatherForecast> {
  // TODO: implémenter le cache SQLite côté backend
  return fetchWeatherForecast({ latitude: lat, longitude: lon, days: 14 });
}

/**
 * Calcule le score météo global pour une nuit
 */
export function calculateNightScore(forecast: WeatherForecast, nightIndex: number): number {
  const night = forecast.nightly[nightIndex];
  if (!night) return 0;

  let score = 100;
  score -= night.avgCloudCover;
  if (night.moonPhase === 'Full Moon') score -= 25;
  else if (night.moonPhase === 'Waxing Gibbous' || night.moonPhase === 'Waning Gibbous') score -= 20;
  else if (night.moonPhase === 'First Quarter' || night.moonPhase === 'Last Quarter') score -= 10;

  return Math.max(0, Math.min(100, score));
}
