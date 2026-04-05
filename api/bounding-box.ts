import { Type } from "@google/genai";
import { getAi, generateWithRetry, resolveImageToBase64, DEFAULT_MODEL } from "./_gemini";

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { imageData } = req.body || {};
  if (!imageData) return res.status(400).json({ error: 'imageData is required' });

  try {
    const ai = getAi();
    const base64 = await resolveImageToBase64(imageData);

    const response = await generateWithRetry(ai, {
      model: DEFAULT_MODEL,
      contents: {
        parts: [
          { inlineData: { mimeType: 'image/jpeg', data: base64 } },
          { text: "Identify the single most prominent trading card or graded slab in this image. If it is a graded slab (e.g., PSA, BGS, SGC), ensure the bounding box includes the entire plastic holder and label. Provide its bounding box as normalized coordinates [ymin, xmin, ymax, xmax] in the range 0-1000. Return only the JSON object." },
        ],
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            ymin: { type: Type.NUMBER },
            xmin: { type: Type.NUMBER },
            ymax: { type: Type.NUMBER },
            xmax: { type: Type.NUMBER },
          },
          required: ["ymin", "xmin", "ymax", "xmax"],
        },
      },
    });

    res.json(response ? JSON.parse(response.text || '{}') : null);
  } catch (error: any) {
    const status = (error?.status === 429 || error?.error?.code === 429) ? 429 : 500;
    res.status(status).json({ error: error.message });
  }
}
