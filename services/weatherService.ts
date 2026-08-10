import { AstroForecastResponse } from '../types';

// ============================================================================
// MÉTÉO MULTI-MODÈLES — Merge AROME HD + ARPEGE Europe + GFS
// AROME France HD (1.5 km) pour J1-J2, ARPEGE Europe (11 km) pour J3-J4,
// GFS (13 km) pour J5+. Appels parallèles, merge des tableaux hourly/daily.
// ============================================================================

const HOURLY_VARS = 'temperature_2m,dewpoint_2m,relative_humidity_2m,cloud_cover,cloud_cover_low,cloud_cover_mid,cloud_cover_high,wind_speed_10m,wind_gusts_10m,precipitation';
const DAILY_VARS = 'temperature_2m_max,temperature_2m_min,sunrise,sunset,moonrise,moonset,moon_phase';

export interface MergedWeatherData {
  hourly: AstroForecastResponse;
  daily: {
    time: string[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    sunrise: string[];
    sunset: string[];
    moonrise: string[];
    moonset: string[];
    moon_phase: number[];
  };
  models_used: { range: string; model: string }[];
}

/**
 * Fusionne les tableaux en coupant les jours qui chevauchent.
 * Garde les N premiers éléments de source1, puis les éléments de source2 à partir de l'index startIdx.
 */
function mergeArrays<T>(source1: T[], source2: T[], startIdx: number): T[] {
  if (!source2 || source2.length === 0) return source1;
  if (startIdx >= source2.length) return source1;
  return [...source1, ...source2.slice(startIdx)];
}

/**
 * Trouve l'index dans un tableau de timestamps qui correspond au début d'un jour donné.
 */
function findDayStartIndex(times: string[], dayOffset: number): number {
  if (!times || times.length === 0) return 0;
  const today = new Date(times[0]);
  const targetDate = new Date(today);
  targetDate.setDate(today.getDate() + dayOffset);
  const targetStr = targetDate.toISOString().split('T')[0];
  
  return times.findIndex(t => t.startsWith(targetStr));
}

/**
 * Fetch multi-modèles depuis Open-Meteo:
 * - AROME France HD pour J1-J2 (API Météo-France)
 * - ARPEGE Europe pour J3-J4 (API Météo-France)
 * - GFS pour J5+ (API GFS)
 * 
 * Les 3 requêtes sont lancées en parallèle puis mergées.
 */
export async function fetchMergedForecast(
  latitude: number,
  longitude: number,
  totalDays: number = 14,
): Promise<MergedWeatherData> {
  const lat = latitude.toFixed(2);
  const lon = longitude.toFixed(2);
  const tz = 'auto';

  // Lancer les 3 requêtes en parallèle
  const [aromeRes, arpegeRes, gfsRes] = await Promise.allSettled([
    // 1. AROME France HD — J1-J2
    fetch(
      `https://api.open-meteo.com/v1/meteofrance?latitude=${lat}&longitude=${lon}` +
      `&hourly=${HOURLY_VARS}&daily=${DAILY_VARS}` +
      `&forecast_days=2&timezone=${tz}&models=arome_france_hd`
    ).then(r => r.ok ? r.json() : Promise.reject(new Error(`AROME HD: ${r.status}`))),

    // 2. ARPEGE Europe — J3-J4 (on récupère 4 jours mais on garde que J3-J4)
    fetch(
      `https://api.open-meteo.com/v1/meteofrance?latitude=${lat}&longitude=${lon}` +
      `&hourly=${HOURLY_VARS}&daily=${DAILY_VARS}` +
      `&forecast_days=4&timezone=${tz}&models=arpege_europe`
    ).then(r => r.ok ? r.json() : Promise.reject(new Error(`ARPEGE Europe: ${r.status}`))),

    // 3. GFS — J5+ (on récupère 7 jours mais on garde que J5+)
    fetch(
      `https://api.open-meteo.com/v1/gfs?latitude=${lat}&longitude=${lon}` +
      `&hourly=${HOURLY_VARS}&daily=${DAILY_VARS}` +
      `&forecast_days=${totalDays}&timezone=${tz}&models=gfs_seamless`
    ).then(r => r.ok ? r.json() : Promise.reject(new Error(`GFS: ${r.status}`))),
  ]);

  const modelsUsed: { range: string; model: string }[] = [];
  const errors: string[] = [];

  // Récupérer les données (avec fallback si une source échoue)
  let aromeData: any = aromeRes.status === 'fulfilled' ? aromeRes.value : null;
  let arpegeData: any = arpegeRes.status === 'fulfilled' ? arpegeRes.value : null;
  let gfsData: any = gfsRes.status === 'fulfilled' ? gfsRes.value : null;

  if (!aromeData) {
    errors.push('AROME HD failed');
    // Fallback: utiliser ARPEGE pour J1-J2 si AROME échoue
    if (arpegeData) {
      aromeData = arpegeData;
      modelsUsed.push({ range: 'J1-J2', model: 'arpege_europe (fallback, AROME failed)' });
    } else if (gfsData) {
      aromeData = gfsData;
      modelsUsed.push({ range: 'J1-J2', model: 'gfs_seamless (fallback, AROME failed)' });
    }
  } else {
    modelsUsed.push({ range: 'J1-J2', model: 'arome_france_hd' });
  }

  if (!arpegeData) {
    errors.push('ARPEGE Europe failed');
    // Fallback: GFS couvre J3-J4
    if (gfsData) {
      arpegeData = gfsData;
      modelsUsed.push({ range: 'J3-J4', model: 'gfs_seamless (fallback, ARPEGE failed)' });
    }
  } else {
    modelsUsed.push({ range: 'J3-J4', model: 'arpege_europe' });
  }

  if (!gfsData) {
    errors.push('GFS failed');
    // Fallback: ARPEGE pour J5+ (limite à 4 jours donc incomplet)
    if (arpegeData) {
      gfsData = arpegeData;
      modelsUsed.push({ range: 'J5+', model: 'arpege_europe (fallback, GFS failed)' });
    }
  } else {
    modelsUsed.push({ range: 'J5+', model: 'gfs_seamless' });
  }

  // Si tout a échoué
  if (!aromeData && !arpegeData && !gfsData) {
    throw new Error('All weather models failed: ' + errors.join(', '));
  }

  // --- MERGE HOURLY ---
  // AROME: J1-J2 (48 heures, index 0-47)
  // ARPEGE: J3-J4 commencent à l'index 48 (jour 3 = heures 48-71, jour 4 = heures 72-95)
  // GFS: J5+ commencent à l'index 96

  let mergedHourlyTime: string[] = [];
  let mergedHourlyTemp: number[] = [];
  let mergedHourlyDewpoint: number[] = [];
  let mergedHourlyHumidity: number[] = [];
  let mergedHourlyCloudCover: number[] = [];
  let mergedHourlyCloudLow: number[] = [];
  let mergedHourlyCloudMid: number[] = [];
  let mergedHourlyCloudHigh: number[] = [];
  let mergedHourlyWindSpeed: number[] = [];
  let mergedHourlyWindGusts: number[] = [];
  let mergedHourlyPrecip: number[] = [];

  // Source primaire pour J1-J2
  const primarySource = aromeData || arpegeData || gfsData;
  
  if (primarySource?.hourly) {
    mergedHourlyTime = [...(primarySource.hourly.time || [])];
    mergedHourlyTemp = [...(primarySource.hourly.temperature_2m || [])];
    mergedHourlyDewpoint = [...(primarySource.hourly.dewpoint_2m || [])];
    mergedHourlyHumidity = [...(primarySource.hourly.relative_humidity_2m || [])];
    mergedHourlyCloudCover = [...(primarySource.hourly.cloud_cover || [])];
    mergedHourlyCloudLow = [...(primarySource.hourly.cloud_cover_low || [])];
    mergedHourlyCloudMid = [...(primarySource.hourly.cloud_cover_mid || [])];
    mergedHourlyCloudHigh = [...(primarySource.hourly.cloud_cover_high || [])];
    mergedHourlyWindSpeed = [...(primarySource.hourly.wind_speed_10m || [])];
    mergedHourlyWindGusts = [...(primarySource.hourly.wind_gusts_10m || [])];
    mergedHourlyPrecip = [...(primarySource.hourly.precipitation || [])];
  }

  // ⚠️ AROME France HD ne fournit pas cloud_cover (null pour 100% des heures)
  // Fallback: combler les nulls avec ARPEGE Europe sur J1-J2
  if (aromeData?.hourly && arpegeData?.hourly) {
    const aromeCloud = aromeData.hourly.cloud_cover || [];
    const arpegeCloud = arpegeData.hourly.cloud_cover || [];
    let patched = 0;
    for (let i = 0; i < Math.min(aromeCloud.length, arpegeCloud.length); i++) {
      if (aromeCloud[i] === null && arpegeCloud[i] !== null && arpegeCloud[i] !== undefined) {
        mergedHourlyCloudCover[i] = arpegeCloud[i];
        patched++;
      }
    }
    if (patched > 0) {
      console.log(`[Weather] AROME HD cloud_cover: ${patched} nulls patched from ARPEGE Europe`);
    }
  }

  // ARPEGE pour J3-J4 (index 48-95 dans le tableau ARPEGE qui a 4 jours)
  if (arpegeData?.hourly && arpegeData !== primarySource) {
    const arpegeStartIdx = findDayStartIndex(arpegeData.hourly.time, 2); // J3 = offset 2
    if (arpegeStartIdx >= 0) {
      mergedHourlyTime = mergeArrays(mergedHourlyTime, arpegeData.hourly.time, arpegeStartIdx);
      mergedHourlyTemp = mergeArrays(mergedHourlyTemp, arpegeData.hourly.temperature_2m || [], arpegeStartIdx);
      mergedHourlyDewpoint = mergeArrays(mergedHourlyDewpoint, arpegeData.hourly.dewpoint_2m || [], arpegeStartIdx);
      mergedHourlyHumidity = mergeArrays(mergedHourlyHumidity, arpegeData.hourly.relative_humidity_2m || [], arpegeStartIdx);
      mergedHourlyCloudCover = mergeArrays(mergedHourlyCloudCover, arpegeData.hourly.cloud_cover || [], arpegeStartIdx);
      mergedHourlyCloudLow = mergeArrays(mergedHourlyCloudLow, arpegeData.hourly.cloud_cover_low || [], arpegeStartIdx);
      mergedHourlyCloudMid = mergeArrays(mergedHourlyCloudMid, arpegeData.hourly.cloud_cover_mid || [], arpegeStartIdx);
      mergedHourlyCloudHigh = mergeArrays(mergedHourlyCloudHigh, arpegeData.hourly.cloud_cover_high || [], arpegeStartIdx);
      mergedHourlyWindSpeed = mergeArrays(mergedHourlyWindSpeed, arpegeData.hourly.wind_speed_10m || [], arpegeStartIdx);
      mergedHourlyWindGusts = mergeArrays(mergedHourlyWindGusts, arpegeData.hourly.wind_gusts_10m || [], arpegeStartIdx);
      mergedHourlyPrecip = mergeArrays(mergedHourlyPrecip, arpegeData.hourly.precipitation || [], arpegeStartIdx);
    }
  }

  // GFS pour J5+ (index 96+ dans le tableau GFS qui a 7 jours)
  if (gfsData?.hourly && gfsData !== primarySource && gfsData !== arpegeData) {
    const gfsStartIdx = findDayStartIndex(gfsData.hourly.time, 4); // J5 = offset 4
    if (gfsStartIdx >= 0) {
      mergedHourlyTime = mergeArrays(mergedHourlyTime, gfsData.hourly.time, gfsStartIdx);
      mergedHourlyTemp = mergeArrays(mergedHourlyTemp, gfsData.hourly.temperature_2m || [], gfsStartIdx);
      mergedHourlyDewpoint = mergeArrays(mergedHourlyDewpoint, gfsData.hourly.dewpoint_2m || [], gfsStartIdx);
      mergedHourlyHumidity = mergeArrays(mergedHourlyHumidity, gfsData.hourly.relative_humidity_2m || [], gfsStartIdx);
      mergedHourlyCloudCover = mergeArrays(mergedHourlyCloudCover, gfsData.hourly.cloud_cover || [], gfsStartIdx);
      mergedHourlyCloudLow = mergeArrays(mergedHourlyCloudLow, gfsData.hourly.cloud_cover_low || [], gfsStartIdx);
      mergedHourlyCloudMid = mergeArrays(mergedHourlyCloudMid, gfsData.hourly.cloud_cover_mid || [], gfsStartIdx);
      mergedHourlyCloudHigh = mergeArrays(mergedHourlyCloudHigh, gfsData.hourly.cloud_cover_high || [], gfsStartIdx);
      mergedHourlyWindSpeed = mergeArrays(mergedHourlyWindSpeed, gfsData.hourly.wind_speed_10m || [], gfsStartIdx);
      mergedHourlyWindGusts = mergeArrays(mergedHourlyWindGusts, gfsData.hourly.wind_gusts_10m || [], gfsStartIdx);
      mergedHourlyPrecip = mergeArrays(mergedHourlyPrecip, gfsData.hourly.precipitation || [], gfsStartIdx);
    }
  }

  // --- MERGE DAILY ---
  // Même logique: AROME J1-J2, ARPEGE J3-J4, GFS J5+
  // ⚠️ moon_phase n'est disponible que sur GFS. Pour J1-J4, on prend les valeurs GFS si dispo.
  let mergedDailyTime: string[] = [];
  let mergedDailyTempMax: number[] = [];
  let mergedDailyTempMin: number[] = [];
  let mergedDailySunrise: string[] = [];
  let mergedDailySunset: string[] = [];
  let mergedDailyMoonrise: string[] = [];
  let mergedDailyMoonset: string[] = [];
  let mergedDailyMoonPhase: number[] = [];

  if (primarySource?.daily) {
    mergedDailyTime = [...(primarySource.daily.time || [])];
    mergedDailyTempMax = [...(primarySource.daily.temperature_2m_max || [])];
    mergedDailyTempMin = [...(primarySource.daily.temperature_2m_min || [])];
    mergedDailySunrise = [...(primarySource.daily.sunrise || [])];
    mergedDailySunset = [...(primarySource.daily.sunset || [])];
    mergedDailyMoonrise = [...(primarySource.daily.moonrise || [])];
    mergedDailyMoonset = [...(primarySource.daily.moonset || [])];
    mergedDailyMoonPhase = [...(primarySource.daily.moon_phase || [])];
  }

  if (arpegeData?.daily && arpegeData !== primarySource) {
    const arpegeDailyStart = arpegeData.daily.time?.findIndex((t: string) => 
      t === (mergedDailyTime[mergedDailyTime.length - 1] ? 
        new Date(new Date(mergedDailyTime[mergedDailyTime.length - 1]).getTime() + 86400000).toISOString().split('T')[0] 
        : null)
    );
    // Si on trouve le jour suivant le dernier jour AROME, on merge à partir de là
    if (arpegeDailyStart !== undefined && arpegeDailyStart >= 0) {
      mergedDailyTime = mergeArrays(mergedDailyTime, arpegeData.daily.time, arpegeDailyStart);
      mergedDailyTempMax = mergeArrays(mergedDailyTempMax, arpegeData.daily.temperature_2m_max || [], arpegeDailyStart);
      mergedDailyTempMin = mergeArrays(mergedDailyTempMin, arpegeData.daily.temperature_2m_min || [], arpegeDailyStart);
      mergedDailySunrise = mergeArrays(mergedDailySunrise, arpegeData.daily.sunrise || [], arpegeDailyStart);
      mergedDailySunset = mergeArrays(mergedDailySunset, arpegeData.daily.sunset || [], arpegeDailyStart);
      mergedDailyMoonrise = mergeArrays(mergedDailyMoonrise, arpegeData.daily.moonrise || [], arpegeDailyStart);
      mergedDailyMoonset = mergeArrays(mergedDailyMoonset, arpegeData.daily.moonset || [], arpegeDailyStart);
      mergedDailyMoonPhase = mergeArrays(mergedDailyMoonPhase, arpegeData.daily.moon_phase || [], arpegeDailyStart);
    }
  }

  if (gfsData?.daily && gfsData !== primarySource && gfsData !== arpegeData) {
    const gfsDailyStart = gfsData.daily.time?.findIndex((t: string) =>
      t === (mergedDailyTime[mergedDailyTime.length - 1] ? 
        new Date(new Date(mergedDailyTime[mergedDailyTime.length - 1]).getTime() + 86400000).toISOString().split('T')[0]
        : null)
    );
    if (gfsDailyStart !== undefined && gfsDailyStart >= 0) {
      mergedDailyTime = mergeArrays(mergedDailyTime, gfsData.daily.time, gfsDailyStart);
      mergedDailyTempMax = mergeArrays(mergedDailyTempMax, gfsData.daily.temperature_2m_max || [], gfsDailyStart);
      mergedDailyTempMin = mergeArrays(mergedDailyTempMin, gfsData.daily.temperature_2m_min || [], gfsDailyStart);
      mergedDailySunrise = mergeArrays(mergedDailySunrise, gfsData.daily.sunrise || [], gfsDailyStart);
      mergedDailySunset = mergeArrays(mergedDailySunset, gfsData.daily.sunset || [], gfsDailyStart);
      mergedDailyMoonrise = mergeArrays(mergedDailyMoonrise, gfsData.daily.moonrise || [], gfsDailyStart);
      mergedDailyMoonset = mergeArrays(mergedDailyMoonset, gfsData.daily.moonset || [], gfsDailyStart);
      mergedDailyMoonPhase = mergeArrays(mergedDailyMoonPhase, gfsData.daily.moon_phase || [], gfsDailyStart);
    } else {
      // GFS a moon_phase pour tous les jours — remplir J1-J4 si manquant
      if (gfsData.daily?.moon_phase && mergedDailyMoonPhase.length < mergedDailyTime.length) {
        const gfsMoonPhases = gfsData.daily.moon_phase;
        // Remplir les jours J1-J4 avec les valeurs GFS correspondantes
        for (let i = 0; i < Math.min(mergedDailyMoonPhase.length, gfsMoonPhases.length); i++) {
          if (mergedDailyMoonPhase[i] === undefined || mergedDailyMoonPhase[i] === null || isNaN(mergedDailyMoonPhase[i])) {
            mergedDailyMoonPhase[i] = gfsMoonPhases[i];
          }
        }
      }
    }
  }

  // Compléter moon_phase pour J1-J4 depuis GFS si les valeurs sont manquantes
  // (Météo-France API ne fournit pas toujours moon_phase)
  if (gfsData?.daily?.moon_phase && mergedDailyMoonPhase.some(v => v === undefined || v === null || isNaN(v))) {
    const gfsPhases = gfsData.daily.moon_phase;
    for (let i = 0; i < mergedDailyMoonPhase.length; i++) {
      if ((mergedDailyMoonPhase[i] === undefined || mergedDailyMoonPhase[i] === null || isNaN(mergedDailyMoonPhase[i])) && gfsPhases[i] !== undefined) {
        mergedDailyMoonPhase[i] = gfsPhases[i];
      }
    }
  }

  const hourly = {
    time: mergedHourlyTime,
    temperature_2m: mergedHourlyTemp,
    dewpoint_2m: mergedHourlyDewpoint,
    relative_humidity_2m: mergedHourlyHumidity,
    cloud_cover: mergedHourlyCloudCover,
    cloud_cover_low: mergedHourlyCloudLow,
    cloud_cover_mid: mergedHourlyCloudMid,
    cloud_cover_high: mergedHourlyCloudHigh,
    wind_speed_10m: mergedHourlyWindSpeed,
    wind_gusts_10m: mergedHourlyWindGusts,
    precipitation: mergedHourlyPrecip,
  } as unknown as AstroForecastResponse;

  const daily = {
    time: mergedDailyTime,
    temperature_2m_max: mergedDailyTempMax,
    temperature_2m_min: mergedDailyTempMin,
    sunrise: mergedDailySunrise,
    sunset: mergedDailySunset,
    moonrise: mergedDailyMoonrise,
    moonset: mergedDailyMoonset,
    moon_phase: mergedDailyMoonPhase,
  };

  if (errors.length > 0) {
    console.warn('[Weather] Fallbacks used:', errors.join(', '));
  }

  return { hourly, daily, models_used: modelsUsed };
}


/**
 * Fetches a specialized astrophotography forecast from the merged multi-model API.
 * Uses AROME HD for J1-J2, ARPEGE Europe for J3-J4, GFS for J5+.
 * @param latitude The user's latitude.
 * @param longitude The user's longitude.
 * @param startDate The start date for the forecast.
 * @returns A promise that resolves to the hourly forecast data.
 */
export const fetchAstroForecast = async (latitude: number, longitude: number, startDate: Date): Promise<AstroForecastResponse | null> => {
  try {
    const merged = await fetchMergedForecast(latitude, longitude, 14);
    return merged.hourly;
  } catch (error) {
    console.error("Failed to fetch astro weather forecast:", error);
    throw error;
  }
};

/**
 * Fetches a 14-day weather forecast for nightly summaries.
 * Uses merged models: AROME HD (J1-J2), ARPEGE Europe (J3-J4), GFS (J5+).
 * @param latitude The user's latitude.
 * @param longitude The user's longitude.
 * @returns A promise that resolves to the hourly forecast data.
 */
export const fetchNightlyForecast = async (latitude: number, longitude: number): Promise<AstroForecastResponse | null> => {
  try {
    const merged = await fetchMergedForecast(latitude, longitude, 16);
    return merged.hourly;
  } catch (error) {
    console.error("Failed to fetch nightly forecast:", error);
    throw error;
  }
};