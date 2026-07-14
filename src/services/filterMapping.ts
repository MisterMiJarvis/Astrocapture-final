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
  filter_antlia_triband: 'Antlia_Triband',
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
  Antlia_Triband: 'filter_antlia_triband',
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
  Antlia_Triband: 'Antlia Triband',
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
  Antlia_Triband: 'bg-indigo-500/20 text-indigo-300',
  LPS_D2: 'bg-green-500/20 text-green-300',
  Ha: 'bg-red-500/20 text-red-300',
  OIII: 'bg-cyan-500/20 text-cyan-300',
  SII: 'bg-orange-500/20 text-orange-300',
  RGB: 'bg-pink-500/20 text-pink-300',
  Luminance: 'bg-slate-500/20 text-slate-300',
};

/**
 * Coverage map: which FilterTypes does each FilterType cover?
 * L_Ultimate (dual-3nm) covers Ha + OIII
 * LPS_D2 (anti-pollution) covers UV_IR_Cut in light-polluted areas
 * Ha, OIII, SII cover themselves only
 * RGB covers Luminance (wider band, similar use)
 */
export const FILTER_TYPE_COVERAGE: Record<FilterType, FilterType[]> = {
  UV_IR_Cut: ['UV_IR_Cut'],
  L_Ultimate: ['L_Ultimate', 'Ha', 'OIII'], // dual Ha+OIII
  Antlia_Triband: ['Antlia_Triband', 'Ha', 'OIII', 'SII', 'UV_IR_Cut'], // triband covers Ha+OIII+SII + broadband role
  LPS_D2: ['LPS_D2', 'UV_IR_Cut'], // anti-pollution covers broadband role too
  Ha: ['Ha'],
  OIII: ['OIII'],
  SII: ['SII'],
  RGB: ['RGB', 'Luminance'], // RGB set covers luminance role
  Luminance: ['Luminance', 'RGB'], // Luminance covers RGB role in LRGB
};

export interface UserFilterInfo {
  filter: AstroFilter;
  filterType: FilterType;
  label: string;
  color: string;
  /** Which FilterTypes this filter can substitute for */
  covers: FilterType[];
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
      const covers = FILTER_TYPE_COVERAGE[filterType] || [filterType];
      return { filter, filterType, label, color, covers };
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
 * Translate generic filter recommendations (from TYPE_FILTER_MAP) into
 * user-owned filters, using the coverage map.
 * E.g. if recommended = ['Ha', 'OIII', 'SII'] and user owns L_Ultimate,
 * result = ['L_Ultimate'] (covers Ha+OIII), and SII stays as "missing".
 */
export function translateRecommendations(
  recommendedFilters: FilterType[],
  userFilters: UserFilterInfo[],
): { owned: UserFilterInfo[]; missing: FilterType[] } {
  // Build a map: for each FilterType the user owns, what does it cover?
  const coverageMap = new Map<FilterType, UserFilterInfo>();
  for (const uf of userFilters) {
    for (const coveredType of uf.covers) {
      // Prefer the more specific filter (e.g., Ha over L_Ultimate for Ha)
      const existing = coverageMap.get(coveredType);
      if (!existing || uf.filter.bandwidthNm < existing.filter.bandwidthNm) {
        coverageMap.set(coveredType, uf);
      }
    }
  }

  const ownedResult: UserFilterInfo[] = [];
  const missingResult: FilterType[] = [];
  const addedOwned = new Set<FilterType>();

  for (const rec of recommendedFilters) {
    const matchingOwned = coverageMap.get(rec);
    if (matchingOwned) {
      // Add the owned filter that covers this recommendation
      if (!addedOwned.has(matchingOwned.filterType)) {
        addedOwned.add(matchingOwned.filterType);
        ownedResult.push(matchingOwned);
      }
    } else {
      missingResult.push(rec);
    }
  }

  return { owned: ownedResult, missing: missingResult };
}

/**
 * Enhanced filter score using real filter specs + coverage.
 * Takes into account bandwidth, transmission, moon compatibility, and
 * how well the user's owned filters cover the recommendations.
 */
export function calculateEnhancedFilterScore(
  recommendedFilters: FilterType[],
  userFilters: UserFilterInfo[],
  moonIllumination: number = 0,
): number {
  if (recommendedFilters.length === 0) return 50;

  const { owned, missing } = translateRecommendations(recommendedFilters, userFilters);

  // Base score from coverage ratio
  const coverageRatio = owned.length / recommendedFilters.length;
  if (coverageRatio === 0) return 20; // nothing covered

  let score = Math.round(40 + coverageRatio * 60); // 40-100 base

  // If best recommended filter is covered
  const bestRec = recommendedFilters[0];
  const coversBest = owned.some(uf => uf.covers.includes(bestRec));
  if (coversBest) score = Math.max(score, 85);

  // Moon adjustments
  if (moonIllumination > 0.2) {
    const moonOwned = owned.find(uf => uf.filter.moonCompatible);
    if (moonOwned) {
      score += 5; // bonus for moon-compatible filter available
    } else {
      score -= Math.round(moonIllumination * 15); // penalty
    }
  }

  // Bandwidth bonus for narrowband targets
  const narrowbandOwned = owned.find(uf => uf.filter.bandwidthNm <= 7);
  if (narrowbandOwned) {
    if (narrowbandOwned.filter.bandwidthNm <= 3) score += 5;
    else score += 2;
  }

  // Missing critical filters penalty
  if (missing.length > 0 && missing.includes(bestRec)) {
    score -= 15; // best filter not covered
  }

  return Math.max(0, Math.min(100, Math.round(score)));
}