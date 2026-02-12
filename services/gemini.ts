
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
  rarityTier?: 'Base' | 'Parallel' | 'Chase' | '1/1';
  checklistVerified?: boolean;
}

export interface MarketPriceResult {
  price: number;
  sources: { title: string; uri: string }[];
  summary: string;
}

const UNIVERSAL_SOCCER_CARD_REGISTRY = `
UNIVERSAL SOCCER CARD HISTORICAL REGISTRY (Multi-Era):

1. PANINI SELECT 2024-25 (Critical Parallel Mapping):
   - /155: Orange Ice
   - /150: Camo
   - /140: Purple
   - /125: Bronze Checker / Green Fluorescent
   - /99: Pink
   - /88: Red Wave
   - /85: WHITE ICE (Verified Checklist Match)
   - /75: Orange
   - /49: Winter Camo
   - /48: Jade Dragon Scale
   - /25: Tie-Dye
   - /20: White
   - /15: Tessellation
   - /13: Pink Wave
   - /10: Gold / Gold Ice / Gold Mojo / Gold Wave
   - /5: Green
   - 1/1: Black / Black Finite

2. PANINI PRIZM (Global Standard):
   - Parallels: Silver, Hyper, Mojo, Red, Blue.
   - Numbered: /199 (Blue), /149 (Red), /99 (Blue Ice), /75 (Purple), /25 (Mojo), /10 (Gold), /1 (Black).
   - Case Hits: Color Blast, Manga, Stained Glass.

3. TOPPS CHROME UEFA (Historical & Modern):
   - Refractor, Speckle, Pink, Negative, RayWave.
   - Numbered: /250 (Aqua), /150 (Blue), /99 (Green), /75 (Yellow), /50 (Gold), /25 (Orange), /10 (Red), /5 (Frozen).
   - Case Hits: Helix, Radiance, The Grail.

4. TOPPS MERLIN UEFA:
   - Renaissance (Case Hit), Sword, Sorcery.
   - Numbered: /99 (Green), /75 (Rose Gold), /50 (Gold), /20 (Matcha), /5 (Red).

5. VISUAL HEURISTICS:
   - "Ice" = Geometric/Glass Shards.
   - "Wave" = Sinuous undulating lines.
   - "Mojo" = Concentric circular spirals.
   - "Checkerboard" = Rectangular grid pattern.
`;

/**
 * High-precision identification for the Global Soccer Archive across all eras.
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
            text: `Act as a Senior Soccer Card Historian and Registry Expert.
            Master Registry Reference: ${UNIVERSAL_SOCCER_CARD_REGISTRY}

            CRITICAL PROTOCOL:
            1. **Serial Number Primacy**: If a serial number is detected (e.g., 12/85), the variant name MUST match the registry mapping (e.g., /85 = White Ice).
            2. **Determine Era & Year**: Identify the specific season (2024-25, 2017-18, etc.) via copyright or design.
            3. **Identify Brand**: Panini (Select, Prizm, Donruss) vs Topps (Chrome, Merlin, Finest).
            4. **Visual Texture Mapping**: Use texture (Ice, Mojo, Wave) only when serial numbers are not present or to confirm the specific parallel type.
            5. **Case Hits**: Flag Renaissance, Kaboom, Color Blast, or Helix immediately as 'Chase'.

            Output JSON. If a precise checklist match is found (especially for serial-numbered cards), set checklistVerified to true.`,
          },
        ],
      },
      config: {
        thinkingConfig: { thinkingBudget: 16384 },
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            playerName: { type: Type.STRING },
            cardSpecifics: { type: Type.STRING, description: "Detailed Parallel Name and Year (e.g. '2024-25 White Ice /85')" },
            set: { type: Type.STRING, description: "Full Set Name (e.g. '2024-25 Panini Select Premier League')" },
            setNumber: { type: Type.STRING },
            condition: { type: Type.STRING },
            estimatedValue: { type: Type.NUMBER },
            description: { type: Type.STRING },
            serialNumber: { type: Type.STRING },
            reasoning: { type: Type.STRING, description: "Logic path, citing serial number if found" },
            rarityTier: { type: Type.STRING, enum: ['Base', 'Parallel', 'Chase', '1/1'] },
            checklistVerified: { type: Type.BOOLEAN }
          },
          required: ["playerName", "cardSpecifics", "set", "estimatedValue"],
        },
      },
    });

    return JSON.parse(response.text || '{}') as IdentifiedCard;
  } catch (error: any) {
    if (error?.message?.includes('429')) throw new Error("QUOTA_EXHAUSTED");
    console.error("Identification Error:", error);
    return null;
  }
};

export const getMarketPrice = async (playerName: string, cardSpecifics: string, set: string): Promise<MarketPriceResult | null> => {
  try {
    const prompt = `Synthesize Market Valuation for: ${playerName} ${cardSpecifics} (${set}).
    Reference recent auction data from eBay (Sold), Goldin, and 130point.
    Look specifically for the most recent sales of this exact parallel variant.
    Provide average GBP (£) price and a concise summary.`;
    
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview', 
      contents: prompt,
      config: { tools: [{ googleSearch: {} }] },
    });

    const priceMatch = response.text.match(/[£](\d+(\.\d{2})?)/) || response.text.match(/(\d+(\.\d{2})?)\s?GBP/);
    return {
      price: priceMatch ? parseFloat(priceMatch[1]) : 0,
      summary: response.text,
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
