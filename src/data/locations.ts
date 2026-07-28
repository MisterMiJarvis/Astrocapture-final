// ============================================================================
// Shared preset locations for AstroCapture
// Centralizes coordinates and Bortle scale values that were previously
// duplicated across multiple components.
// ============================================================================

export interface PresetLocation {
  id: string;
  name: string;
  lat: number;
  lon: number;
  bortle: number;
}

export const PRESET_LOCATIONS: PresetLocation[] = [
  { id: 'saintEtienne', name: 'Saint-Étienne-du-Grès (13103)', lat: 43.7889, lon: 4.7533, bortle: 4 },
  { id: 'pradelles', name: 'Pradelles (43420)', lat: 44.6167, lon: 3.9667, bortle: 2 },
];

/** Lookup a preset location by its id (e.g. 'saintEtienne'). Returns null if not found. */
export function getPresetLocation(id: string): PresetLocation | null {
  return PRESET_LOCATIONS.find((loc) => loc.id === id) ?? null;
}

/** Convenience map for quick coordinate/bortle lookups by id. */
export const PRESET_LOCATION_MAP: Record<string, PresetLocation> = Object.fromEntries(
  PRESET_LOCATIONS.map((loc) => [loc.id, loc]),
);