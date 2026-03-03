
import { GoogleGenAI, Type } from "@google/genai";

let aiInstance: GoogleGenAI | null = null;

const getAi = () => {
  if (!aiInstance) {
    // Direct access to process.env.GEMINI_API_KEY is the recommended way
    // Vite will replace this during build if defined, or we can use a fallback
    const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY || (import.meta as any).env?.VITE_GEMINI_API_KEY;

    if (!apiKey) {
      throw new Error("Gemini API Key is missing. Please check your environment variables.");
    }
    aiInstance = new GoogleGenAI({ apiKey });
  }
  return aiInstance;
};

const DEFAULT_MODEL = "gemini-3-flash-preview";

async function generateWithRetry(params: any, retries = 2, delay = 1000) {
  const ai = getAi();
  for (let i = 0; i <= retries; i++) {
    try {
      return await ai.models.generateContent(params);
    } catch (error: any) {
      const is503 = error?.message?.includes('503') || error?.status === 503 || (error?.error?.code === 503);
      if (is503 && i < retries) {
        await new Promise(resolve => setTimeout(resolve, delay * (i + 1)));
        continue;
      }
      throw error;
    }
  }
}

export interface IdentifiedCard {
  playerName: string;
  team: string;
  cardSpecifics: string;
  set: string;
  setNumber?: string;
  condition?: string;
  estimatedValue: number;
  description: string;
  serialNumber?: string;
  certNumber?: string;
  reasoning?: string;
  rarityTier?: 'Base' | 'Parallel' | 'Chase' | '1/1';
  checklistVerified?: boolean;
}

export interface MarketPriceResult {
  price: number;
  sources: { title: string; uri: string }[];
  summary: string;
}

export interface MarketIntel {
  sold: Array<{
    title: string;
    uri: string;
    soldDate?: string;       // ISO
    price: number;
    currency: string;        // "GBP", "USD", ...
    shipping?: number;
    grade?: string;
    matchConfidence: number; // 0..1
    source: string;          // "eBay", ...
    flags?: string[];
  }>;
  active: Array<{
    title: string;
    uri: string;
    price: number;
    currency: string;
    shipping?: number;
    source: string;
    flags?: string[];
  }>;
  notes?: string;
  fxRateUsed?: string;       // "1 USD = 0.79 GBP @ YYYY-MM-DD"
  sources?: { title: string; uri: string }[];
}

export interface BoundingBox {
  ymin: number;
  xmin: number;
  ymax: number;
  xmax: number;
}

const UNIVERSAL_SOCCER_CARD_REGISTRY = `
UNIVERSAL SOCCER CARD HISTORICAL REGISTRY (Multi-Era):

1. PANINI SELECT (Critical Parallel Mapping):
   - /155: Orange Ice
   - /150: Camo
   - /140: Purple
   - /125: Bronze Checker / Green Fluorescent
   - /99: Pink
   - /88: Red Wave
   - /85: WHITE ICE
   - /75: Orange / Blue Ice
   - /49: Winter Camo
   - /25: Tie-Dye
   - /10: Gold / Gold Mojo
   - 1/1: Black Finite

2. PANINI PRIZM (Global Standard):
   - Parallels: Silver, Hyper, Mojo, Red, Blue Ice.
   - Numbered: /199 (Blue), /149 (Red), /99 (Blue Ice), /75 (Purple), /25 (Mojo), /10 (Gold), /1 (Black).

3. TOPPS CHROME UEFA:
   - Refractor, Speckle, RayWave.
   - Numbered: /250 (Aqua), /150 (Blue), /99 (Green), /75 (Yellow), /50 (Gold), /25 (Orange), /10 (Red), /5 (Frozen).

4. PANINI DONRUSS (2023-24 & Modern):
   - Press Proofs: Silver, Gold (/10), Black (1/1).
   - Optic Parallels: Holo, Red (/199), Blue (/99), Orange (/49), Pink (/25), Gold (/10), Gold Vinyl (1/1).
   - Inserts (SSP): Kaboom!, Night Moves, Crunch Time.
   - Rated Rookies: Look for the "RR" logo.
`;

/**
 * High-precision identification for the Global Soccer Archive.
 */
export const identifyCard = async (images: string[]): Promise<IdentifiedCard | null> => {
  try {
    const imageParts = await Promise.all(images.map(async (img) => {
      let base64Data = img;
      
      // If it's a URL, fetch it
      if (img.startsWith('http')) {
        try {
          const response = await fetch(img);
          const blob = await response.blob();
          base64Data = await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(blob);
          });
        } catch (fetchError) {
          console.error("Failed to fetch image URL for identification:", fetchError);
        }
      }

      return {
        inlineData: {
          mimeType: 'image/jpeg',
          data: base64Data.split(',')[1] || base64Data,
        },
      };
    }));

    const response = await generateWithRetry({
      model: DEFAULT_MODEL,
      contents: {
        parts: [
          ...imageParts,
          {
            text: `Act as a Senior Soccer Card Historian and Authenticator. 
            Master Registry: ${UNIVERSAL_SOCCER_CARD_REGISTRY}

            IDENTIFICATION PROTOCOL:
            1. **Visual Analysis**: Examine logos (Panini, Topps, Donruss, Optic), year, and player.
            2. **Parallel Detection**: Check for refractors, patterns (Mojo, Wave, Ice), and colors. 
            3. **Donruss Specifics**: For Donruss 2023-24, distinguish between standard Donruss and "Optic" versions. Check for "Press Proof" text.
            4. **Serial Number**: If a number like "XX/YY" is visible, use it to confirm the parallel type from the Registry.
            5. **Grading Detection**: Check if the card is in a graded slab (PSA, BGS, SGC, CGC). If so, identify the grading company and the numeric grade (e.g., "PSA 10", "BGS 9.5"). Populate the 'condition' field with this information. If not graded, use 'Ungraded' or a descriptive condition like 'Near Mint'.
            6. **Certification Number**: ONLY if the card is identified as a PSA graded slab, look for the unique PSA certification number (usually 8-10 digits). Populate the 'certNumber' field. If the card is BGS, SGC, CGC or Ungraded, do NOT populate the 'certNumber' field.
            
            VALUATION PROTOCOL:
            1. **Valuation Anchor**: Identify the 3 most common RECENT SOLD prices for this exact parallel and grade. 
            2. **Calculate Mean**: Calculate the Volume-Weighted Mean of these 3 prices.
            3. **Consistency Check**: Round the 'estimatedValue' to the nearest £5.

            Output JSON. Be extremely precise with the 'set' name (e.g., "2023-24 Panini Donruss Soccer").`,
          },
        ],
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            playerName: { type: Type.STRING },
            team: { type: Type.STRING },
            cardSpecifics: { type: Type.STRING, description: "Parallel type, e.g. 'Optic Holo' or 'Press Proof Silver'" },
            set: { type: Type.STRING, description: "Full set name, e.g. '2023-24 Panini Donruss Soccer'" },
            setNumber: { type: Type.STRING },
            condition: { type: Type.STRING, description: "Grade if graded (e.g. 'PSA 10') or condition if raw (e.g. 'Near Mint')" },
            estimatedValue: { type: Type.NUMBER },
            description: { type: Type.STRING },
            serialNumber: { type: Type.STRING },
            certNumber: { type: Type.STRING, description: "Grading certification number (e.g. PSA cert #)" },
            reasoning: { type: Type.STRING },
            rarityTier: { type: Type.STRING, enum: ['Base', 'Parallel', 'Chase', '1/1'] },
            checklistVerified: { type: Type.BOOLEAN }
          },
          required: ["playerName", "team", "cardSpecifics", "set", "estimatedValue"],
        },
      },
    });

    if (!response) return null;
    return JSON.parse(response.text || '{}') as IdentifiedCard;
  } catch (error: any) {
    console.error("Identification Error:", error);
    return null;
  }
};

/**
 * Detects the bounding box of the main trading card in an image.
 */
export const getCardBoundingBox = async (imageData: string): Promise<BoundingBox | null> => {
  try {
    let base64Data = imageData;
    
    if (imageData.startsWith('http')) {
      try {
        const response = await fetch(imageData);
        const blob = await response.blob();
        base64Data = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(blob);
        });
      } catch (e) {
        console.error("Failed to fetch image for bounding box:", e);
      }
    }

    const response = await generateWithRetry({
      model: DEFAULT_MODEL,
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: 'image/jpeg',
              data: base64Data.split(',')[1] || base64Data,
            },
          },
          {
            text: "Identify the single most prominent trading card or graded slab in this image. If it is a graded slab (e.g., PSA, BGS, SGC), ensure the bounding box includes the entire plastic holder and label. Provide its bounding box as normalized coordinates [ymin, xmin, ymax, xmax] in the range 0-1000. Return only the JSON object.",
          },
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

    if (!response) return null;
    return JSON.parse(response.text || '{}') as BoundingBox;
  } catch (error) {
    console.error("Bounding Box Detection Error:", error);
    return null;
  }
};

export const getMarketIntel = async (
  playerName: string,
  cardSpecifics: string,
  set: string,
  condition?: string,
  certNumber?: string
): Promise<MarketIntel | null> => {
  try {
    const psaUrl = certNumber ? `https://www.psacard.com/cert/${certNumber}/psa` : null;

    const prompt = `
Return VERIFIED MARKET INTEL as JSON only.

TARGET CARD:
- Player: ${playerName}
- Set: ${set}
- Parallel/Variant: ${cardSpecifics}
- Condition/Grade: ${condition || 'unknown'}
${certNumber ? `- PSA cert: ${certNumber} (verify against ${psaUrl})` : ''}

TASK:
1) Find 8–15 RECENT SOLD comps (last 90 days) for the *exact* card + grade.
2) Also find 6–12 ACTIVE listings for the exact card + grade.
3) Exclude: lots/multipacks, obvious mis-matches, damaged unless explicitly stated, reprints, "custom", "digital", “case hit lot”.
4) For each item: title, uri, soldDate (sold only), price, currency, shipping, grade (if stated), matchConfidence 0..1, source, flags.
5) Convert everything to GBP via a stated FX rate note (fxRateUsed). Keep original currency in the item too.

Output schema: { sold: [...], active: [...], notes, fxRateUsed }.
`;

    const response = await generateWithRetry({
      model: DEFAULT_MODEL,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        tools: [{ googleSearch: {} }, ...(psaUrl ? [{ urlContext: {} }] : [])]
      }
    });

    if (!response) return null;
    const result = JSON.parse(response.text || '{}');
    return {
      ...result,
      sources: response.candidates?.[0]?.groundingMetadata?.groundingChunks?.map((chunk: any) => ({
        title: chunk.web?.title || 'Market Intel',
        uri: chunk.web?.uri || '#'
      })) || []
    } as MarketIntel;
  } catch (error) {
    console.error("Market Intel Error:", error);
    return null;
  }
};

export const getMarketPrice = async (playerName: string, cardSpecifics: string, set: string, condition?: string, certNumber?: string): Promise<MarketPriceResult | null> => {
  try {
    const psaUrl = certNumber ? `https://www.psacard.com/cert/${certNumber}/psa` : null;
    const prompt = `Provide a STABLE Market Valuation for: ${playerName} ${cardSpecifics} (${set}) ${condition ? `in ${condition} condition` : ''}.
    ${certNumber ? `PSA Certification Number: ${certNumber}. Official PSA Cert Page: ${psaUrl}` : ''}
    Search only for RECENT VERIFIED SOLD items on eBay. Average the results and round to the nearest £5. Provide the value in GBP (£). 
    If a PSA certification is provided, verify the card details against the PSA registry to ensure accuracy.`;
    
    const response = await generateWithRetry({
      model: DEFAULT_MODEL, 
      contents: prompt,
      config: { 
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            price: { type: Type.NUMBER, description: "The estimated market value in GBP" },
            summary: { type: Type.STRING, description: "A brief summary of the market analysis" }
          },
          required: ["price", "summary"]
        },
        tools: [
          { googleSearch: {} },
          ...(psaUrl ? [{ urlContext: {} }] : [])
        ] 
      },
    });

    if (!response) return null;
    const result = JSON.parse(response.text || '{}');
    
    return {
      price: Math.round((result.price || 0) / 5) * 5,
      summary: result.summary || '',
      sources: response.candidates?.[0]?.groundingMetadata?.groundingChunks?.map((chunk: any) => ({
        title: chunk.web?.title || 'Market Intel',
        uri: chunk.web?.uri || '#'
      })) || []
    };
  } catch (error) {
    console.error("Market Intel Error:", error);
    return null;
  }
};
