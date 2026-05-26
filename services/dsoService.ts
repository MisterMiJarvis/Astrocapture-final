import { DeepSkyObject } from '../types';

const API_BASE = '/api';

export const fetchDsoData = async (objectName: string): Promise<DeepSkyObject | null> => {
    if (!objectName?.trim()) {
        return null;
    }

    try {
        console.log(`[DSO Service] Fetching "${objectName}" from Hal API...`);
        
        const response = await fetch(`${API_BASE}/dso/search/${encodeURIComponent(objectName)}`);
        
        if (!response.ok) {
            console.error(`[DSO Service] Hal API error for "${objectName}": ${response.status}`);
            return null;
        }
        
        const data = await response.json();
        
        if (data.error) {
            console.error(`[DSO Service] Error: ${data.error}`);
            return null;
        }
        
        console.log(`[DSO Service] Successfully fetched data for "${objectName}".`);
        return data as DeepSkyObject;

    } catch (error) {
        console.error(`[DSO Service] Network error fetching "${objectName}":`, error);
        return null;
    }
};
