import { GoogleGenAI } from "@google/genai";


const apiKey = process.env.AI_INTEGRATIONS_GEMINI_API_KEY || process.env.GEMINI_API_KEY;

if (!apiKey) {
  throw new Error(
    "Gemini API key must be set (AI_INTEGRATIONS_GEMINI_API_KEY or GEMINI_API_KEY).",
  );
}

export const ai = new GoogleGenAI({ apiKey });
