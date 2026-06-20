// ============================================================================
// SERVICE CIBLES — Module 1 Dashboard
// Nova Rank, Telescopius suggestions, calculs astronomiques
// Migrated from mock data + direct Telescopius → API proxy
// v2: Dynamic filter recommendation, framing integration, imaging windows
// ============================================================================

import { AstroTarget, NovaScoreDetails, ImagingWindow, TelescopiusSuggestion, TargetsTonightQuery, BestTargetFilters } from '../../types/module1';
import { FilterType } from '../../types/module5';
import { RigProfile } from '../../types/module2';
import { searchTargets, recommendFiltersForTypes, calculateFilterScore, fetchBestTargets, TelescopiusTarget } from '../targetExplorerService';
import { calculateFraming, RigInfo } from '../targetExplorerService';

// Use backend proxy instead of direct Telescopius calls
const TELESCOPIUS_PROXY = '/api/telescopius';
const APLS_TARGETS = '/api/apls/targets';

function getToken(): string | null {
  return localStorage.getItem('astrosuite_token');
}

function authHeaders(): Record<string, string> {
  const token = getToken();
  const h: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) h['Authorization'] = `Bearer ${token}`;
  return h;
}

/**
 * Calcule la séparation angulaire Lune-cible par trigonométrie sphérique
 */
export function calculateMoonSeparation(
  targetRaDeg: number,
  targetDecDeg: number,
  moonRaDeg: number,
  moonDecDeg: number
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dec1 = toRad(targetDecDeg);
  const dec2 = toRad(moonDecDeg);
  const deltaRa = toRad(moonRaDeg - targetRaDeg);
  const a = Math.sin((dec2 - dec1) / 2) ** 2 +
            Math.cos(dec1) * Math.cos(dec2) * Math.sin(deltaRa / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return (c * 180) / Math.PI;
}

/**
 * Calcule l'altitude d'une cible à un moment donné
 */
export function calculateAltitude(
  raDeg: number,
  decDeg: number,
  lat: number,
  lon: number,
  date: Date
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const toDeg = (rad: number) => (rad * 180) / Math.PI;
  const jd = date.getTime() / 86400000 + 2440587.5;
  const lst = 280.46061837 + 360.98564736629 * (jd - 2451545.0) + lon;
  const ha = toRad(lst - raDeg);
  const dec = toRad(decDeg);
  const latRad = toRad(lat);
  const alt = Math.asin(
    Math.sin(dec) * Math.sin(latRad) +
    Math.cos(dec) * Math.cos(latRad) * Math.cos(ha)
  );
  return toDeg(alt);
}

/**
 * Calcule le temps avant le transit (en heures)
 */
export function calculateTimeToTransit(
  raDeg: number,
  lon: number,
  date: Date
): number {
  const jd = date.getTime() / 86400000 + 2440587.5;
  const lst = 280.46061837 + 360.98564736629 * (jd - 2451545.0) + lon;
  let ha = lst - raDeg;
  while (ha > 180) ha -= 360;
  while (ha < -180) ha += 360;
  return -ha / 15;
}

/**
 * Map Telescopius type codes to display type
 */
function mapObjectType(type: string): 'Galaxy' | 'Nebula' | 'Cluster' | 'Supernova' | 'Quasar' {
  const t = (type || '').toLowerCase();
  if (t.includes('galaxy') || t.includes('gxy') || t.includes('sgx') || t.includes('lgx') || t.includes('pogx') || t.includes('sfgx') || t.includes('agn')) return 'Galaxy';
  if (t.includes('planetary') || t.includes('plnb')) return 'Nebula'; // planetary nebula → Nebula category
  if (t.includes('nebula') || t.includes('neb') || t.includes('eneb') || t.includes('rneb') || t.includes('dineb') || t.includes('snrm') || t.includes('h2r')) return 'Nebula';
  if (t.includes('cluster') || t.includes('opcl') || t.includes('stcl') || t.includes('gxycl')) return 'Cluster';
  if (t.includes('supernova')) return 'Supernova';
  if (t.includes('quasar')) return 'Quasar';
  return 'Nebula';
}

/**
 * Algorithme NovaRank v2 — with dynamic filter matching + framing + imaging hours
 */
export function calculateNovaRank(
  target: AstroTarget,
  moonPhase: number,
  moonAltitude: number,
  moonRaDeg: number,
  moonDecDeg: number,
  lat: number,
  lon: number,
  date: Date,
  availableFilters: FilterType[],
  rig?: RigProfile | null
): { rank: number; details: NovaScoreDetails } {
  const altitude = target.altitudeCurrent ?? calculateAltitude(target.raDeg, target.decDeg, lat, lon, date);
  const altitudeScore = Math.max(0, Math.min(100, altitude * (100 / 90)));

  const timeToTransit = calculateTimeToTransit(target.raDeg, lon, date);
  let timeToTransitScore = 0;
  if (timeToTransit >= 0 && timeToTransit <= 2) {
    timeToTransitScore = 100 - (timeToTransit * 50);
  } else if (timeToTransit > 2 && timeToTransit <= 6) {
    timeToTransitScore = 50 - ((timeToTransit - 2) * 12.5);
  }
  timeToTransitScore = Math.max(0, Math.min(100, timeToTransitScore));

  const moonSep = target.moonSeparation ??
    calculateMoonSeparation(target.raDeg, target.decDeg, moonRaDeg, moonDecDeg);
  let moonScore = 100;
  if (moonPhase > 0.75) moonScore -= 40;
  else if (moonPhase > 0.5) moonScore -= 25;
  else if (moonPhase > 0.25) moonScore -= 10;
  if (moonSep < 30) moonScore -= 30;
  else if (moonSep < 60) moonScore -= 15;
  moonScore = Math.max(0, Math.min(100, moonScore));

  // Dynamic filter score based on Telescopius types
  const targetFilters = target.recommendedFilters.length > 0
    ? target.recommendedFilters
    : recommendFiltersForTypes(target.telescopiusTypes || []);
  const filterScore = calculateFilterScore(targetFilters, availableFilters);
  const visibilityScore = target.isVisible ? 100 : 0;

  // Imaging hours score (0-100 scale)
  const imagingHours = target.totalImagingHours || 0;
  let imagingHoursScore = 0;
  if (imagingHours >= 6) imagingHoursScore = 100;
  else if (imagingHours >= 4) imagingHoursScore = 80;
  else if (imagingHours >= 2) imagingHoursScore = 60;
  else if (imagingHours >= 1) imagingHoursScore = 40;
  else if (imagingHours > 0) imagingHoursScore = 20;

  // Framing fit score
  let framingFit: NovaScoreDetails['framingFit'] = 'unknown';
  let coveragePercent: number | null = null;
  if (rig && target.sizeArcmin > 0) {
    const rigInfo: RigInfo = {
      name: rig.name,
      focalLength: rig.telescope.focalLength * (rig.modifier.type === 'None' ? 1 : rig.modifier.factor),
      aperture: rig.telescope.aperture,
      fRatio: rig.telescope.fRatio,
      sensorWidth: rig.camera.sensorWidth,
      sensorHeight: rig.camera.sensorHeight,
      pixelSize: rig.camera.pixelSize,
    };
    const framing = calculateFraming(target as any, rigInfo);
    framingFit = framing.fitStatus;
    coveragePercent = framing.coveragePercent;
  }

  const details: NovaScoreDetails = {
    altitudeScore: Math.round(altitudeScore),
    timeToTransitScore: Math.round(timeToTransitScore),
    moonScore: Math.round(moonScore),
    filterScore,
    visibilityScore,
    imagingHours: imagingHoursScore,
    framingFit,
    coveragePercent,
  };

  // Weights: altitude 30%, transit 15%, moon 20%, filter 15%, imaging 10%, framing 10%
  const rank = Math.round(
    0.30 * details.altitudeScore +
    0.15 * details.timeToTransitScore +
    0.20 * details.moonScore +
    0.15 * details.filterScore +
    0.10 * details.imagingHours +
    0.10 * (details.framingFit === 'perfect' ? 100 : details.framingFit === 'good' ? 80 : details.framingFit === 'tight' ? 50 : details.framingFit === 'too_large' ? 20 : 50)
  );

  return { rank, details };
}

/**
 * Récupère les suggestions Telescopius via backend proxy
 */
export async function fetchTelescopiusSuggestions(
  lat: number,
  lon: number,
  _apiKey?: string
): Promise<TelescopiusSuggestion[]> {
  try {
    const params = new URLSearchParams({
      latitude: lat.toString(),
      longitude: lon.toString(),
      date: new Date().toISOString().split('T')[0],
    });
    const response = await fetch(`${TELESCOPIUS_PROXY}/search?${params.toString()}`, {
      headers: authHeaders(),
    });
    if (!response.ok) throw new Error(`Telescopius proxy error: ${response.status}`);
    const data = await response.json();
    return (data.targets || data || []).map((t: any) => ({
      id: t.id?.toString() || `tel_${Math.random().toString(36).slice(2)}`,
      name: t.name,
      catalogName: t.catalog_name || t.name,
      raDeg: t.ra_deg || 0,
      decDeg: t.dec_deg || 0,
      type: t.type || 'Nebula',
      magnitude: t.magnitude ?? null,
      sizeArcmin: t.size_arcmin ?? null,
      altitudeMax: t.altitude_max || 0,
      imageUrl: t.image_url,
      badges: [t.type, `Mag ${t.magnitude || '?'}`, t.size_arcmin ? `${Math.round(t.size_arcmin)}'` : ''].filter(Boolean),
    }));
  } catch (err) {
    console.error('Failed to fetch Telescopius suggestions:', err);
    return [];
  }
}

/**
 * Fetch best targets tonight using highlights endpoint
 */
export async function fetchBestTargetsTonight(
  filters: BestTargetFilters,
  availableFilters: FilterType[],
  moonData: { phase: number; altitude: number; raDeg: number; decDeg: number },
  rig?: RigProfile | null
): Promise<AstroTarget[]> {
  try {
    const result = await fetchBestTargets(filters);
    const now = new Date();

    return result.targets
      .map(t => {
        const astroTarget: AstroTarget = {
          id: t.id || t.mainId,
          name: t.mainName,
          catalogName: t.mainId,
          ra: t.ra,
          dec: t.dec,
          raDeg: t.raDeg,
          decDeg: t.decDeg,
          type: mapObjectType(t.type),
          subtype: t.type,
          magnitude: t.magnitude ?? null,
          surfaceBrightness: t.surfaceBrightness,
          sizeArcmin: t.sizeArcmin ?? null,
          difficulty: 'Intermediate',
          recommendedFilters: recommendFiltersForTypes(t.type ? [t.type] : []),
          telescopiusTypes: t.type ? t.type.split(',') : [],
          altitudeMax: t.altitudeMax,
          altitudeCurrent: t.altitudeCurrent,
          moonSeparation: t.moonSeparation,
          isVisible: (t.altitudeCurrent ?? 0) > 0,
          isAboveHorizon: (t.altitudeCurrent ?? 0) > 0,
          isInImagingWindow: (t.altitudeCurrent ?? 0) > 20,
          imagingWindows: t.imagingWindows || [],
          totalImagingHours: t.totalImagingHours,
          imageUrl: t.imageUrl,
          constellation: t.constellation,
          commonNames: t.commonNames,
          riseTime: t.rise ? new Date(`${now.toISOString().split('T')[0]}T${t.rise}`) : undefined,
          setTime: t.setTime ? new Date(`${now.toISOString().split('T')[0]}T${t.setTime}`) : undefined,
          transitTime: t.transitTime ? new Date(`${now.toISOString().split('T')[0]}T${t.transitTime}`) : undefined,
          novaRank: 0,
          scoreDetails: { altitudeScore: 0, timeToTransitScore: 0, moonScore: 0, filterScore: 0, visibilityScore: 0, imagingHours: 0, framingFit: 'unknown', coveragePercent: null },
        };

        const { rank, details } = calculateNovaRank(
          astroTarget, moonData.phase, moonData.altitude, moonData.raDeg, moonData.decDeg,
          filters.lat, filters.lon, now, availableFilters, rig
        );
        astroTarget.novaRank = rank;
        astroTarget.scoreDetails = details;

        return astroTarget;
      })
      .sort((a, b) => b.novaRank - a.novaRank);
  } catch (err) {
    console.error('Failed to fetch best targets:', err);
    return [];
  }
}

/**
 * Récupère les cibles de la nuit avec Nova Rank
 * Uses saved targets from API + Telescopius visibility data
 */
export async function fetchTargetsTonight(
  query: TargetsTonightQuery,
  availableFilters: FilterType[],
  moonData: { phase: number; altitude: number; raDeg: number; decDeg: number },
  rig?: RigProfile | null
): Promise<AstroTarget[]> {
  const { lat, lon, minAltitude = 20, maxMoonSeparation = 60, limit = 20 } = query;

  // Try to load targets from saved DB first
  let targets: AstroTarget[] = [];
  try {
    const res = await fetch('/api/targets', { headers: authHeaders() });
    if (res.ok) {
      const saved = await res.json();
      targets = saved.map((t: any) => mapApiTarget(t));
    }
  } catch (err) {
    console.error('Failed to load saved targets:', err);
  }

  // If no saved targets, fetch from Telescopius
  if (targets.length === 0) {
    try {
      const suggestions = await fetchTelescopiusSuggestions(lat, lon);
      targets = suggestions.map(s => mapSuggestionToTarget(s));
    } catch (err) {
      console.error('Failed to fetch Telescopius targets:', err);
    }
  }

  const now = new Date();
  const ranked = targets.map(t => {
    const { rank, details } = calculateNovaRank(
      t, moonData.phase, moonData.altitude, moonData.raDeg, moonData.decDeg,
      lat, lon, now, availableFilters, rig
    );
    return { ...t, novaRank: rank, scoreDetails: details };
  });

  return ranked
    .filter(t => (t.altitudeCurrent ?? 0) >= minAltitude)
    .filter(t => (t.moonSeparation ?? 90) <= maxMoonSeparation)
    .sort((a, b) => b.novaRank - a.novaRank)
    .slice(0, limit);
}

// --- Mappers ---

function mapApiTarget(t: any): AstroTarget {
  const now = new Date();
  const lat = 43.7889, lon = 4.7533;
  const raDeg = parseRaToDeg(t.ra || t.objectId);
  const decDeg = parseDecToDeg(t.dec || '');
  const altCurrent = calculateAltitude(raDeg, decDeg, lat, lon, now);
  const types = t.objectType ? t.objectType.split(',') : t.types || [];

  return {
    id: t.id,
    name: t.commonName || t.objectId || 'Unknown',
    catalogName: t.objectId || t.commonName || '',
    ra: t.ra || '',
    dec: t.dec || '',
    raDeg,
    decDeg,
    type: mapObjectType(t.objectType || ''),
    subtype: t.objectType || '',
    magnitude: t.magnitude ?? null,
    surfaceBrightness: t.surfaceBrightness ?? null,
    sizeArcmin: (t.angularSizeArcmin?.width || t.size_width || null),
    difficulty: 'Intermediate',
    recommendedFilters: recommendFiltersForTypes(types),
    telescopiusTypes: types,
    altitudeCurrent: altCurrent,
    altitudeMax: t.altitude_max,
    isVisible: altCurrent > 0,
    isAboveHorizon: altCurrent > 0,
    isInImagingWindow: altCurrent > 20,
    imagingWindows: [],
    totalImagingHours: 0,
    moonSeparation: t.moon_separation,
    novaRank: 0,
    scoreDetails: { altitudeScore: 0, timeToTransitScore: 0, moonScore: 0, filterScore: 0, visibilityScore: 0, imagingHours: 0, framingFit: 'unknown', coveragePercent: null },
  };
}

function mapSuggestionToTarget(s: TelescopiusSuggestion): AstroTarget {
  const now = new Date();
  const lat = 43.7889, lon = 4.7533;
  const altCurrent = calculateAltitude(s.raDeg, s.decDeg, lat, lon, now);

  return {
    id: s.id,
    name: s.name,
    catalogName: s.catalogName,
    ra: '', dec: '',
    raDeg: s.raDeg,
    decDeg: s.decDeg,
    type: mapObjectType(s.type),
    subtype: s.type,
    magnitude: s.magnitude,
    sizeArcmin: s.sizeArcmin,
    difficulty: 'Intermediate',
    recommendedFilters: recommendFiltersForTypes([s.type]),
    telescopiusTypes: [s.type],
    altitudeCurrent: altCurrent,
    altitudeMax: s.altitudeMax,
    isVisible: altCurrent > 0,
    isAboveHorizon: altCurrent > 0,
    isInImagingWindow: altCurrent > 20,
    imagingWindows: [],
    totalImagingHours: 0,
    moonSeparation: undefined,
    novaRank: 0,
    scoreDetails: { altitudeScore: 0, timeToTransitScore: 0, moonScore: 0, filterScore: 0, visibilityScore: 0, imagingHours: 0, framingFit: 'unknown', coveragePercent: null },
  };
}

function parseRaToDeg(ra: string | number): number {
  // Telescopius API returns RA in hours (J2000), not degrees!
  if (typeof ra === 'number') return ra * 15;
  if (!ra || !ra.includes(':')) {
    return (parseFloat(ra) || 0) * 15; // hours → degrees
  }
  const parts = ra.split(':').map(Number);
  return (parts[0] || 0) * 15 + (parts[1] || 0) * 15 / 60 + (parts[2] || 0) * 15 / 3600;
}

function parseDecToDeg(dec: string): number {
  if (!dec || !dec.includes(':')) return parseFloat(dec) || 0;
  const sign = dec.startsWith('-') ? -1 : 1;
  const parts = dec.replace(/[+-]/, '').split(':').map(Number);
  return sign * ((parts[0] || 0) + (parts[1] || 0) / 60 + (parts[2] || 0) / 3600);
}