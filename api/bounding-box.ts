import { Type } from "@google/genai";
import { generateWithRetry, DEFAULT_MODEL } from "../lib/_gemini";
import { BoundingBoxSchema, parseGeminiJson } from "../lib/_schemas";
import { requireAuth, checkRateLimit } from "../lib/_auth";

const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // 10 MB raw ≈ 13.3 MB as base64

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Authentication — must come before any expensive work
  const userId = await requireAuth(req, res);
  if (!userId) return;

  // Per-user rate limit: 30 bounding-box calls / minute
  if (!checkRateLimit(userId, "bounding-box", res, 30)) return;

  const { imageData } = req.body as { imageData: unknown };

  if (!imageData || typeof imageData !== "string") {
    return res.status(400).json({ error: "imageData string is required" });
  }
  if (!imageData.startsWith("http") && !imageData.startsWith("data:")) {
    return res.status(400).json({ error: "imageData must be a URL or data URI" });
  }
  if (imageData.startsWith("data:") && imageData.length > MAX_IMAGE_BYTES * (4 / 3)) {
    return res.status(400).json({ error: "Image too large. Maximum 10 MB." });
  }

  try {
    let base64Data = imageData;
    if (imageData.startsWith("http")) {
      try {
        const fetchRes = await fetch(imageData);
        const contentType = fetchRes.headers.get("content-type") || "image/jpeg";
        const detectedMime = contentType.split(";")[0].trim();
        const buffer = await fetchRes.arrayBuffer();
        base64Data = `data:${detectedMime};base64,${Buffer.from(buffer).toString("base64")}`;
      } catch {
        // keep original if fetch fails
      }
    }

    // Extract actual MIME type from data URI (supports jpeg, png, webp, gif, heic)
    const mimeMatch = base64Data.match(/^data:([^;]+);base64,/);
    const imageMimeType = (mimeMatch?.[1] ?? "image/jpeg") as string;

    const response = await generateWithRetry({
      model: DEFAULT_MODEL,
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: imageMimeType,
              data: base64Data.split(",")[1] || base64Data,
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

    if (!response) return res.status(500).json({ error: "No response from Gemini" });
    res.json(parseGeminiJson(response.text || "{}", BoundingBoxSchema));
  } catch (error: any) {
    console.error("Bounding box error:", error);
    res.status(500).json({ error: error.message || "Bounding box detection failed" });
  }
}
