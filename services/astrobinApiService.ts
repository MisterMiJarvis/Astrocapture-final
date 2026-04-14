import { AstrobinImage } from '../types';
import { ASTROBIN_CONFIG } from './astrobinApiConfig';

const API_BASE_URL = 'https://www.astrobin.com/api/v1';

/**
 * Strips HTML tags from a string to prevent rendering issues.
 * @param html The input string containing HTML.
 * @returns A plain text string.
 */
const stripHtml = (html: string | null | undefined): string => {
    if (!html) return '';
    const doc = new DOMParser().parseFromString(html, 'text/html');
    return doc.body.textContent || "";
};

/**
 * Fetches the Image of the Day (IOTD) from Astrobin based on an offset from today.
 * offset=0 is today, offset=1 is yesterday, etc.
 * This is a two-step process:
 * 1. Fetch the IOTD record for the offset to get the image's resource URI.
 * 2. Fetch the full details for that image using the resource URI.
 * @param offset The number of days to go back from today.
 * @returns A promise that resolves to the AstrobinImage data object, or null if not found.
 */
export const fetchAstrobinImageOfTheDay = async (offset: number): Promise<AstrobinImage | null> => {
    const { apiKey, apiSecret } = ASTROBIN_CONFIG;

    // Developer check for placeholder API keys
    if (apiKey.startsWith('YOUR_') || apiSecret.startsWith('YOUR_')) {
        throw new Error("Astrobin API Key/Secret is not configured. Please add your credentials to services/astrobinApiConfig.ts");
    }

    const authParams = `api_key=${apiKey}&api_secret=${apiSecret}&format=json`;

    try {
        // --- Step 1: Get the IOTD resource URI for the given offset ---
        const iotdUrl = `${API_BASE_URL}/imageoftheday/?limit=1&offset=${offset}&${authParams}`;
        const iotdResponse = await fetch(iotdUrl);
        
        if (!iotdResponse.ok) {
            // Added status code to the error for better debugging.
            throw new Error(`Astrobin API Error (IOTD): ${iotdResponse.status} ${iotdResponse.statusText}`);
        }

        const iotdData = await iotdResponse.json();
        if (!iotdData.objects || iotdData.objects.length === 0) {
            return null; // No image of the day for this offset
        }

        const imageResourceUri = iotdData.objects[0].image;
        if (!imageResourceUri) {
            return null;
        }

        // --- Step 2: Fetch the full image details using the resource URI ---
        const imageUrl = `https://www.astrobin.com${imageResourceUri}?${authParams}`;
        const imageResponse = await fetch(imageUrl);

        if (!imageResponse.ok) {
            // Added status code to the error for better debugging.
            throw new Error(`Astrobin API Error (Image): ${imageResponse.status} ${imageResponse.statusText}`);
        }

        const imageData = await imageResponse.json();

        // Map the API response to our AstrobinImage interface
        const formattedImage: AstrobinImage = {
            title: imageData.title,
            url_gallery: imageData.url_gallery,
            user: imageData.user,
            description: stripHtml(imageData.description), // Sanitize description
            likes: imageData.likes,
            views: imageData.views,
            url_hd: imageData.url_hd,
            resource_uri: imageData.resource_uri,
            astrobin_id: imageData.astrobin_id,
        };

        return formattedImage;

    } catch (error) {
        console.error("Astrobin API Service Error:", error);
        throw error; // Re-throw to be handled by the component
    }
};