import { Type } from "@google/genai";
import { getAi, generateWithRetry, resolveImageToBase64, DEFAULT_MODEL } from "./_gemini.js";

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

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { images } = req.body || {};
  if (!images || !Array.isArray(images) || images.length === 0) {
    return res.status(400).json({ error: "images array is required" });
  }

  try {
    const ai = getAi();

    const imageParts = await Promise.all(
      images.map(async (img: string) => ({
        inlineData: {
          mimeType: "image/jpeg",
          data: await resolveImageToBase64(img),
        },
      })),
    );

    const response = await generateWithRetry(ai, {
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
            3. **Consistency Check**: Round the 'estimatedValue' to the nearest GBP 5.

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
            cardSpecifics: { type: Type.STRING },
            set: { type: Type.STRING },
            setNumber: { type: Type.STRING },
            condition: { type: Type.STRING },
            estimatedValue: { type: Type.NUMBER },
            description: { type: Type.STRING },
            serialNumber: { type: Type.STRING },
            certNumber: { type: Type.STRING },
            reasoning: { type: Type.STRING },
            rarityTier: { type: Type.STRING, enum: ["Base", "Parallel", "Chase", "1/1"] },
            checklistVerified: { type: Type.BOOLEAN },
          },
          required: ["playerName", "team", "cardSpecifics", "set", "estimatedValue"],
        },
      },
    });

    res.json(response ? JSON.parse(response.text || "{}") : null);
  } catch (error: any) {
    const status = error?.status === 429 || error?.error?.code === 429 ? 429 : 500;
    res.status(status).json({ error: error.message });
  }
}
