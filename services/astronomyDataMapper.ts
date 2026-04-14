
import { AstronomyData, MappedAstronomyData } from '../types';

/**
 * Maps raw astronomy data from the API to a display-friendly format.
 * This function handles null checks, formatting, and calculating astrophotography-specific times.
 * @param data The raw AstronomyData object from the API.
 * @returns A MappedAstronomyData object with formatted strings for the UI, or null if input is null.
 */
export const mapAstronomyData = (data: AstronomyData | null): MappedAstronomyData | null => {
  if (!data) {
    return null;
  }

  return {
    sunrise: data.astronomy.sunrise || 'N/A',
    sunset: data.astronomy.sunset || 'N/A',
    moonrise: data.astronomy.moonrise || 'N/A',
    moonset: data.astronomy.moonset || 'N/A',
    moonPhase: data.astronomy.moon_phase?.replace(/_/g, ' ') || 'N/A',
    moonIllumination: data.astronomy.moon_illumination_percentage != null ? String(data.astronomy.moon_illumination_percentage) : 'N/A',
    fullNightBegins: data.astronomy.evening?.astronomical_twilight_end || 'N/A',
    fullNightEnds: data.astronomy.morning?.astronomical_twilight_begin || 'N/A',
  };
};
