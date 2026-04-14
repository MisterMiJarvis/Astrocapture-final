
import { AstroForecastResponse } from '../types';

/**
 * Fetches a specialized astrophotography forecast from the Open-Meteo API.
 * It fetches 48 hours of data starting from the given date to cover an overnight window.
 * @param latitude The user's latitude.
 * @param longitude The user's longitude.
 * @param startDate The start date for the forecast.
 * @returns A promise that resolves to the hourly forecast data.
 */
export const fetchAstroForecast = async (latitude: number, longitude: number, startDate: Date): Promise<AstroForecastResponse | null> => {
    const formatDate = (d: Date) => d.toISOString().split('T')[0];
    
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 2); // Fetch 3 days to ensure we cover the full overnight window even for future dates

    const params: Record<string, string> = {
        latitude: latitude.toFixed(2),
        longitude: longitude.toFixed(2),
        hourly: 'temperature_2m,dewpoint_2m,relative_humidity_2m,cloud_cover,cloud_cover_low,cloud_cover_mid,cloud_cover_high,wind_speed_10m,wind_gusts_10m,precipitation',
        models: 'best_match',
        timezone: 'auto',
        start_date: formatDate(startDate),
        end_date: formatDate(endDate),
    };
    const url = `https://api.open-meteo.com/v1/forecast?${new URLSearchParams(params).toString()}`;

    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Open-Meteo API Error: ${response.status} ${response.statusText}`);
        }
        const data = await response.json();
        if (!data.hourly) {
            throw new Error('Invalid data structure from Open-Meteo API');
        }
        
        return data.hourly as AstroForecastResponse;
    } catch (error) {
        console.error("Failed to fetch astro weather forecast:", error);
        throw error; // Re-throw to be handled by the UI component
    }
};

/**
 * Fetches a 14-day weather forecast for nightly summaries.
 * @param latitude The user's latitude.
 * @param longitude The user's longitude.
 * @returns A promise that resolves to the hourly forecast data for 16 days.
 */
export const fetchNightlyForecast = async (latitude: number, longitude: number): Promise<AstroForecastResponse | null> => {
    const formatDate = (d: Date) => d.toISOString().split('T')[0];
    
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(startDate.getDate() + 15); // Fetch 16 days to cover 14 nights fully

    const params: Record<string, string> = {
        latitude: latitude.toFixed(2),
        longitude: longitude.toFixed(2),
        hourly: 'temperature_2m,precipitation,cloud_cover,wind_speed_10m',
        models: 'best_match',
        timezone: 'auto',
        start_date: formatDate(startDate),
        end_date: formatDate(endDate),
    };
    
    const url = `https://api.open-meteo.com/v1/forecast?${new URLSearchParams(params).toString()}`;

    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Open-Meteo API Error: ${response.status} ${response.statusText}`);
        }
        const data = await response.json();
        if (!data.hourly) {
            throw new Error('Invalid data structure from Open-Meteo API');
        }
        
        return data.hourly as AstroForecastResponse;
    } catch (error) {
        console.error("Failed to fetch nightly forecast:", error);
        throw error;
    }
};
