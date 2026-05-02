
import { GoogleGenAI } from "@google/genai";

// Initialize the Gemini AI client
// The API key is guaranteed to be in process.env.API_KEY per environment setup
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY, httpOptions: { apiVersion: 'v1alpha' } });

export const generateObjectDescription = async (objectName: string): Promise<string> => {
  try {
    // FIX: Updated model to gemini-3-flash-preview for better performance on basic text tasks per guidelines.
    const model = 'gemini-3-flash-preview';
    const prompt = `
      Act as an expert astrophotographer and astronomer. 
      Write a concise but engaging paragraph about the deep sky object: "${objectName}". 
      Include its scientific type (e.g., Emission Nebula, Spiral Galaxy), its distance from Earth, and what makes it a special target for photography.
      Keep it under 150 words.
    `;

    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
    });

    return response.text || "No description generated.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Could not generate description at this time. Please try again later.";
  }
};

export const generateArticleContent = async (
  topic: string,
  contentType: string,
  tone: string,
  length: string
): Promise<string> => {
  try {
    const model = 'gemini-3-flash-preview';

    const lengthMap: { [key: string]: string } = {
      short: 'one paragraph, about 100 words',
      medium: 'two or three paragraphs, about 250 words',
      long: 'multiple paragraphs with lists if appropriate, about 400 words',
    };

    const prompt = `
      Act as an expert astrophotographer and skilled science writer creating content for a blog.
      Your task is to write a ${contentType} with a ${tone} tone.
      The content should be ${lengthMap[length] || 'a medium length section'}.
      The main topic is: "${topic}".
      The output must be in simple, clean HTML. Only use the following tags: <h2>, <p>, <ul>, <ol>, <li>, <strong>, <em>.
      Do not include <!DOCTYPE html>, <html>, or <body> tags. Just return the content that would go inside a <div>.
    `;

    const response = await ai.models.generateContent({
      model,
      contents: prompt,
    });

    return response.text || "No content was generated.";
  } catch (error) {
    console.error("Gemini Content Generation Error:", error);
    throw new Error("Failed to generate content from AI. Please try again.");
  }
};

export const generateGearSpecs = async (gearName: string): Promise<string> => {
  try {
    const model = 'gemini-3-flash-preview';
    const prompt = `
      Act as an expert astrophotographer and equipment reviewer.
      List the key technical specifications and features for the following piece of astrophotography gear: "${gearName}".
      Format the output as a concise list of bullet points or short sentences suitable for a "Specs / Key Features" section on a product card.
      Focus on the most important aspects relevant to astrophotography (e.g., focal length, aperture, sensor size, weight, payload capacity, filter size, etc.).
      Keep it under 150 words.
    `;

    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
    });

    return response.text || "No specs generated.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Could not generate specs at this time. Please try again later.";
  }
};