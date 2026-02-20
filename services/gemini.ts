
import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || process.env.API_KEY });

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
  reasoning?: string;
  rarityTier?: 'Base' | 'Parallel' | 'Chase' | '1/1';
  checklistVerified?: boolean;
}

export interface MarketPriceResult {
  price: number;
  sources: { title: string; uri: string }[];
  summary: string;
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
          // If fetch fails, we might still try to send the URL but it will likely fail Gemini API
        }
      }

      return {
        inlineData: {
          mimeType: 'image/jpeg',
          data: base64Data.split(',')[1] || base64Data,
        },
      };
    }));

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [
          ...imageParts,
          {
            text: `Act as a Senior Soccer Card Historian. 
            Master Registry: ${UNIVERSAL_SOCCER_CARD_REGISTRY}

            DETERMINISTIC VALUATION PROTOCOL:
            1. **Valuation Anchor**: Identify the 3 most common RECENT SOLD prices for this exact parallel and grade. 
            2. **Calculate Mean**: Calculate the Volume-Weighted Mean of these 3 prices.
            3. **Consistency Check**: Round the 'estimatedValue' to the nearest £5. This ensures that uploading the same card results in a stable, consistent price.
            4. **Parallel Accuracy**: If a serial number is visible (e.g., 20/75), you MUST identify the parallel using the Registry Mapping (e.g., Blue Ice /75).
            5. **Set Identification**: Identify the specific year and product release.

            Output JSON. The 'estimatedValue' must be a stable number based on grounded historical sales.`,
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
            cardSpecifics: { type: Type.STRING },
            set: { type: Type.STRING },
            setNumber: { type: Type.STRING },
            condition: { type: Type.STRING },
            estimatedValue: { type: Type.NUMBER },
            description: { type: Type.STRING },
            serialNumber: { type: Type.STRING },
            reasoning: { type: Type.STRING },
            rarityTier: { type: Type.STRING, enum: ['Base', 'Parallel', 'Chase', '1/1'] },
            checklistVerified: { type: Type.BOOLEAN }
          },
          required: ["playerName", "team", "cardSpecifics", "set", "estimatedValue"],
        },
      },
    });

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

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: 'image/jpeg',
              data: base64Data.split(',')[1] || base64Data,
            },
          },
          {
            text: "Detect the main trading card in this image and provide its bounding box as normalized coordinates [ymin, xmin, ymax, xmax] in the range 0-1000.",
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

    return JSON.parse(response.text || '{}') as BoundingBox;
  } catch (error) {
    console.error("Bounding Box Detection Error:", error);
    return null;
  }
};

export const getMarketPrice = async (playerName: string, cardSpecifics: string, set: string): Promise<MarketPriceResult | null> => {
  try {
    const prompt = `Provide a STABLE Market Valuation for: ${playerName} ${cardSpecifics} (${set}).
    Search only for RECENT VERIFIED SOLD items on eBay. Average the results and round to the nearest £5. Provide the value in GBP (£).`;
    
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview', 
      contents: prompt,
      config: { tools: [{ googleSearch: {} }] },
    });

    const responseText = response.text || '';
    const priceMatch = responseText.match(/[£](\d+(\.\d{2})?)/) || responseText.match(/(\d+(\.\d{2})?)\s?GBP/);
    
    return {
      price: priceMatch ? Math.round(parseFloat(priceMatch[1]) / 5) * 5 : 0,
      summary: responseText,
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
