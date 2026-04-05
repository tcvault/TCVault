import { GoogleGenAI } from "@google/genai";

export const DEFAULT_MODEL = "gemini-3-flash-preview";

export function getAi() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not configured");
  return new GoogleGenAI({ apiKey });
}

export async function generateWithRetry(ai, params, retries = 3, delay = 2000) {
  for (let i = 0; i <= retries; i += 1) {
    try {
      return await ai.models.generateContent(params);
    } catch (error) {
      const isRetryable =
        error?.message?.includes("503") ||
        error?.status === 503 ||
        error?.error?.code === 503 ||
        error?.message?.includes("429") ||
        error?.status === 429 ||
        error?.error?.code === 429 ||
        error?.message?.includes("RESOURCE_EXHAUSTED");

      if (isRetryable && i < retries) {
        await new Promise((resolve) => setTimeout(resolve, delay * Math.pow(2, i)));
        continue;
      }

      throw error;
    }
  }
}

export async function resolveImageToBase64(imageData) {
  if (imageData.startsWith("http")) {
    const response = await fetch(imageData);
    const buffer = await response.arrayBuffer();
    return Buffer.from(buffer).toString("base64");
  }

  return imageData.split(",")[1] || imageData;
}
