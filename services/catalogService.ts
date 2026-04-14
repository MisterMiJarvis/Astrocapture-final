import { DeepSkyObject } from '../types';
import { parseRA, parseDec, calculateLST } from './astronomyUtils';

// This service handles the "Lazy Loading" and "Funnel Filtering" strategy
// for the large 14,000 object catalog.

const CATALOG_URL = '/data/deepSkyObjects.json';

// Cache the full catalog in memory after first load
let cachedCatalog: DeepSkyObject[] | null = null;

/**
 * Fetches the full deep sky catalog.
 * In a real app, this would fetch a large JSON file.
 */
export async function fetchDeepSkyCatalog(): Promise<DeepSkyObject[]> {
    if (cachedCatalog) return cachedCatalog;

    try {
        const response = await fetch(CATALOG_URL);
        if (!response.ok) throw new Error('Failed to load catalog');
        const data = await response.json();
        cachedCatalog = data;
        return data;
    } catch (error) {
        console.error('Error loading deep sky catalog:', error);
        return [];
    }
}

/**
 * Stage 1 & 2 Filter: The "Funnel"
 * Quickly discards objects that are definitely not visible or too faint.
 * This runs BEFORE the heavy altitude calculation.
 */
export function filterCatalogRoughly(
    catalog: DeepSkyObject[],
    latitude: number,
    longitude: number,
    date: Date,
    minMagnitude: number = 12, // Default limit for most amateur scopes
    minAltitude: number = 30
): DeepSkyObject[] {
    const lst = calculateLST(date, longitude);
    const lstRad = lst * (Math.PI / 180);
    const latRad = latitude * (Math.PI / 180);
    
    // Pre-calculate some values for the night
    // We want objects that are roughly near the meridian (LST) within +/- 6-8 hours
    // This is a "Rough RA Check"
    
    return catalog.filter(obj => {
        // 1. Magnitude Cutoff (Stage 1)
        if (obj.magnitude && obj.magnitude > minMagnitude) return false;

        // 2. Declination Cutoff (Stage 1)
        // If object is too far south for a northern observer (or vice versa)
        // Max Altitude = 90 - |Lat - Dec|
        // If Max Altitude < Min Altitude, it never rises high enough.
        const dec = parseDec(obj.declination || "0");
        const maxAlt = 90 - Math.abs(latitude - dec);
        if (maxAlt < minAltitude) return false;

        // 3. Rough RA Check (Stage 2)
        // Check if the object is "up" during the night.
        // Night is roughly LST +/- 6 to 8 hours.
        // RA is in degrees (0-360).
        const ra = parseRA(obj.rightAscension || "0");
        
        // Calculate Hour Angle (HA) = LST - RA
        let ha = (lst - ra + 360) % 360;
        if (ha > 180) ha -= 360; // Normalize to -180 to +180

        // If HA is within +/- 100 degrees (approx 6-7 hours), it's likely up or rising/setting soon.
        // This is a loose filter to discard objects on the complete opposite side of the sky (daytime).
        // Note: This checks LST at the *current* time passed (usually midnight or now).
        // For a full night plan, we might want to check if it's visible *at any point*.
        // A better heuristic: 
        // LST at midnight is roughly Sun RA + 180.
        // Objects with RA close to Sun RA are in the daytime sky.
        // Objects with RA close to Sun RA + 180 are in the midnight sky.
        // We want objects roughly within RA_Sun + 180 +/- 6-8 hours.
        
        // Let's stick to the HA check relative to the provided date/time (usually midnight).
        // If it's within +/- 7 hours (105 degrees) of the meridian at midnight, it's good.
        if (Math.abs(ha) > 120) return false; // 8 hours

        return true;
    });
}

/**
 * Search the catalog by name (client-side simple search)
 */
export function searchCatalog(catalog: DeepSkyObject[], query: string): DeepSkyObject[] {
    if (!query) return catalog;
    const lowerQuery = query.toLowerCase();
    return catalog.filter(obj => 
        (obj.commonName && obj.commonName.toLowerCase().includes(lowerQuery)) ||
        (obj.id && obj.id.toLowerCase().includes(lowerQuery)) ||
        (obj.constellation && obj.constellation.toLowerCase().includes(lowerQuery))
    );
}
