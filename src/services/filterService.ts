// ============================================================================
// FILTER SERVICE — CRUD for Astro Filters (API-only, no localStorage)
// ============================================================================

import { AstroFilter, FilterCategory } from '../types/filter';
import { FilterType, FilterProfile } from '../types/module5';
import { FILTER_SPECTRA, getBroadbandReferenceArea } from '../data/filterSpectra';

const API_BASE = '/api/apls/filters';

// Clean up any leftover localStorage keys from old versions
const OLD_KEYS = [
  'astrosuite_filters', 'astrosuite_filters_v2', 'astrosuite_filters_v2_seeded',
  'astrosuite_filters_v3', 'astrosuite_filters_v3_seeded',
  'astrosuite_filters_v4', 'astrosuite_filters_v4_seeded',
  'astrosuite_filters_v5', 'astrosuite_filters_v5_seeded',
  'astrosuite_filters_v6', 'astrosuite_filters_v6_seeded',
];
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

// ─── Spectral data merge (client-side only, not stored in DB) ─────────────

const SPECTRAL_DATA_MAP: Record<string, { wavelength: number; transmission: number }[]> = {
  filter_uv_ir_cut: FILTER_SPECTRA['filter_uv_ir_cut'],
  filter_l_ultimate: FILTER_SPECTRA['filter_l_ultimate'],
  filter_antlia_triband: FILTER_SPECTRA['filter_antlia_triband'],
};

function mergeSpectralData(filter: AstroFilter): AstroFilter {
  const spectral = SPECTRAL_DATA_MAP[filter.id];
  if (spectral && !filter.transmissionData) {
    return { ...filter, transmissionData: spectral };
  }
  return filter;
}

// ─── Generate ID ──────────────────────────────────────────────────────────

function generateId(): string {
  return `filter_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

// ─── CRUD Operations (API-only) ──────────────────────────────────────────

export async function fetchFilters(): Promise<AstroFilter[]> {
  const data = await apiFetch<AstroFilter[]>('');
  if (!Array.isArray(data)) return [];
  return data.map(mergeSpectralData);
}

export async function createFilter(filter: Omit<AstroFilter, 'id' | 'createdAt' | 'updatedAt'>): Promise<AstroFilter> {
  const newFilter: AstroFilter = {
    ...filter,
    id: generateId(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  return await apiFetch<AstroFilter>('', {
    method: 'POST',
    body: JSON.stringify(newFilter),
  });
}

export async function updateFilter(id: string, updates: Partial<AstroFilter>): Promise<AstroFilter> {
  return await apiFetch<AstroFilter>(`/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(updates),
  });
}

export async function deleteFilter(id: string): Promise<void> {
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
}

// ─── Bandwidth-based exposure factor ──────────────────────────────────────

/**
 * Calculate exposure factor based on filter bandwidth.
 * Uses real spectral transmission data when available (integrated area
 * compared to a broadband UV/IR Cut reference).
 * Fallback: simple bandwidth-ratio formula.
 * Reference: broadband (350nm) = factor 1.0
 */
export function getFilterExposureFactor(filter: AstroFilter): number {
  // If we have real transmission data, use integrated area comparison
  if (filter.id && filter.transmissionData && filter.transmissionData.length >= 2) {
    const filterArea = integrateTransmission(filter.transmissionData);
    const referenceArea = getBroadbandReferenceArea();
    if (filterArea > 0 && referenceArea > 0) {
      return referenceArea / filterArea;
    }
  }

  // Fallback: original bandwidth-ratio formula
  const referenceBandwidth = 350;
  const rawFactor = referenceBandwidth / filter.bandwidthNm / filter.peakTransmission;

  if (filter.category === 'dualband') {
    return rawFactor / 2;
  }

  return rawFactor;
}

/** Trapezoidal integration of transmission data (wavelength nm × transmission %). */
function integrateTransmission(data: { wavelength: number; transmission: number }[]): number {
  if (data.length < 2) return 0;
  let area = 0;
  for (let i = 1; i < data.length; i++) {
    const dw = data[i].wavelength - data[i - 1].wavelength;
    const avgT = (data[i].transmission + data[i - 1].transmission) / 2;
    area += dw * avgT;
  }
  return area;
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
 * Get filter by ID
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