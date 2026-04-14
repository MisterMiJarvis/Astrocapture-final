
import { APOD } from '../types';

// ==================================================================
// IMPORTANT: NASA APOD API KEY CONFIGURATION
// ==================================================================
// To enable the "Image of the Day" feature, you need a free API key from NASA.
// 1. Visit https://api.nasa.gov/
// 2. Fill out the form to generate your API key.
// 3. Paste your key below, replacing the "YOUR_NASA_API_KEY_HERE" placeholder.
// ==================================================================
const NASA_API_KEY = "eiPqQkklE0WUqvy2KsZyC8V5NREe4bCFMFEKuxay"; // <-- PASTE YOUR KEY HERE, DEMO_KEY has limits

const API_BASE_URL = 'https://api.nasa.gov/planetary/apod';

/**
 * Fetches the Astronomy Picture of the Day (APOD) from NASA's API for a specific date.
 * @param date The date for which to fetch the APOD.
 * @returns A promise that resolves to the APOD data object.
 */
export const fetchImageOfTheDay = async (date: Date): Promise<APOD> => {
    let apiKey = NASA_API_KEY;
    // Developer check for placeholder API key. A DEMO_KEY is provided but has strict rate limits.
    if (NASA_API_KEY.startsWith('YOUR_')) {
        console.warn('Using NASA DEMO_KEY. Rate limits are applied. For better performance, get your own key from https://api.nasa.gov/');
        apiKey = 'DEMO_KEY';
    }

    const dateString = date.toISOString().split('T')[0]; // Format date as YYYY-MM-DD
    const url = `${API_BASE_URL}?api_key=${apiKey}&date=${dateString}`;

    try {
        const response = await fetch(url);
        if (!response.ok) {
            if (response.status === 429) {
                throw new Error('NASA APOD rate limit exceeded. The DEMO_KEY has limited requests. Please get a free API key from https://api.nasa.gov/ and add it to services/nasaApiService.ts.');
            }
            const errorData = await response.json();
            throw new Error(errorData.msg || 'Failed to fetch NASA Image of the Day.');
        }
        const data = await response.json();
        
        // The API returns an object that matches our APOD interface.
        return data as APOD;
    } catch (error) {
        console.error("NASA APOD API Error:", error);
        throw error; // Re-throw to be handled by the component.
    }
};