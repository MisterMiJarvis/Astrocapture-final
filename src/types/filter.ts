// ============================================================================
// TYPES — Astro Filters (CRUD)
// ============================================================================

export type FilterCategory = 'broadband' | 'narrowband' | 'dualband' | 'anti_pollution' | 'special';

export interface AstroFilter {
  id: string;
  name: string;
  brand: string;                  // e.g. "ZWO", "Baader", "Optolong"
  category: FilterCategory;
  bandwidthNm: number;            // FWHM in nm
  peakTransmission: number;        // 0-1 (e.g. 0.90 = 90%)
  centerWavelengthNm: number;     // e.g. 656.3 for Hα
  skySuppression: number;          // 0-1, how much sky glow it blocks
  moonCompatible: boolean;
  color: string;                   // hex for UI
  description: string;
  useCases: string[];
  recommendedTargets: string[];
  owned: boolean;                  // does the user own this filter?
  isDefault: boolean;              // shown in filter dropdowns by default
  transmissionData?: { wavelength: number; transmission: number }[]; // real spectral data points
  createdAt: string;
  updatedAt: string;
}

export const FILTER_CATEGORY_LABELS: Record<FilterCategory, string> = {
  broadband: 'Broadband',
  narrowband: 'Narrowband',
  dualband: 'Dual-band',
  anti_pollution: 'Anti-pollution',
  special: 'Special',
};

export const FILTER_CATEGORY_ICONS: Record<FilterCategory, string> = {
  broadband: '🌈',
  narrowband: '🔴',
  dualband: '🟣',
  anti_pollution: '🌆',
  special: '⭐',
};