// ============================================================================
// FILTER SERVICE — CRUD for Astro Filters (localStorage + API fallback)
// ============================================================================

import { AstroFilter, FilterCategory } from '../types/filter';
import { FilterType, FilterProfile } from '../types/module5';

const API_BASE = '/api/apls/filters';
const LOCAL_KEY = 'astrosuite_filters_v2';
const SEEDED_KEY = 'astrosuite_filters_v2_seeded';
const OLD_KEY = 'astros…ters'; // old v1 key to migrate

// Migration: clean up old v1 key if present
try { localStorage.removeItem(OLD_KEY); } catch {}

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
    description: 'Filtre de protection ZWO. Transmission plate ~97% de 420-700nm. Bloque UV (<400nm) et IR (>700nm).',
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
    bandwidthNm: 7,
    peakTransmission: 0.85,
    centerWavelengthNm: 500,
    skySuppression: 0.9,
    moonCompatible: true,
    color: '#7C4DFF',
    description: 'Filtre dual-band Hα + OIII. Permet de shooter sous la Lune.',
    useCases: ['Nébuleuses Hα/OIII', 'Sous Lune', 'Pollution urbaine'],
    recommendedTargets: ['Nébuleuses émission', 'Nébuleuses planétaires'],
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
    bandwidthNm: 25,
    peakTransmission: 0.75,
    centerWavelengthNm: 530,
    skySuppression: 0.6,
    moonCompatible: false,
    color: '#FF9800',
    description: 'Filtre anti-pollution lumineuse. Sélectif sur sodium/mercure.',
    useCases: ['Pollution urbaine', 'Banlieue', 'Nuits claires'],
    recommendedTargets: ['Galaxies', 'Nébuleuses', 'Amas'],
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
    description: 'Filtre narrowband Hydrogène-alpha.',
    useCases: ['Nébuleuses Hα', 'Sous Lune', 'Bi-color', 'Tri-color'],
    recommendedTargets: ['Nébuleuses émission', 'Rémanents supernovae'],
    owned: true,
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
    description: 'Filtre narrowband Oxygène-III.',
    useCases: ['Nébuleuses OIII', 'Sous Lune', 'Bi-color', 'Tri-color'],
    recommendedTargets: ['Nébuleuses planétaires', 'Rémanents supernovae'],
    owned: true,
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
    description: 'Filtre narrowband Soufre-II.',
    useCases: ['Nébuleuses SII', 'Sous Lune', 'Tri-color SHO'],
    recommendedTargets: ['Nébuleuses émission', 'Rémanents supernovae'],
    owned: true,
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
    description: 'Filtre couleur RGB pour caméra monocouleur.',
    useCases: ['Galaxies', 'Nébuleuses en couleur', 'Amas'],
    recommendedTargets: ['Galaxies', 'Amas', 'Nébuleuses larges'],
    owned: true,
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
    description: 'Filtre luminance large bande pour LRGB.',
    useCases: ['Luminance LRGB', 'Nuits sans Lune'],
    recommendedTargets: ['Galaxies', 'Amas', 'Nébuleuses larges'],
    owned: true,
    isDefault: false,
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
  },
];

// ─── Generate ID ──────────────────────────────────────────────────────────

function generateId(): string {
  return `filter_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

// ─── CRUD Operations ──────────────────────────────────────────────────────

export async function fetchFilters(): Promise<AstroFilter[]> {
  try {
    const res = await fetch(API_BASE);
    if (!res.ok) throw new Error('API unavailable');
    return await res.json();
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
    const res = await fetch(API_BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newFilter),
    });
    if (!res.ok) throw new Error('API unavailable');
    return await res.json();
  } catch {
    return saveLocalFilter(newFilter);
  }
}

export async function updateFilter(id: string, updates: Partial<AstroFilter>): Promise<AstroFilter> {
  try {
    const res = await fetch(`${API_BASE}/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (!res.ok) throw new Error('API unavailable');
    return await res.json();
  } catch {
    return updateLocalFilter(id, updates);
  }
}

export async function deleteFilter(id: string): Promise<void> {
  try {
    await fetch(`${API_BASE}/${id}`, { method: 'DELETE' });
  } catch {
    deleteLocalFilter(id);
  }
}

// ─── Bandwidth-based exposure factor ──────────────────────────────────────

/**
 * Calculate exposure factor based on filter bandwidth.
 * Narrowband filters need longer exposures because they let through less light.
 * Reference: broadband (350nm) = factor 1.0
 * Factor = 350 / bandwidthNm * peakTransmission
 * 
 * Examples:
 * - UV/IR Cut (350nm, τ=1.0): factor = 1.0
 * - Hα 7nm (τ=0.90): factor = 350/7 * 0.90 = 45x
 * - L-Ultimate (7nm, τ=0.85): factor = 350/7 * 0.85 = 42.5x (but dual-band, so ~21x per band)
 */
export function getFilterExposureFactor(filter: AstroFilter): number {
  const referenceBandwidth = 350; // broadband reference
  const rawFactor = referenceBandwidth / filter.bandwidthNm / filter.peakTransmission;
  
  // Dual-band filters (like L-Ultimate) pass 2 bands, so exposure is roughly halved
  if (filter.category === 'dualband') {
    return rawFactor / 2;
  }
  
  return rawFactor;
}

/**
 * Calculate sky suppression benefit for moon conditions.
 * Returns a multiplier < 1.0 when the filter helps against moon/light pollution.
 */
export function getMoonBenefitFactor(filter: AstroFilter, moonIllumination: number): number {
  if (!filter.moonCompatible || filter.skySuppression === 0) return 1.0 + moonIllumination * 1.5;
  
  // Filter helps: reduce moon penalty based on sky suppression
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
    if (raw) return JSON.parse(raw);
  } catch {}
  // First time only: seed with defaults
  const alreadySeeded = localStorage.getItem(SEEDED_KEY);
  if (!alreadySeeded) {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(DEFAULT_FILTERS));
    localStorage.setItem(SEEDED_KEY, 'true');
    return DEFAULT_FILTERS;
  }
  // Already seeded before — return empty (user may have deleted all)
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