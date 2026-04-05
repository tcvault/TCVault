import { Type } from "@google/genai";
import { getAi, generateWithRetry, DEFAULT_MODEL } from "./_gemini.js";

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { playerName, cardSpecifics, set, condition, certNumber } = req.body || {};
  if (!playerName || !cardSpecifics || !set) {
    return res.status(400).json({ error: "playerName, cardSpecifics, and set are required" });
  }

  try {
    const ai = getAi();
    const psaUrl = certNumber ? `https://www.psacard.com/cert/${certNumber}/psa` : null;

    const prompt = `Provide a STABLE Market Valuation for: ${playerName} ${cardSpecifics} (${set}) ${condition ? `in ${condition} condition` : ""}.
    ${certNumber ? `PSA Certification Number: ${certNumber}. Official PSA Cert Page: ${psaUrl}` : ""}
    Search only for RECENT VERIFIED SOLD items on eBay. Average the results and round to the nearest GBP 5. Provide the value in GBP.
    If a PSA certification is provided, verify the card details against the PSA registry to ensure accuracy.`;

    const response = await generateWithRetry(ai, {
      model: DEFAULT_MODEL,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            price: { type: Type.NUMBER },
            summary: { type: Type.STRING },
          },
          required: ["price", "summary"],
        },
        tools: [{ googleSearch: {} }, ...(psaUrl ? [{ urlContext: {} }] : [])],
      },
    });

    if (!response) return res.json(null);

    const result = JSON.parse(response.text || "{}");
    res.json({
      price: Math.round((result.price || 0) / 5) * 5,
      summary: result.summary || "",
      sources:
        response.candidates?.[0]?.groundingMetadata?.groundingChunks?.map((chunk: any) => ({
          title: chunk.web?.title || "Market Intel",
          uri: chunk.web?.uri || "#",
        })) || [],
    });
  } catch (error: any) {
    const status = error?.status === 429 || error?.error?.code === 429 ? 429 : 500;
    res.status(status).json({ error: error.message });
  }
}
