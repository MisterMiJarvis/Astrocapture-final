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

function authHeaders(): Record<string, string> {
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
function mapApiTarget(t: any): TelescopiusTarget {
  return {
    id: t.id || t.main_id || '',
    mainId: t.main_id || t.id || '',
    mainName: t.name || t.main_name || t.main_id || '',
    type: t.type || 'Unknown',
    constellation: t.constellation || '',
    ra: t.ra || '',
    dec: t.dec || '',
    raDeg: t.ra_deg || parseRaToDeg(t.ra || ''),
    decDeg: t.dec_deg || parseDecToDeg(t.dec || ''),
    magnitude: t.magnitude ?? t.visual_mag ?? null,
    surfaceBrightness: t.surface_brightness ?? t.subr ?? null,
    sizeArcmin: t.size_arcmin ?? t.size?.width ?? null,
    altitudeMax: t.altitude_max ?? t.alt_max ?? null,
    altitudeCurrent: t.altitude_current ?? null,
    moonSeparation: t.moon_separation ?? null,
    imageUrl: t.image_url || t.image || null,
    commonNames: t.commonNames || t.common_names || [],
  };
}

function parseRaToDeg(ra: string): number {
  if (!ra || !ra.includes(':')) return parseFloat(ra) || 0;
  const parts = ra.split(':').map(Number);
  return (parts[0] || 0) * 15 + (parts[1] || 0) * 0.25 + (parts[2] || 0) / 240;
}

function parseDecToDeg(dec: string): number {
  if (!dec || !dec.includes(':')) return parseFloat(dec) || 0;
  const sign = dec.startsWith('-') ? -1 : 1;
  const parts = dec.replace(/[+-]/, '').split(':').map(Number);
  return sign * ((parts[0] || 0) + (parts[1] || 0) / 60 + (parts[2] || 0) / 3600);
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