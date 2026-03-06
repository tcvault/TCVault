import { Type } from "@google/genai";
import { generateWithRetry, DEFAULT_MODEL, UNIVERSAL_SOCCER_CARD_REGISTRY } from "../lib/_gemini";
import { IdentifiedCardSchema, parseGeminiJson } from "../lib/_schemas";
import { requireAuth, checkRateLimit } from "../lib/_auth";
import { validateImageUrl, ALLOWED_IMAGE_MIMES } from "../lib/_validate";

const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // 10 MB
const MAX_IMAGES = 3;

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Authentication — must come before any expensive work
  const userId = await requireAuth(req, res);
  if (!userId) return;

  // Per-user rate limit: 20 identify calls / minute
  if (!checkRateLimit(userId, "identify-card", res, 20)) return;

  const { images } = req.body as { images: unknown };

  if (!Array.isArray(images) || images.length === 0) {
    return res.status(400).json({ error: "images array is required" });
  }
  if (images.length > MAX_IMAGES) {
    return res.status(400).json({ error: `Maximum ${MAX_IMAGES} images allowed` });
  }

  // Validate each image entry — all validation before fetching anything
  for (const img of images) {
    if (typeof img !== "string") {
      return res.status(400).json({ error: "Each image must be a string" });
    }
    if (!img.startsWith("http") && !img.startsWith("data:")) {
      return res.status(400).json({ error: "Images must be URLs or data URIs" });
    }
    if (img.startsWith("data:") && img.length > MAX_IMAGE_BYTES * (4 / 3)) {
      return res.status(400).json({ error: "Image too large. Maximum 10 MB per image." });
    }
    // SSRF: validate URL before fetching
    if (img.startsWith("http")) {
      const urlError = validateImageUrl(img);
      if (urlError) return res.status(400).json({ error: urlError });
    }
  }

  try {
    const imageParts = await Promise.all(
      (images as string[]).map(async (img: string) => {
        let base64Data = img;
        let imageMimeType = "image/jpeg";

        if (img.startsWith("http")) {
          const fetchRes = await fetch(img, { signal: AbortSignal.timeout(15_000) });
          const contentType = fetchRes.headers.get("content-type") || "image/jpeg";
          const detectedMime = contentType.split(";")[0].trim();

          // Enforce size limit for remote images before reading into memory
          const contentLength = fetchRes.headers.get("content-length");
          if (contentLength && parseInt(contentLength, 10) > MAX_IMAGE_BYTES) {
            throw Object.assign(new Error("Remote image exceeds 10 MB size limit"), { status: 400 });
          }
          const buffer = await fetchRes.arrayBuffer();
          if (buffer.byteLength > MAX_IMAGE_BYTES) {
            throw Object.assign(new Error("Remote image exceeds 10 MB size limit"), { status: 400 });
          }

          imageMimeType = detectedMime;
          base64Data = `data:${detectedMime};base64,${Buffer.from(buffer).toString("base64")}`;
        } else {
          // Extract MIME type from data URI
          const mimeMatch = base64Data.match(/^data:([^;]+);base64,/);
          imageMimeType = mimeMatch?.[1] ?? "image/jpeg";
        }

        // Enforce MIME type allowlist before sending to Gemini
        if (!ALLOWED_IMAGE_MIMES.has(imageMimeType)) {
          throw Object.assign(
            new Error("Unsupported image format. Allowed: JPEG, PNG, WebP, GIF, HEIC."),
            { status: 400 }
          );
        }

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
            text: `Act as a Senior Trading Card Historian and Authenticator.
            You identify Sports, TCG, and Non-Sports trading cards.
            Master Registry (Sports baseline): ${UNIVERSAL_SOCCER_CARD_REGISTRY}

            IDENTIFICATION PROTOCOL:
            1. **Visual Analysis**: Examine logos (Panini, Topps, Donruss, Optic, Upper Deck), year, player, and sport.
            2. **Domain Detection**: Identify the category first: Sports, TCG, or Non-Sports.
               - Sports examples: Soccer, Formula 1, Basketball, Baseball, Hockey, American Football.
               - TCG examples: Pokémon, Magic: The Gathering, Yu-Gi-Oh!, One Piece, Lorcana.
               - Non-Sports examples: Marvel, Star Wars, entertainment franchises.
            3. **Sport Detection**: If and only if category is Sports, identify sport from logos, imagery, and branding.
            4. **Parallel/Variant Detection**: Check for refractors, patterns (Mojo, Wave, Ice), foil treatments, rarity markers, and variant text.
            5. **Donruss Specifics**: For Donruss 2023-24, distinguish between standard Donruss and "Optic" versions. Check for "Press Proof" text.
            6. **Serial Number**: If a number like "XX/YY" is visible, use it to confirm the parallel type.
            7. **Grading Detection**: Check if the card is in a graded slab (PSA, BGS, SGC, CGC). If so, identify the grading company and the numeric grade (e.g., "PSA 10", "BGS 9.5"). Populate the 'condition' field with this information. If not graded, use 'Ungraded' or a descriptive condition like 'Near Mint'.
            8. **Certification Number**: ONLY if the card is identified as a PSA graded slab, look for the unique PSA certification number (usually 8-10 digits). Populate the 'certNumber' field. If the card is BGS, SGC, CGC or Ungraded, do NOT populate the 'certNumber' field.

            VALUATION PROTOCOL:
            1. **Valuation Anchor**: Identify the 3 most common RECENT SOLD prices for this exact parallel and grade.
            2. **Calculate Mean**: Calculate the Volume-Weighted Mean of these 3 prices.
            3. **Consistency Check**: Round the 'estimatedValue' to the nearest £5.

            9. **Structured Set Fields**: Always extract setYearStart (e.g. 2023), setYearEnd (e.g. 2024), manufacturer (e.g. "Topps"), productLine (e.g. "Chrome Legends"), category (Sports | TCG | Non-Sports), and sport (Sports only; otherwise empty) as separate structured fields. Rate setConfidence and yearConfidence from 0 to 1 based on how certain you are.

            Output JSON. Be extremely precise with the 'set' name (e.g., "2022 Topps Chrome Formula 1 Legends" or "2023-24 Panini Donruss Soccer").`,
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
            setYearStart:    { type: Type.NUMBER, description: "Season start year (e.g. 2023 for '2023-24')" },
            setYearEnd:      { type: Type.NUMBER, description: "Season end year; same as start for single-year sets" },
            manufacturer:    { type: Type.STRING, description: "Card manufacturer: Panini, Topps, Upper Deck, etc." },
            productLine:     { type: Type.STRING, description: "Product line: Donruss, Prizm, Chrome, Select, Optic, etc." },
            setConfidence:   { type: Type.NUMBER, description: "Set identification confidence 0-1" },
            yearConfidence:  { type: Type.NUMBER, description: "Year identification confidence 0-1" },
            sport:           { type: Type.STRING, description: "Sport: Soccer, Formula 1, Basketball, Baseball, Hockey, American Football, etc." },
            category:        { type: Type.STRING, enum: ["Sports", "TCG", "Non-Sports"], description: "High-level card category" },
          },
          required: ["playerName", "team", "cardSpecifics", "set", "estimatedValue"],
        },
      },
    });

    if (!response) return res.status(500).json({ error: "Identification failed" });
    res.json(parseGeminiJson(response.text || "{}", IdentifiedCardSchema));
  } catch (error: any) {
    console.error("Identify card error:", error);
    if (error?.status === 400) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: "Identification failed" });
  }
}
