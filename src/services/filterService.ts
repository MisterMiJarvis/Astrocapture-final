// ============================================================================
// FILTER SERVICE — CRUD for Astro Filters (API-first with localStorage fallback)
// ============================================================================

import { AstroFilter, FilterCategory } from '../types/filter';
import { FilterType, FilterProfile } from '../types/module5';

const API_BASE = '/api/apls/filters';
const LOCAL_KEY = 'astrosuite_filters_v5';
const SEEDED_KEY = 'astrosuite_filters_v5_seeded';
const SCHEMA_VERSION = 5;

// Migration: clean up all old localStorage keys
const OLD_KEYS = ['astrosuite_filters', 'astrosuite_filters_v2', 'astrosuite_filters_v2_seeded', 'astrosuite_filters_v3', 'astrosuite_filters_v3_seeded', 'astrosuite_filters_v4', 'astrosuite_filters_v4_seeded'];
for (const oldKey of OLD_KEYS) {
  try { localStorage.removeItem(oldKey); } catch {}
}

// ─── Auth token helper ────────────────────────────────────────────────────

function getAuthToken(): string | null {
  return localStorage.getItem('astrosuite_token');
}

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options?.headers as Record<string, string> || {}),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(error.error || `API error: ${res.status}`);
  }
  return res.json();
}

// ─── Default filters (from module5 FILTER_PROFILES) ──────────────────────

const DEFAULT_FILTERS: AstroFilter[] = [
  {
    id: 'filter_uv_ir_cut',
    name: 'UV/IR Cut',
    brand: 'ZWO',
    category: 'broadband',
    bandwidthNm: 300,
    peakTransmission: 0.97,
    centerWavelengthNm: 560,
    skySuppression: 0.0,
    moonCompatible: false,
    color: '#4FC3F7',
    description: 'ZWO protection filter. Flat ~97% transmission from 420-700nm. Blocks UV (<400nm) and IR (>700nm).',
    useCases: ['Nuits sans Lune', 'Pollution faible', 'Galaxies', 'Amas', 'Luminance'],
    recommendedTargets: ['Galaxies', 'Amas ouverts', 'Amas globulaires', 'Nébuleuses larges'],
    owned: true,
    isDefault: true,
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
  },
  {
    id: 'filter_l_ultimate',
    name: 'L-Ultimate',
    brand: 'Optolong',
    category: 'dualband',
    bandwidthNm: 3,
    peakTransmission: 0.90,
    centerWavelengthNm: 500,
    skySuppression: 0.95,
    moonCompatible: true,
    color: '#7C4DFF',
    description: 'Dual-3nm Hα (656.3nm) + OIII (496/500.7nm) filter. Blocking >OD4 (300-1000nm). Not suitable for fast beams (f<4).',
    useCases: ['Nébuleuses Hα/OIII', 'Sous Lune', 'Pollution urbaine', 'Anti-halos'],
    recommendedTargets: ['Nébuleuses émission', 'Nébuleuses planétaires', 'Rémanents supernovae'],
    owned: true,
    isDefault: true,
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
  },
  {
    id: 'filter_lps_d2',
    name: 'LPS-D2',
    brand: 'IDAS',
    category: 'anti_pollution',
    bandwidthNm: 69,
    peakTransmission: 0.975,
    centerWavelengthNm: 525,
    skySuppression: 0.85,
    moonCompatible: false,
    color: '#FF9800',
    description: 'IDAS light pollution suppression filter. 3 passbands: blue (428nm/28nm, 89%), green (525nm/69nm, 97.5%), red (675nm/51nm, 97.5%). <1% blocking between bands. Passes Hβ, [OIII], galactic continuum, NII, Hα.',
    useCases: ['Pollution urbaine', 'Banlieue', 'Nuits claires', 'Galaxies sous pollution'],
    recommendedTargets: ['Galaxies', 'N\u00e9buleuses', 'Amas', 'Amas ouverts'],
    owned: true,
    isDefault: false,
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
  },
  {
    id: 'filter_ha',
    name: 'Hα 7nm',
    brand: 'ZWO',
    category: 'narrowband',
    bandwidthNm: 7,
    peakTransmission: 0.90,
    centerWavelengthNm: 656.3,
    skySuppression: 0.95,
    moonCompatible: true,
    color: '#F44336',
    description: 'Narrowband Hydrogen-alpha filter.',
    useCases: ['Nébuleuses Hα', 'Sous Lune', 'Bi-color', 'Tri-color'],
    recommendedTargets: ['Nébuleuses émission', 'Rémanents supernovae'],
    owned: false,
    isDefault: true,
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
  },
  {
    id: 'filter_oiii',
    name: 'OIII 7nm',
    brand: 'ZWO',
    category: 'narrowband',
    bandwidthNm: 7,
    peakTransmission: 0.90,
    centerWavelengthNm: 500.7,
    skySuppression: 0.95,
    moonCompatible: true,
    color: '#00BCD4',
    description: 'Narrowband Oxygen-III filter.',
    useCases: ['Nébuleuses OIII', 'Sous Lune', 'Bi-color', 'Tri-color'],
    recommendedTargets: ['Nébuleuses planétaires', 'Rémanents supernovae'],
    owned: false,
    isDefault: true,
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
  },
  {
    id: 'filter_sii',
    name: 'SII 7nm',
    brand: 'ZWO',
    category: 'narrowband',
    bandwidthNm: 7,
    peakTransmission: 0.85,
    centerWavelengthNm: 672.4,
    skySuppression: 0.95,
    moonCompatible: true,
    color: '#9C27B0',
    description: 'Narrowband Sulfur-II filter.',
    useCases: ['Nébuleuses SII', 'Sous Lune', 'Tri-color SHO'],
    recommendedTargets: ['Nébuleuses émission', 'Rémanents supernovae'],
    owned: false,
    isDefault: true,
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
  },
  {
    id: 'filter_rgb',
    name: 'RGB',
    brand: 'Generic',
    category: 'broadband',
    bandwidthNm: 350,
    peakTransmission: 0.95,
    centerWavelengthNm: 550,
    skySuppression: 0.0,
    moonCompatible: false,
    color: '#4CAF50',
    description: 'RGB color filter set for monochrome camera.',
    useCases: ['Galaxies', 'Nébuleuses en couleur', 'Amas'],
    recommendedTargets: ['Galaxies', 'Amas', 'Nébuleuses larges'],
    owned: false,
    isDefault: false,
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
  },
  {
    id: 'filter_luminance',
    name: 'Luminance',
    brand: 'Generic',
    category: 'broadband',
    bandwidthNm: 400,
    peakTransmission: 0.95,
    centerWavelengthNm: 550,
    skySuppression: 0.0,
    moonCompatible: false,
    color: '#E0E0E0',
    description: 'Broadband luminance filter for LRGB imaging.',
    useCases: ['Luminance LRGB', 'Nuits sans Lune'],
    recommendedTargets: ['Galaxies', 'Amas', 'Nébuleuses larges'],
    owned: false,
    isDefault: false,
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
  },
];

// ─── Generate ID ──────────────────────────────────────────────────────────

function generateId(): string {
  return `filter_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

// ─── CRUD Operations (API-first, localStorage fallback) ──────────────────

export async function fetchFilters(): Promise<AstroFilter[]> {
  try {
    const data = await apiFetch<AstroFilter[]>('');
    if (Array.isArray(data) && data.length > 0) return data;
    // If API returns empty, seed defaults then return them
    if (Array.isArray(data) && data.length === 0) {
      // No server data yet — try localStorage, will sync on login
    }
    throw new Error('Empty response');
  } catch {
    return getLocalFilters();
  }
}

export async function createFilter(filter: Omit<AstroFilter, 'id' | 'createdAt' | 'updatedAt'>): Promise<AstroFilter> {
  const newFilter: AstroFilter = {
    ...filter,
    id: generateId(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  try {
    return await apiFetch<AstroFilter>('', {
      method: 'POST',
      body: JSON.stringify(newFilter),
    });
  } catch {
    return saveLocalFilter(newFilter);
  }
}

export async function updateFilter(id: string, updates: Partial<AstroFilter>): Promise<AstroFilter> {
  try {
    return await apiFetch<AstroFilter>(`/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  } catch {
    return updateLocalFilter(id, updates);
  }
}

export async function deleteFilter(id: string): Promise<void> {
  try {
    const res = await fetch(`${API_BASE}/${id}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        ...(getAuthToken() ? { Authorization: `Bearer ${getAuthToken()}` } : {}),
      },
    });
    if (!res.ok) {
      throw new Error(`Delete failed: ${res.status}`);
    }
  } catch {
    deleteLocalFilter(id);
  }
}

// ─── Sync: push localStorage → server, return merged ─────────────────────

export async function syncFiltersToServer(): Promise<AstroFilter[]> {
  const localFilters = getLocalFilters();
  try {
    const result = await apiFetch<{ filters: AstroFilter[] }>('/../sync', {
      method: 'POST',
      body: JSON.stringify({ filters: localFilters }),
    });
    // Replace localStorage with server result
    if (result.filters && result.filters.length > 0) {
      saveLocalFilters(result.filters);
    }
    return result.filters || [];
  } catch (err) {
    console.error('Filter sync failed:', err);
    return localFilters;
  }
}

// ─── Bandwidth-based exposure factor ──────────────────────────────────────

/**
 * Calculate exposure factor based on filter bandwidth.
 * Reference: broadband (350nm) = factor 1.0
 * Factor = 350 / bandwidthNm * peakTransmission
 */
export function getFilterExposureFactor(filter: AstroFilter): number {
  const referenceBandwidth = 350;
  const rawFactor = referenceBandwidth / filter.bandwidthNm / filter.peakTransmission;
  
  if (filter.category === 'dualband') {
    return rawFactor / 2;
  }
  
  return rawFactor;
}

/**
 * Calculate sky suppression benefit for moon conditions.
 */
export function getMoonBenefitFactor(filter: AstroFilter, moonIllumination: number): number {
  if (!filter.moonCompatible || filter.skySuppression === 0) return 1.0 + moonIllumination * 1.5;
  const moonPenalty = moonIllumination * 1.5 * (1 - filter.skySuppression);
  return 1.0 + moonPenalty;
}

/**
 * Get filter by ID (from default + user filters)
 */
export async function getFilterById(id: string): Promise<AstroFilter | null> {
  const filters = await fetchFilters();
  return filters.find(f => f.id === id) || null;
}

/**
 * Get default filters (owned + isDefault)
 */
export async function getDefaultFilters(): Promise<AstroFilter[]> {
  const filters = await fetchFilters();
  return filters.filter(f => f.owned && f.isDefault);
}

// ─── LocalStorage fallback ────────────────────────────────────────────────

function getLocalFilters(): AstroFilter[] {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    if (raw) {
      const filters = JSON.parse(raw) as AstroFilter[];
      // Check if stored filters match current schema
      const storedUltimate = filters.find(f => f.id === 'filter_l_ultimate');
      const defaultUltimate = DEFAULT_FILTERS.find(f => f.id === 'filter_l_ultimate');
      if (storedUltimate && defaultUltimate && storedUltimate.bandwidthNm !== defaultUltimate.bandwidthNm) {
        const userIds = new Set(filters.filter(f => !f.isDefault).map(f => f.id));
        const merged = [...DEFAULT_FILTERS, ...filters.filter(f => userIds.has(f.id))];
        saveLocalFilters(merged);
        return merged;
      }
      return filters;
    }
  } catch {}
  const alreadySeeded = localStorage.getItem(SEEDED_KEY);
  if (!alreadySeeded) {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(DEFAULT_FILTERS));
    localStorage.setItem(SEEDED_KEY, 'true');
    return DEFAULT_FILTERS;
  }
  return [];
}

function saveLocalFilters(filters: AstroFilter[]): void {
  localStorage.setItem(LOCAL_KEY, JSON.stringify(filters));
}

function saveLocalFilter(filter: AstroFilter): AstroFilter {
  const filters = getLocalFilters();
  filters.push(filter);
  saveLocalFilters(filters);
  return filter;
}

function updateLocalFilter(id: string, updates: Partial<AstroFilter>): AstroFilter {
  const filters = getLocalFilters();
  const idx = filters.findIndex(f => f.id === id);
  if (idx === -1) throw new Error('Filter not found');
  filters[idx] = { ...filters[idx], ...updates, updatedAt: new Date().toISOString() };
  saveLocalFilters(filters);
  return filters[idx];
}

function deleteLocalFilter(id: string): void {
  const filters = getLocalFilters().filter(f => f.id !== id);
  saveLocalFilters(filters);
}