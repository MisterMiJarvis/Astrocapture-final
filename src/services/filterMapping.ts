// ============================================================================
// FILTER MAPPING — Bridge between AstroFilter (CRUD) and FilterType (legacy)
// Maps user-owned AstroFilters to the FilterType enum used by target
// recommendations, exposure calculators, and the TYPE_FILTER_MAP.
// ============================================================================

import { AstroFilter, FilterCategory } from '../types/filter';
import { FilterType } from '../types/module5';
import { fetchFilters } from './filterService';

/**
 * Static mapping from AstroFilter.id (default filters) → FilterType
 * Used as fallback when we can't infer the type from category + specs.
 */
export const FILTER_ID_TO_TYPE: Record<string, FilterType> = {
  filter_uv_ir_cut: 'UV_IR_Cut',
  filter_l_ultimate: 'L_Ultimate',
  filter_lps_d2: 'LPS_D2',
  filter_ha: 'Ha',
  filter_oiii: 'OIII',
  filter_sii: 'SII',
  filter_rgb: 'RGB',
  filter_luminance: 'Luminance',
};

/**
 * Reverse mapping: FilterType → default AstroFilter.id
 */
export const FILTER_TYPE_TO_ID: Record<FilterType, string> = {
  UV_IR_Cut: 'filter_uv_ir_cut',
  L_Ultimate: 'filter_l_ultimate',
  LPS_D2: 'filter_lps_d2',
  Ha: 'filter_ha',
  OIII: 'filter_oiii',
  SII: 'filter_sii',
  RGB: 'filter_rgb',
  Luminance: 'filter_luminance',
};

/**
 * Display labels for FilterType
 */
export const FILTER_TYPE_LABELS: Record<FilterType, string> = {
  UV_IR_Cut: 'UV/IR Cut',
  L_Ultimate: 'L Ultimate',
  LPS_D2: 'LPS-D2',
  Ha: 'Hα',
  OIII: 'OIII',
  SII: 'SII',
  RGB: 'RGB',
  Luminance: 'Luminance',
};

/**
 * Infer FilterType from an AstroFilter's properties.
 * Uses category + center wavelength + bandwidth to determine the type.
 * Falls back to the static ID mapping for known defaults.
 */
export function inferFilterType(filter: AstroFilter): FilterType | null {
  // Check static ID mapping first (default filters)
  if (FILTER_ID_TO_TYPE[filter.id]) {
    return FILTER_ID_TO_TYPE[filter.id];
  }

  // Infer from category + specs
  if (filter.category === 'narrowband') {
    if (filter.centerWavelengthNm >= 650 && filter.centerWavelengthNm <= 660) return 'Ha';
    if (filter.centerWavelengthNm >= 496 && filter.centerWavelengthNm <= 502) return 'OIII';
    if (filter.centerWavelengthNm >= 668 && filter.centerWavelengthNm <= 676) return 'SII';
  }

  if (filter.category === 'dualband') {
    // Dual narrowband (like L-Ultimate, L-eXtreme, etc.)
    return 'L_Ultimate';
  }

  if (filter.category === 'anti_pollution') {
    return 'LPS_D2';
  }

  if (filter.category === 'broadband') {
    if (filter.bandwidthNm > 350) return 'Luminance';
    if (filter.bandwidthNm > 200) return 'RGB';
    return 'UV_IR_Cut';
  }

  return null;
}

/**
 * Get the effective FilterType for an AstroFilter, with fallback.
 */
export function getFilterType(filter: AstroFilter): FilterType {
  return inferFilterType(filter) ?? 'UV_IR_Cut';
}

/**
 * UI color classes per FilterType (for target cards, filter pills, etc.)
 */
export const FILTER_COLORS: Record<FilterType, string> = {
  UV_IR_Cut: 'bg-blue-500/20 text-blue-300',
  L_Ultimate: 'bg-purple-500/20 text-purple-300',
  LPS_D2: 'bg-green-500/20 text-green-300',
  Ha: 'bg-red-500/20 text-red-300',
  OIII: 'bg-cyan-500/20 text-cyan-300',
  SII: 'bg-orange-500/20 text-orange-300',
  RGB: 'bg-pink-500/20 text-pink-300',
  Luminance: 'bg-slate-500/20 text-slate-300',
};

export interface UserFilterInfo {
  filter: AstroFilter;
  filterType: FilterType;
  label: string;
  color: string;
}

/**
 * Load user's owned filters and map them to FilterType.
 * Returns only filters the user actually owns, sorted by category.
 */
export async function getUserOwnedFilters(): Promise<UserFilterInfo[]> {
  const allFilters = await fetchFilters();
  const owned = allFilters.filter(f => f.owned);

  return owned
    .map(filter => {
      const filterType = getFilterType(filter);
      const label = FILTER_TYPE_LABELS[filterType] || filter.name;
      const color = FILTER_COLORS[filterType] || 'bg-slate-500/20 text-slate-300';
      return { filter, filterType, label, color };
    })
    .sort((a, b) => {
      // Sort: narrowband → dualband → anti_pollution → broadband
      const catOrder: Record<FilterCategory, number> = {
        narrowband: 0, dualband: 1, anti_pollution: 2, broadband: 3, special: 4,
      };
      return (catOrder[a.filter.category] ?? 5) - (catOrder[b.filter.category] ?? 5);
    });
}

/**
 * Get FilterType[] for user's owned filters.
 * Used to replace hardcoded ALL_FILTERS in TargetExplorerView.
 */
export async function getOwnedFilterTypes(): Promise<FilterType[]> {
  const userFilters = await getUserOwnedFilters();
  const seen = new Set<FilterType>();
  const result: FilterType[] = [];
  for (const uf of userFilters) {
    if (!seen.has(uf.filterType)) {
      seen.add(uf.filterType);
      result.push(uf.filterType);
    }
  }
  return result;
}

/**
 * Get filter options for dropdowns (ProjectsView, etc.)
 * Returns { value, label }[] from user's owned filters.
 */
export async function getFilterOptions(): Promise<{ value: string; label: string }[]> {
  const userFilters = await getUserOwnedFilters();
  const seen = new Set<string>();
  const result: { value: string; label: string }[] = [];
  for (const uf of userFilters) {
    if (!seen.has(uf.filterType)) {
      seen.add(uf.filterType);
      result.push({ value: uf.filterType, label: uf.label });
    }
  }
  return result;
}

/**
 * Check if a user owns a specific FilterType.
 */
export async function ownsFilterType(filterType: FilterType): Promise<boolean> {
  const owned = await getOwnedFilterTypes();
  return owned.includes(filterType);
}

/**
 * Get the real AstroFilter specs for a given FilterType from user's collection.
 * Returns null if the user doesn't own a filter of this type.
 */
export async function getOwnedFilterByType(filterType: FilterType): Promise<AstroFilter | null> {
  const userFilters = await getUserOwnedFilters();
  const match = userFilters.find(uf => uf.filterType === filterType);
  return match?.filter ?? null;
}

/**
 * Enhanced filter score using real filter specs.
 * Takes into account bandwidth, transmission, and moon compatibility.
 */
export function calculateEnhancedFilterScore(
  recommendedFilters: FilterType[],
  userFilters: UserFilterInfo[],
  moonIllumination: number = 0,
): number {
  if (recommendedFilters.length === 0) return 50;

  const ownedTypes = new Set(userFilters.map(uf => uf.filterType));

  // Check if best recommended filter is owned
  const bestFilter = recommendedFilters[0];
  if (!ownedTypes.has(bestFilter)) {
    // Check if any recommended filter is owned
    const matchCount = recommendedFilters.filter(f => ownedTypes.has(f)).length;
    if (matchCount === 0) return 20;
    return Math.round(30 + (matchCount / recommendedFilters.length) * 70);
  }

  // Best filter is owned — refine score based on specs and moon conditions
  const bestOwned = userFilters.find(uf => uf.filterType === bestFilter);
  if (!bestOwned) return 100;

  let score = 100;

  // Moon penalty: if filter is not moon-compatible and moon is up
  if (moonIllumination > 0.2 && !bestOwned.filter.moonCompatible) {
    const penalty = moonIllumination * 20; // up to -20 points
    score -= penalty;
  }

  // Moon bonus: if filter IS moon-compatible and moon is up, less penalty
  if (moonIllumination > 0.2 && bestOwned.filter.moonCompatible) {
    score += 5; // small bonus for moon compatibility
  }

  // Bandwidth bonus: narrower = better for emission targets
  if (bestOwned.filter.bandwidthNm <= 3) score += 5;
  if (bestOwned.filter.bandwidthNm <= 7 && bestOwned.filter.bandwidthNm > 3) score += 2;

  return Math.max(0, Math.min(100, Math.round(score)));
}