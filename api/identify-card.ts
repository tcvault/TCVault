import { Type } from "@google/genai";
import { generateWithRetry, DEFAULT_MODEL, UNIVERSAL_SOCCER_CARD_REGISTRY } from "../lib/_gemini";
import { IdentifiedCardSchema, parseGeminiJson } from "../lib/_schemas";
import { requireAuth, checkRateLimit } from "../lib/_auth";

const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // 10 MB raw ≈ 13.3 MB as base64
const MAX_IMAGES = 3;

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Authentication — must come before any expensive work
  const userId = await requireAuth(req, res);
  if (!userId) return;

  // Per-user rate limit: 20 identify calls / minute
  if (!checkRateLimit(userId, res, 20)) return;

  const { images } = req.body as { images: unknown };

  if (!Array.isArray(images) || images.length === 0) {
    return res.status(400).json({ error: "images array is required" });
  }
  if (images.length > MAX_IMAGES) {
    return res.status(400).json({ error: `Maximum ${MAX_IMAGES} images allowed` });
  }

  // Validate each image entry
  for (const img of images) {
    if (typeof img !== "string") {
      return res.status(400).json({ error: "Each image must be a string" });
    }
    if (!img.startsWith("http") && !img.startsWith("data:")) {
      return res.status(400).json({ error: "Images must be URLs or data URIs" });
    }
    // Approximate raw byte size: base64 chars × 3/4
    if (img.startsWith("data:") && img.length > MAX_IMAGE_BYTES * (4 / 3)) {
      return res.status(400).json({ error: "Image too large. Maximum 10 MB per image." });
    }
  }

  try {
    const imageParts = await Promise.all(
      (images as string[]).map(async (img: string) => {
        let base64Data = img;
        if (img.startsWith("http")) {
          try {
            const fetchRes = await fetch(img);
            const contentType = fetchRes.headers.get("content-type") || "image/jpeg";
            const detectedMime = contentType.split(";")[0].trim();
            const buffer = await fetchRes.arrayBuffer();
            base64Data = `data:${detectedMime};base64,${Buffer.from(buffer).toString("base64")}`;
          } catch {
            // keep original if fetch fails
          }
        }
        // Extract actual MIME type from data URI
        const mimeMatch = base64Data.match(/^data:([^;]+);base64,/);
        const imageMimeType = (mimeMatch?.[1] ?? "image/jpeg") as string;
        return {
          inlineData: {
            mimeType: imageMimeType,
            data: base64Data.split(",")[1] || base64Data,
          },
        };
      })
    );

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
            rarityTier: { type: Type.STRING, enum: ["Base", "Parallel", "Chase", "1/1"] },
            checklistVerified: { type: Type.BOOLEAN },
          },
          required: ["playerName", "team", "cardSpecifics", "set", "estimatedValue"],
        },
      },
    });

    if (!response) return res.status(500).json({ error: "No response from Gemini" });
    res.json(parseGeminiJson(response.text || "{}", IdentifiedCardSchema));
  } catch (error: any) {
    console.error("Identify card error:", error);
    res.status(500).json({ error: error.message || "Identification failed" });
  }
}
