// ============================================================================
// SERVICE CIBLES — Module 1 Dashboard
// Nova Rank, Telescopius suggestions, calculs astronomiques
// ============================================================================

import { AstroTarget, NovaScoreDetails, TelescopiusSuggestion, TargetsTonightQuery } from '../../types/module1';

const TELESCOPIUS_BASE = 'https://api.telescopius.com';

/**
 * Calcule la séparation angulaire Lune-cible par trigonométrie sphérique
 * Correction terrain Point #5
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

  // Formule de Haversine
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

  // Temps sidéral approximatif
  const jd = date.getTime() / 86400000 + 2440587.5;
  const T = (jd - 2451545.0) / 36525;
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
 * Calcule le temps avant le transit (en heures, positif si avant)
 */
export function calculateTimeToTransit(
  raDeg: number,
  lon: number,
  date: Date
): number {
  const jd = date.getTime() / 86400000 + 2440587.5;
  const T = (jd - 2451545.0) / 36525;
  const lst = 280.46061837 + 360.98564736629 * (jd - 2451545.0) + lon;

  let ha = lst - raDeg;
  while (ha > 180) ha -= 360;
  while (ha < -180) ha += 360;

  return -ha / 15; // heures (15°/h)
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
  // Altitude score (100 à 90°, 0 à horizon)
  const altitude = target.altitudeCurrent ?? calculateAltitude(target.raDeg, target.decDeg, lat, lon, date);
  const altitudeScore = Math.max(0, Math.min(100, altitude * (100 / 90)));

  // Time to transit (100 si dans 2h, 0 si >6h ou passé)
  const timeToTransit = calculateTimeToTransit(target.raDeg, lon, date);
  let timeToTransitScore = 0;
  if (timeToTransit >= 0 && timeToTransit <= 2) {
    timeToTransitScore = 100 - (timeToTransit * 50);
  } else if (timeToTransit > 2 && timeToTransit <= 6) {
    timeToTransitScore = 50 - ((timeToTransit - 2) * 12.5);
  }
  timeToTransitScore = Math.max(0, Math.min(100, timeToTransitScore));

  // Moon score (100 si loin et nouvelle, 0 si proche pleine)
  const moonSep = target.moonSeparation ??
    calculateMoonSeparation(target.raDeg, target.decDeg, moonRaDeg, moonDecDeg);
  let moonScore = 100;
  if (moonPhase > 0.75) moonScore -= 40;
  else if (moonPhase > 0.5) moonScore -= 25;
  else if (moonPhase > 0.25) moonScore -= 10;

  if (moonSep < 30) moonScore -= 30;
  else if (moonSep < 60) moonScore -= 15;

  moonScore = Math.max(0, Math.min(100, moonScore));

  // Filter score (100 si filtre recommandé dispo)
  const hasRecommendedFilter = target.recommendedFilters.some(f => availableFilters.includes(f));
  const filterScore = hasRecommendedFilter ? 100 : 30;

  // Visibility score
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
 * Récupère les suggestions Telescopius
 */
export async function fetchTelescopiusSuggestions(
  lat: number,
  lon: number,
  apiKey: string
): Promise<TelescopiusSuggestion[]> {
  const params = new URLSearchParams({
    latitude: lat.toString(),
    longitude: lon.toString(),
    date: new Date().toISOString().split('T')[0],
  });

  const response = await fetch(`${TELESCOPIUS_BASE}/search?${params.toString()}`, {
    headers: { 'Authorization': `Bearer ${apiKey}` },
  });

  if (!response.ok) {
    throw new Error(`Telescopius error: ${response.status}`);
  }

  const data = await response.json();

  return (data.targets || []).map((t: any) => ({
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
    badges: [
      t.type,
      `Mag ${t.magnitude || '?'}`,
      t.size_arcmin ? `${Math.round(t.size_arcmin)}'` : '',
    ].filter(Boolean),
  }));
}

/**
 * Récupère les cibles de la nuit avec Nova Rank
 */
export async function fetchTargetsTonight(
  query: TargetsTonightQuery,
  availableFilters: string[],
  moonData: { phase: number; altitude: number; raDeg: number; decDeg: number }
): Promise<AstroTarget[]> {
  const { lat, lon, minAltitude = 20, maxMoonSeparation = 60, limit = 20 } = query;

  // TODO: remplacer par vrai appel API Telescopius
  const mockTargets: AstroTarget[] = generateMockTargets(lat, lon);

  const now = new Date();
  const ranked = mockTargets.map(t => {
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

// Mock data pour développement
function generateMockTargets(lat: number, lon: number): AstroTarget[] {
  const targets: AstroTarget[] = [
    {
      id: 'm31', name: 'Andromeda Galaxy', catalogName: 'M31',
      ra: '00:42:44', dec: '+41:16:09', raDeg: 10.68, decDeg: 41.27,
      type: 'Galaxy', subtype: 'Spiral', magnitude: 3.4, sizeArcmin: 178,
      difficulty: 'Beginner', recommendedFilters: ['UV_IR_Cut', 'L_Ultimate'],
      isVisible: true, isAboveHorizon: true, isInImagingWindow: true,
      novaRank: 0, scoreDetails: { altitudeScore: 0, timeToTransitScore: 0, moonScore: 0, filterScore: 0, visibilityScore: 0 },
    },
    {
      id: 'm42', name: 'Orion Nebula', catalogName: 'M42',
      ra: '05:35:17', dec: '-05:23:28', raDeg: 83.82, decDeg: -5.39,
      type: 'Nebula', subtype: 'Emission', magnitude: 4.0, sizeArcmin: 85,
      difficulty: 'Beginner', recommendedFilters: ['Ha', 'OIII', 'L_Ultimate'],
      isVisible: true, isAboveHorizon: true, isInImagingWindow: false,
      novaRank: 0, scoreDetails: { altitudeScore: 0, timeToTransitScore: 0, moonScore: 0, filterScore: 0, visibilityScore: 0 },
    },
    {
      id: 'ngc7000', name: 'North America Nebula', catalogName: 'NGC 7000',
      ra: '20:59:17', dec: '+44:31:44', raDeg: 314.75, decDeg: 44.53,
      type: 'Nebula', subtype: 'Emission', magnitude: 4.0, sizeArcmin: 120,
      difficulty: 'Intermediate', recommendedFilters: ['Ha', 'OIII', 'SII'],
      isVisible: false, isAboveHorizon: false, isInImagingWindow: false,
      novaRank: 0, scoreDetails: { altitudeScore: 0, timeToTransitScore: 0, moonScore: 0, filterScore: 0, visibilityScore: 0 },
    },
  ];

  const now = new Date();
  return targets.map(t => ({
    ...t,
    altitudeCurrent: calculateAltitude(t.raDeg, t.decDeg, lat, lon, now),
  }));
}
