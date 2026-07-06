// ============================================================================
// SERVICE : Target Explorer — Telescopius API with full filters
// AstroSuite — Deep-sky target search with visibility & equipment matching
// ============================================================================

export interface TargetSearchFilters {
  // Location & time
  lat?: number;
  lon?: number;
  timezone?: string;
  datetime?: string;

  // Object type
  types?: string; // 'galaxy', 'nebula', 'cluster', 'planetary_nebula', 'supernova_remnant'

  // Name search
  name?: string;
  nameExact?: boolean;
  constellation?: string;
  catalog?: string;

  // Magnitude
  magMin?: number;
  magMax?: number;
  magUnknown?: boolean;

  // Angular size (arcmin)
  sizeMin?: number;
  sizeMax?: number;
  sizeUnknown?: boolean;

  // Surface brightness
  subrMin?: number;
  subrMax?: number;
  subrUnknown?: boolean;

  // Visibility
  minAlt?: number;
  minAltMinutes?: number;
  moonDistMin?: number;
  moonDistMax?: number;

  // Sky position
  raMin?: number;
  raMax?: number;
  decMin?: number;
  decMax?: number;
  centerRa?: number;
  centerDec?: number;
  distMin?: number;
  distMax?: number;

  // Sorting & pagination
  order?: string;
  orderAsc?: boolean;
  resultsPerPage?: number;
  page?: number;
}

export interface ImagingWindow {
  start: string;
  end: string;
  hours: number;
  moonIllumination: number | null;
  moonDistance: number | null;
}

export interface TelescopiusTarget {
  id: string;
  mainId: string;
  mainName: string;
  type: string;
  constellation: string;
  ra: string;
  dec: string;
  raDeg: number;
  decDeg: number;
  magnitude: number | null;
  surfaceBrightness: number | null;
  sizeArcmin: number | null;
  altitudeMax: number | null;
  altitudeCurrent: number | null;
  moonSeparation: number | null;
  imageUrl: string | null;
  commonNames: string[];
  // Imaging windows
  rise: string | null;
  transitTime: string | null;
  setTime: string | null;
  imagingWindows: ImagingWindow[];
  totalImagingHours: number;
  isPriority?: boolean;
}

/**
 * Load priority targets from public config file.
 * Returns a Set of uppercase IDs for fast matching.
 */
export async function loadPriorityTargets(): Promise<Set<string>> {
  try {
    const res = await fetch('/priority-targets.json');
    if (!res.ok) return new Set();
    const data = await res.json();
    const ids: string[] = (data.targets || []).map((s: string) => s.toUpperCase().trim().replace(/\s+/g, ' '));
    return new Set(ids);
  } catch {
    return new Set();
  }
}

export interface TargetSearchResult {
  targets: TelescopiusTarget[];
  total: number;
  page: number;
  perPage: number;
  source: 'telescopius' | 'local_fallback';
}

export const OBJECT_TYPES = [
  { value: '', label: 'All types', apiCode: '' },
  { value: 'gxy', label: 'Galaxy', apiCode: 'gxy' },
  { value: 'neb', label: 'Nebula (Emission/Reflection)', apiCode: 'neb' },
  { value: 'opcl', label: 'Open Cluster', apiCode: 'opcl' },
  { value: 'plnb', label: 'Planetary Nebula', apiCode: 'plnb' },
  { value: 'snrm', label: 'Supernova Remnant', apiCode: 'snrm' },
  { value: 'gxycl', label: 'Galaxy Cluster', apiCode: 'gxycl' },
  { value: 'stcl', label: 'Star Cluster', apiCode: 'stcl' },
];

// ─────────────────────────────────────────────────────────────────────────────
// Filter recommendation engine based on DSO types
// ─────────────────────────────────────────────────────────────────────────────
import { FilterType } from '../types/module5';

/** Map Telescopius type codes to recommended filter sets */
const TYPE_FILTER_MAP: Record<string, FilterType[]> = {
  // Emission nebulae
  eneb: ['Ha', 'OIII', 'SII', 'UV_IR_Cut'],
  rneb: ['Ha', 'OIII', 'SII', 'UV_IR_Cut'],
  dineb: ['Ha', 'OIII', 'SII', 'UV_IR_Cut'],
  h2r: ['Ha', 'OIII', 'SII'],
  neb: ['Ha', 'OIII', 'SII', 'UV_IR_Cut'],
  // Planetary nebulae
  plnb: ['OIII', 'Ha', 'UV_IR_Cut'],
  // Supernova remnants
  snrm: ['Ha', 'OIII', 'SII'],
  // Galaxies
  gxy: ['L_Ultimate', 'UV_IR_Cut', 'RGB'],
  lgx: ['L_Ultimate', 'UV_IR_Cut', 'RGB'],
  sgx: ['L_Ultimate', 'UV_IR_Cut'],
  sfgx: ['Ha', 'L_Ultimate'],
  pogx: ['L_Ultimate', 'UV_IR_Cut'],
  agn: ['L_Ultimate', 'UV_IR_Cut'],
  // Clusters
  opcl: ['UV_IR_Cut', 'RGB', 'Luminance'],
  stcl: ['UV_IR_Cut', 'RGB'],
  gxycl: ['L_Ultimate', 'RGB'],
  // Reflection nebulae
  rneb_ref: ['RGB', 'L_Ultimate'],
  // Dark nebulae
  dneb: ['L_Ultimate', 'RGB'],
};

const GENERIC_TYPES = new Set(['deep_sky_object', 'solar_system_object', 'str', 'uvsrc', 'irsrc', 'nirsrc', 'mirsrc', 'varst', 'xrsrc', 'radsrc', 'gamsrc', 'best', 'dms', 'stass', 'ism', 'mst', 'pulvar', 'bsg', 'esg']);

/**
 * Recommend filters based on a list of Telescopius type codes
 * Returns ordered filter recommendations (most specific first)
 */
export function recommendFiltersForTypes(types: string[]): FilterType[] {
  const filterSet = new Set<FilterType>();
  const order: FilterType[] = [];

  for (const type of types) {
    if (GENERIC_TYPES.has(type)) continue;
    const filters = TYPE_FILTER_MAP[type];
    if (filters) {
      for (const f of filters) {
        if (!filterSet.has(f)) {
          filterSet.add(f);
          order.push(f);
        }
      }
    }
  }

  // If no specific match, default to broadband
  if (order.length === 0) {
    return ['UV_IR_Cut', 'L_Ultimate', 'RGB'];
  }
  return order;
}

/**
 * Calculate filter compatibility score for a target given available filters
 * 0-100: how well the available filters match the recommended ones
 */
export function calculateFilterScore(recommendedFilters: FilterType[], availableFilters: FilterType[]): number {
  if (recommendedFilters.length === 0) return 50; // unknown
  const matchCount = recommendedFilters.filter(f => availableFilters.includes(f)).length;
  // Best filter match is most important
  if (availableFilters.includes(recommendedFilters[0])) return 100;
  if (matchCount === 0) return 20; // no recommended filters at all
  return Math.round(30 + (matchCount / recommendedFilters.length) * 70);
}

// ─────────────────────────────────────────────────────────────────────────────
// Best Targets Tonight — Telescopius highlights endpoint
// ─────────────────────────────────────────────────────────────────────────────

export interface BestTargetFilters {
  lat: number;
  lon: number;
  timezone?: string;
  minAlt?: number;
  magMax?: number;
  subrMax?: number;
  sizeMin?: number;
  sizeMax?: number;
  moonIllumMax?: number;
  moonDistMin?: number;
  minImagingHours?: number;
  types?: string;
  page?: number;
  perPage?: number;
}

export async function fetchBestTargets(filters: BestTargetFilters): Promise<TargetSearchResult> {
  const params = new URLSearchParams();

  params.set('lat', filters.lat.toString());
  params.set('lon', filters.lon.toString());
  params.set('timezone', filters.timezone || 'Europe/Paris');
  if (filters.minAlt) params.set('min_alt', filters.minAlt.toString());
  if (filters.magMax) params.set('mag_max', filters.magMax.toString());
  if (filters.subrMax) params.set('subr_max', filters.subrMax.toString());
  if (filters.sizeMin) params.set('size_min', filters.sizeMin.toString());
  if (filters.sizeMax) params.set('size_max', filters.sizeMax.toString());
  if (filters.types) params.set('types', filters.types);
  params.set('results_per_page', (filters.perPage || 30).toString());
  if (filters.page) params.set('page', filters.page.toString());

  try {
    const response = await fetch(`${API_PROXY}?${params.toString()}`, { headers: authHeaders() });
    if (!response.ok) throw new Error(`Best targets failed: ${response.status}`);
    const data = await response.json();

    const targets: TelescopiusTarget[] = (data.targets || []).map(mapApiTarget);

    // Post-filter: imaging hours, moon illumination, moon distance
    const filtered = targets.filter(t => {
      const imgHours = t.totalImagingHours || 0;
      if (filters.minImagingHours && imgHours < filters.minImagingHours) return false;
      if (filters.moonDistMin) {
        const moonDist = t.imagingWindows?.reduce((min, w) => Math.min(min, w.moonDistance ?? 999), 999) ?? 999;
        if (moonDist < filters.moonDistMin) return false;
      }
      if (filters.moonIllumMax) {
        const moonIllum = t.imagingWindows?.reduce((max, w) => Math.max(max, w.moonIllumination ?? 0), 0) ?? 0;
        if (moonIllum > filters.moonIllumMax) return false;
      }
      return true;
    });

    return {
      targets: filtered,
      total: data.total || filtered.length,
      page: data.page || 1,
      perPage: filters.perPage || 30,
      source: data.source || 'telescopius',
    };
  } catch (err) {
    console.error('Best targets fetch failed:', err);
    return { targets: [], total: 0, page: 1, perPage: 30, source: 'local_fallback' };
  }
}

export const CONSTELLATIONS = [
  '', 'And', 'Aql', 'Aqr', 'Ara', 'Ari', 'Aur', 'Boo', 'Cae', 'Cam', 'Cap', 'Car', 'Cas',
  'Cen', 'Cep', 'Cet', 'CMa', 'CMi', 'Cnc', 'Com', 'CrA', 'CrB', 'Crt', 'Cru', 'Crv',
  'Cyg', 'Del', 'Dra', 'Equ', 'Eri', 'For', 'Gem', 'Gru', 'Her', 'Hor', 'Hya', 'Hyi',
  'Ind', 'Lac', 'Leo', 'Lep', 'Lib', 'Lmi', 'Lup', 'Lyn', 'Lyr', 'Mon', 'Mus', 'Nor',
  'Oct', 'Oph', 'Ori', 'Pav', 'Peg', 'Per', 'Phe', 'Pic', 'PsA', 'Psc', 'Pup', 'Pyx',
  'Ret', 'Scl', 'Sco', 'Sct', 'Ser', 'Sex', 'Sge', 'Sgr', 'Tau', 'Tel', 'Tri', 'Tuc',
  'UMa', 'UMi', 'Vel', 'Vir', 'Vol', 'Vul',
];

const API_PROXY = '/api/telescopius/search';

function getToken(): string | null {
  return localStorage.getItem('astrosuite_token');
}

export function authHeaders(): Record<string, string> {
  const token = getToken();
  const h: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) h['Authorization'] = `Bearer ${token}`;
  return h;
}

/**
 * Search targets via backend Telescopius proxy with full filter support
 */
export async function searchTargets(filters: TargetSearchFilters): Promise<TargetSearchResult> {
  const params = new URLSearchParams();

  // Location
  if (filters.lat != null) params.set('lat', filters.lat.toString());
  if (filters.lon != null) params.set('lon', filters.lon.toString());
  if (filters.timezone) params.set('timezone', filters.timezone);
  if (filters.datetime) params.set('datetime', filters.datetime);

  // Object type & name
  if (filters.types) params.set('types', filters.types);
  if (filters.name) params.set('name', filters.name);
  if (filters.nameExact) params.set('name_exact', 'true');
  if (filters.constellation) params.set('con', filters.constellation);
  if (filters.catalog) params.set('cat', filters.catalog);

  // Magnitude
  if (filters.magMin != null) params.set('mag_min', filters.magMin.toString());
  if (filters.magMax != null) params.set('mag_max', filters.magMax.toString());
  if (filters.magUnknown) params.set('mag_unknown', 'true');

  // Size
  if (filters.sizeMin != null) params.set('size_min', filters.sizeMin.toString());
  if (filters.sizeMax != null) params.set('size_max', filters.sizeMax.toString());
  if (filters.sizeUnknown) params.set('size_unknown', 'true');

  // Surface brightness
  if (filters.subrMin != null) params.set('subr_min', filters.subrMin.toString());
  if (filters.subrMax != null) params.set('subr_max', filters.subrMax.toString());
  if (filters.subrUnknown) params.set('subr_unknown', 'true');

  // Visibility
  if (filters.minAlt != null) params.set('min_alt', filters.minAlt.toString());
  if (filters.minAltMinutes != null) params.set('min_alt_minutes', filters.minAltMinutes.toString());
  if (filters.moonDistMin != null) params.set('moon_dist_min', filters.moonDistMin.toString());
  if (filters.moonDistMax != null) params.set('moon_dist_max', filters.moonDistMax.toString());

  // Sky position
  if (filters.raMin != null) params.set('ra_min', filters.raMin.toString());
  if (filters.raMax != null) params.set('ra_max', filters.raMax.toString());
  if (filters.decMin != null) params.set('dec_min', filters.decMin.toString());
  if (filters.decMax != null) params.set('dec_max', filters.decMax.toString());

  // Sort & pagination
  if (filters.order) params.set('order', filters.order);
  if (filters.orderAsc) params.set('order_asc', 'true');
  if (filters.resultsPerPage) params.set('results_per_page', filters.resultsPerPage.toString());
  if (filters.page) params.set('page', filters.page.toString());

  try {
    const response = await fetch(`${API_PROXY}?${params.toString()}`, {
      headers: authHeaders(),
    });

    if (!response.ok) throw new Error(`Search failed: ${response.status}`);
    const data = await response.json();

    // Map API response to our format
    const targets: TelescopiusTarget[] = (data.targets || []).map(mapApiTarget);
    return {
      targets,
      total: data.total || targets.length,
      page: data.page || 1,
      perPage: data.perPage || 20,
      source: data.source || 'telescopius',
    };
  } catch (err) {
    console.error('Target search failed:', err);
    return { targets: [], total: 0, page: 1, perPage: 20, source: 'local_fallback' };
  }
}

/**
 * Map API response target to our TelescopiusTarget format
 */
export function mapApiTarget(t: any): TelescopiusTarget {
  return {
    id: t.id || t.main_id || '',
    mainId: t.main_id || t.id || '',
    mainName: t.name || t.main_name || t.main_id || '',
    type: t.type || 'Unknown',
    constellation: t.constellation || '',
    ra: t.ra || '',
    dec: t.dec || '',
    raDeg: parseRaToDeg(t.ra_deg || t.ra || 0),
    decDeg: parseDecToDeg(t.dec_deg || t.dec || 0),
    magnitude: t.magnitude ?? t.visual_mag ?? null,
    surfaceBrightness: t.surface_brightness ?? t.subr ?? null,
    sizeArcmin: t.size_arcmin ?? t.size?.width ?? null,
    altitudeMax: t.altitude_max ?? t.alt_max ?? null,
    altitudeCurrent: t.altitude_current ?? null,
    moonSeparation: t.moon_separation ?? null,
    imageUrl: t.image_url || t.image || null,
    commonNames: t.commonNames || t.common_names || [],
    // Imaging windows
    rise: t.rise || null,
    transitTime: t.transit_time || null,
    setTime: t.set_time || null,
    imagingWindows: (t.imaging_windows || []).map((w: any) => ({
      start: w.start,
      end: w.end,
      hours: w.hours || 0,
      moonIllumination: w.moon_illumination ?? null,
      moonDistance: w.moon_distance ?? null,
    })),
    totalImagingHours: t.total_imaging_hours || 0,
  };
}

function parseRaToDeg(ra: string | number): number {
  // Telescopius API returns RA in hours (J2000), not degrees!
  // Must multiply by 15 to convert hours → degrees.
  if (typeof ra === 'number') return ra * 15; // hours → degrees
  if (!ra) return 0;
  if (!ra.includes(':')) return parseFloat(ra) * 15 || 0; // hours → degrees
  const parts = ra.split(':').map(Number);
  return (parts[0] || 0) * 15 + (parts[1] || 0) * 15 / 60 + (parts[2] || 0) * 15 / 3600;
}

function parseDecToDeg(dec: string | number): number {
  // Telescopius API returns Dec in degrees (negative for south)
  if (typeof dec === 'number') return dec;
  if (!dec) return 0;
  if (!dec.includes(':')) return parseFloat(dec) || 0;
  const sign = dec.startsWith('-') ? -1 : 1;
  const parts = dec.replace(/[+-]/, '').split(':').map(Number);
  return sign * ((parts[0] || 0) + (parts[1] || 0) / 60 + (parts[2] || 0) / 3600);
}

export interface FramingAnalysis {
  // Rig info
  rigName: string;
  effectiveFocalLength: number;
  fRatio: number;
  pixelScale: number;
  // FOV
  fovWidth: number;  // arcmin
  fovHeight: number; // arcmin
  // Target fit
  targetSizeArcmin: number | null;
  fitStatus: 'perfect' | 'good' | 'tight' | 'too_large' | 'unknown';
  fitDescription: string;
  // Coverage ratio (how much of the FOV the target fills)
  coveragePercent: number | null;
  // Imaging plan
  totalImagingHours: number;
  imagingWindows: ImagingWindow[];
  // Recommended exposures
  subExposure: number; // seconds per sub
  totalExposures: number;
  totalIntegrationHours: number;
  snrEstimate: string;
}

export interface RigInfo {
  name: string;
  focalLength: number;
  aperture: number;
  fRatio: number;
  sensorWidth: number;  // mm
  sensorHeight: number; // mm
  pixelSize: number;     // microns
}

/**
 * Calculate framing analysis for a target + rig combination
 */
export function calculateFraming(target: TelescopiusTarget, rig: RigInfo): FramingAnalysis {
  const effFL = rig.focalLength; // No modifier for now
  const fRatio = effFL / rig.aperture;
  const pixelScale = (rig.pixelSize * 206.265) / effFL;
  const fovWidth = (rig.sensorWidth * 206.265) / effFL;
  const fovHeight = (rig.sensorHeight * 206.265) / effFL;

  // Target fit analysis
  const targetSize = target.sizeArcmin;
  let fitStatus: FramingAnalysis['fitStatus'] = 'unknown';
  let fitDescription = '';
  let coveragePercent: number | null = null;

  if (targetSize && targetSize > 0) {
    const fovMin = Math.min(fovWidth, fovHeight);
    const fovMax = Math.max(fovWidth, fovHeight);
    coveragePercent = Math.min(100, (targetSize / fovMin) * 100);

    if (targetSize > fovMax) {
      fitStatus = 'too_large';
      fitDescription = `Target (${targetSize.toFixed(0)}') exceeds FOV (${fovMax.toFixed(0)}'×${fovMin.toFixed(0)}'). Mosaic needed.`;
    } else if (targetSize > fovMin * 0.85) {
      fitStatus = 'tight';
      fitDescription = `Tight fit. ${targetSize.toFixed(0)}' in ${fovMax.toFixed(0)}'×${fovMin.toFixed(0)}' FOV. Minimal margin.`;
    } else if (targetSize > fovMin * 0.3) {
      fitStatus = 'good';
      fitDescription = `Good fit. ${targetSize.toFixed(0)}' fills ${coveragePercent.toFixed(0)}% of FOV.`;
    } else {
      fitStatus = 'perfect';
      fitDescription = `Target well within FOV. ${targetSize.toFixed(0)}' in ${fovMax.toFixed(0)}'×${fovMin.toFixed(0)}'. Room for context.`;
    }
  } else {
    fitDescription = 'Target size unknown.';
  }

  // Exposure recommendations based on f-ratio and sky conditions
  // Rule of thumb: sub = fRatio² × exposure_factor
  // For moderate light pollution (Bortle 4-5): factor ≈ 1.5-3s
  // For dark sky (Bortle 2-3): factor ≈ 5-10s
  const exposureFactor = 2.0; // Moderate light pollution default
  const subExposure = Math.ceil(fRatio * fRatio * exposureFactor); // seconds
  
  // Total imaging hours available
  const totalImagingHours = target.totalImagingHours || 0;
  
  // Recommended number of exposures
  // More exposures = better SNR. Target: fill imaging window efficiently
  // Allow 20% overhead per sub (readout + dither settle)
  const overheadRatio = 1.2;
  const subWithOverhead = subExposure * overheadRatio;
  const totalSeconds = totalImagingHours * 3600;
  const totalExposures = totalSeconds > 0 ? Math.floor(totalSeconds / subWithOverhead) : 0;
  const totalIntegrationHours = totalExposures > 0 ? (totalExposures * subExposure / 3600) : 0;
  
  // SNR estimate (rough)
  let snrEstimate = '';
  if (totalExposures >= 100) snrEstimate = 'Excellent';
  else if (totalExposures >= 60) snrEstimate = 'Very Good';
  else if (totalExposures >= 30) snrEstimate = 'Good';
  else if (totalExposures >= 15) snrEstimate = 'Moderate';
  else if (totalExposures > 0) snrEstimate = 'Low';
  else snrEstimate = 'N/A';

  return {
    rigName: rig.name,
    effectiveFocalLength: effFL,
    fRatio: parseFloat(fRatio.toFixed(1)),
    pixelScale: parseFloat(pixelScale.toFixed(2)),
    fovWidth: parseFloat(fovWidth.toFixed(1)),
    fovHeight: parseFloat(fovHeight.toFixed(1)),
    targetSizeArcmin: targetSize,
    fitStatus,
    fitDescription,
    coveragePercent,
    totalImagingHours,
    imagingWindows: target.imagingWindows || [],
    subExposure,
    totalExposures,
    totalIntegrationHours: parseFloat(totalIntegrationHours.toFixed(1)),
    snrEstimate,
  };
}

/**
 * Get default filters for tonight's session
 */
export function getDefaultFilters(lat: number, lon: number): TargetSearchFilters {
  return {
    lat,
    lon,
    timezone: 'Europe/Paris',
    datetime: new Date().toISOString().split('T')[0],
    minAlt: 30,
    minAltMinutes: 120,
    moonDistMin: 30,
    resultsPerPage: 20,
    page: 1,
  };
}

/**
 * Get default filters for Best Targets tonight
 */
export function getDefaultBestTargetFilters(lat: number, lon: number): BestTargetFilters {
  return {
    lat,
    lon,
    timezone: 'Europe/Paris',
    minAlt: 30,
    magMax: 12,
    subrMax: 22,
    sizeMin: 5,
    moonDistMin: 30,
    minImagingHours: 1,
    perPage: 30,
  };
}