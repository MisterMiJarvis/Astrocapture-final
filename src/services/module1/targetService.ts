// ============================================================================
// SERVICE CIBLES — Module 1 Dashboard
// Nova Rank, Telescopius suggestions, calculs astronomiques
// Migrated from mock data + direct Telescopius → API proxy
// ============================================================================

import { AstroTarget, NovaScoreDetails, TelescopiusSuggestion, TargetsTonightQuery } from '../../types/module1';

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
 * Algorithme NovaRank
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
  availableFilters: string[]
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

  const hasRecommendedFilter = target.recommendedFilters.some(f => availableFilters.includes(f));
  const filterScore = hasRecommendedFilter ? 100 : 30;
  const visibilityScore = target.isVisible ? 100 : 0;

  const details: NovaScoreDetails = {
    altitudeScore: Math.round(altitudeScore),
    timeToTransitScore: Math.round(timeToTransitScore),
    moonScore: Math.round(moonScore),
    filterScore,
    visibilityScore,
  };

  const rank = Math.round(
    0.35 * details.altitudeScore +
    0.25 * details.timeToTransitScore +
    0.20 * details.moonScore +
    0.15 * details.filterScore +
    0.05 * details.visibilityScore
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
      magnitude: t.magnitude || 0,
      sizeArcmin: t.size_arcmin || 0,
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
 * Récupère les cibles de la nuit avec Nova Rank
 * Uses saved targets from API + Telescopius visibility data
 */
export async function fetchTargetsTonight(
  query: TargetsTonightQuery,
  availableFilters: string[],
  moonData: { phase: number; altitude: number; raDeg: number; decDeg: number }
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
      lat, lon, now, availableFilters
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

  return {
    id: t.id,
    name: t.commonName || t.objectId || 'Unknown',
    catalogName: t.objectId || t.commonName || '',
    ra: t.ra || '',
    dec: t.dec || '',
    raDeg,
    decDeg,
    type: mapObjectType(t.objectType),
    subtype: t.objectType || '',
    magnitude: t.magnitude ?? 0,
    sizeArcmin: (t.angularSizeArcmin?.width || t.size_width || 0),
    difficulty: 'Intermediate',
    recommendedFilters: ['UV_IR_Cut', 'L_Ultimate'],
    altitudeCurrent: altCurrent,
    isVisible: altCurrent > 0,
    isAboveHorizon: altCurrent > 0,
    isInImagingWindow: altCurrent > 20,
    novaRank: 0,
    scoreDetails: { altitudeScore: 0, timeToTransitScore: 0, moonScore: 0, filterScore: 0, visibilityScore: 0 },
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
    recommendedFilters: ['UV_IR_Cut', 'L_Ultimate'],
    altitudeCurrent: altCurrent,
    isVisible: altCurrent > 0,
    isAboveHorizon: altCurrent > 0,
    isInImagingWindow: altCurrent > 20,
    novaRank: 0,
    scoreDetails: { altitudeScore: 0, timeToTransitScore: 0, moonScore: 0, filterScore: 0, visibilityScore: 0 },
  };
}

function mapObjectType(type: string): 'Galaxy' | 'Nebula' | 'Cluster' | 'Supernova' | 'Quasar' {
  const t = (type || '').toLowerCase();
  if (t.includes('galaxy') || t.includes('gal')) return 'Galaxy';
  if (t.includes('nebula') || t.includes('neb')) return 'Nebula';
  if (t.includes('cluster') || t.includes('clu')) return 'Cluster';
  if (t.includes('supernova')) return 'Supernova';
  if (t.includes('quasar')) return 'Quasar';
  return 'Nebula';
}

function parseRaToDeg(ra: string): number {
  if (!ra || !ra.includes(':')) {
    // Assume already in degrees or object ID
    return parseFloat(ra) || 0;
  }
  const parts = ra.split(':').map(Number);
  return (parts[0] || 0) * 15 + (parts[1] || 0) * 0.25 + (parts[2] || 0) / 240;
}

function parseDecToDeg(dec: string): number {
  if (!dec || !dec.includes(':')) return parseFloat(dec) || 0;
  const sign = dec.startsWith('-') ? -1 : 1;
  const parts = dec.replace(/[+-]/, '').split(':').map(Number);
  return sign * ((parts[0] || 0) + (parts[1] || 0) / 60 + (parts[2] || 0) / 3600);
}
