
import { GoogleGenAI, Type } from "@google/genai";
import { DeepSkyObject } from '../types';
import { getDocument, saveCollectionItem } from './firebase';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY, httpOptions: { apiVersion: 'v1alpha' } });
const CACHE_COLLECTION = 'dso_cache';

export const fetchDsoData = async (objectName: string): Promise<DeepSkyObject | null> => {
    if (!objectName?.trim()) {
        return null;
    }
    // Create a consistent, safe document ID from the object name (e.g., "M 42" -> "M42")
    const docId = objectName.toUpperCase().replace(/\s+/g, '');

    try {
        // 1. Check Firestore cache first
        const cachedData = await getDocument(CACHE_COLLECTION, docId);
        if (cachedData) {
            console.log(`[DSO Service] Serving "${objectName}" from Firestore cache.`);
            return cachedData as DeepSkyObject;
        }

        console.log(`[DSO Service] Cache miss for "${objectName}". Fetching from Gemini...`);
        
        // 2. If not in cache, fetch from Gemini API
        const model = 'gemini-3-flash-preview';

        const prompt = `
          Act as an expert astronomer with access to real-time web data.
          For the astronomical object "${objectName}", perform a web search to find the following information and return it as a JSON object matching the provided schema.
          - Common name (if different from the query)
          - Object type (e.g., Emission Nebula, Spiral Galaxy)
          - Constellation
          - Estimated Age (e.g., 2 million years)
          - Right Ascension and Declination (J2000 epoch)
          - Distance from Earth in light-years
          - Apparent Magnitude
          - A list of its main catalog designations (e.g., Messier, NGC, IC).
          - A list of its primary chemical constituents (e.g., 'Ionized Hydrogen', 'Molecular Dust').
        `;

        const responseSchema = {
            type: Type.OBJECT,
            properties: {
                id: { type: Type.STRING, description: "The primary identifier of the object, like 'M42'." },
                commonName: { type: Type.STRING, description: "The common name of the object, e.g., 'Orion Nebula'." },
                objectType: { type: Type.STRING, description: "The scientific classification of the object." },
                constellation: { type: Type.STRING, description: "The constellation where the object is found." },
                rightAscension: { type: Type.STRING, description: "The Right Ascension coordinate (J2000), formatted as H M S." },
                declination: { type: Type.STRING, description: "The Declination coordinate (J2000), formatted as D M S." },
                distance: { type: Type.NUMBER, description: "The distance from Earth in light-years." },
                distanceUnit: { type: Type.STRING, description: "The unit for the distance, which should be 'ly'." },
                magnitude: { type: Type.NUMBER, description: "The apparent magnitude of the object." },
                catalogDenominations: { type: Type.ARRAY, items: { type: Type.STRING }, description: "A list of catalog designations for the object." },
                composition: { type: Type.ARRAY, items: { type: Type.STRING }, description: "A list of the primary gases or molecules the object is made of." },
                age: { type: Type.NUMBER, description: "The estimated age of the object." },
                ageUnit: { type: Type.STRING, description: "The unit for the age, e.g., 'million years'." },
            },
            required: ["id", "objectType", "constellation", "rightAscension", "declination", "catalogDenominations"]
        };

        const response = await ai.models.generateContent({
            model: model,
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: responseSchema,
                tools: [{ googleSearch: {} }],
            },
        });

        if (!response.text) {
            console.error("Gemini Search Error: No text response received.");
            return null;
        }
        
        const parsedJson = JSON.parse(response.text);

        const dsoData: DeepSkyObject = {
            id: parsedJson.id || objectName,
            commonName: parsedJson.commonName || null,
            objectType: parsedJson.objectType || null,
            constellation: parsedJson.constellation || null,
            rightAscension: parsedJson.rightAscension || null,
            declination: parsedJson.declination || null,
            distance: typeof parsedJson.distance === 'number' ? parsedJson.distance : null,
            distanceUnit: parsedJson.distanceUnit || 'ly',
            magnitude: typeof parsedJson.magnitude === 'number' ? parsedJson.magnitude : null,
            catalogDenominations: parsedJson.catalogDenominations || null,
            composition: parsedJson.composition || null,
            age: typeof parsedJson.age === 'number' ? parsedJson.age : null,
            ageUnit: parsedJson.ageUnit || 'years',
        };
        
        // 3. Save the newly fetched data to the Firestore cache before returning
        await saveCollectionItem(CACHE_COLLECTION, docId, dsoData);
        console.log(`[DSO Service] Successfully cached data for "${objectName}" in Firestore.`);

        return dsoData;

    } catch (error) {
        console.error(`[DSO Service] Error fetching data for "${objectName}":`, error);
        throw new Error("Could not retrieve object data from web search or cache.");
    }
};