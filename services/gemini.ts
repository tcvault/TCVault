
import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export interface IdentifiedCard {
  playerName: string;
  cardSpecifics: string;
  set: string;
  setNumber?: string;
  condition?: string;
  estimatedValue: number;
  description: string;
  serialNumber?: string;
  reasoning?: string;
}

export interface MarketPriceResult {
  price: number;
  sources: { title: string; uri: string }[];
  summary: string;
}

/**
 * Uses Gemini 3 Flash with an enhanced authentication protocol specifically tuned for 
 * sports card parallels and rare textures.
 */
export const identifyCard = async (images: string[]): Promise<IdentifiedCard | null> => {
  try {
    const imageParts = images.map((img) => ({
      inlineData: {
        mimeType: 'image/jpeg',
        data: img.split(',')[1] || img,
      },
    }));

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [
          ...imageParts,
          {
            text: `Act as a world-class trading card grader and parallel specialist. Analyze these ${images.length} images.
            
            STRICT IDENTIFICATION PROTOCOL:
            
            1. **Grading Check (CRITICAL)**:
               - Look for a plastic holder with a label (a "slab").
               - Identify the Grading Company: PSA, BGS (Beckett), SGC, CGC, etc.
               - Identify the Numerical Grade: (e.g., 10, 9.5, 9, 8).
               - If graded, return the condition as '[Company] [Grade]' (e.g., "PSA 10").
               - If NOT in a slab, return 'Raw' or 'Ungraded'.

            2. **Parallel Identification**: 
               - Look for printed text: 'CONCOURSE', 'PREMIER LEVEL', 'COURTSIDE', 'TERRACE', 'MEZZANINE', 'FIELD LEVEL'.
               - Texture: Look for 'ICE' (cracked shards), 'PRIZM' (smooth rainbow), 'SHIMMER', or 'WAVE'.
               - Color: Differentiate WHITE ICE (silver shards) from BLUE ICE (blue shards).
            
            3. **Serial Number Logic**:
               - Search for FOIL-STAMPED fractional numbers (e.g., '12/85').
               - Often found on the back or in corners of the front.
            
            4. **Set Identification**:
               - Check the small legal text at the bottom rear for the YEAR and PRODUCT (e.g., '2023-24 Panini Select').

            Return a JSON object. In the 'description' field, include any visible defects or interesting details about the card's appearance.`,
          },
        ],
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            playerName: { type: Type.STRING },
            cardSpecifics: { type: Type.STRING, description: "Full Parallel Name, e.g., 'White Ice Terrace'" },
            set: { type: Type.STRING },
            setNumber: { type: Type.STRING, description: "Checklist ID from back (e.g., 245)" },
            condition: { type: Type.STRING, description: "Graded status, e.g. 'PSA 10' or 'Raw'" },
            estimatedValue: { type: Type.NUMBER },
            description: { type: Type.STRING },
            serialNumber: { type: Type.STRING, description: "Fractional stamp (e.g., 12/85)" },
            reasoning: { type: Type.STRING, description: "Visual logic for parallel choice" },
          },
          required: ["playerName", "cardSpecifics", "set", "estimatedValue"],
        },
      },
    });

    const result = JSON.parse(response.text || '{}');
    return result as IdentifiedCard;
  } catch (error: any) {
    if (error?.message?.includes('429') || error?.message?.includes('quota')) {
      throw new Error("QUOTA_EXHAUSTED");
    }
    console.error("Gemini Identification Error:", error);
    return null;
  }
};

export const getMarketPrice = async (playerName: string, cardSpecifics: string, set: string): Promise<MarketPriceResult | null> => {
  try {
    const prompt = `Search for recent sales and current listings of: "${playerName}" - "${cardSpecifics}" from "${set}". Provide average price in GBP (£).`;
    
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
      },
    });

    const priceMatch = response.text.match(/[£$](\d+(\.\d{2})?)/);
    const estimatedPrice = priceMatch ? parseFloat(priceMatch[1]) : 0;
    
    const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks?.map((chunk: any) => ({
      title: chunk.web?.title || 'Source',
      uri: chunk.web?.uri || '#'
    })) || [];

    return {
      price: estimatedPrice,
      summary: response.text,
      sources: sources
    };
  } catch (error) {
    console.error("Market Price Check Error:", error);
    return null;
  }
};
