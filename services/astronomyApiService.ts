import { AstronomyData } from '../types';

const API_KEY = "67c92973fb3d47a1a3878de288cbe404";
const API_BASE_URL = 'https://api.ipgeolocation.io/v2/astronomy';

// Helper to format date as YYYY-MM-DD
const formatDateForApi = (date: Date): string => {
    return date.toISOString().split('T')[0];
};

export const fetchAstronomyData = async (latitude: number, longitude: number, date: Date): Promise<AstronomyData> => {
    const params = {
        apiKey: API_KEY,
        lat: latitude.toString(),
        long: longitude.toString(),
        date: formatDateForApi(date),
    };

    const url = `${API_BASE_URL}?${new URLSearchParams(params).toString()}`;

    try {
        const response = await fetch(url);
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`Astronomy API Error: ${errorData.message || response.statusText}`);
        }
        const data = await response.json();
        
        // The API returns an object that matches our needs.
        // We'll return it directly and assert its type for use in the component.
        return data as AstronomyData;

    } catch (error) {
        console.error("Failed to fetch astronomy data:", error);
        throw error; // Re-throw to be handled by the component.
    }
};
