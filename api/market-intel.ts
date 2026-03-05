import { generateWithRetry, DEFAULT_MODEL } from "../lib/_gemini";
import { MarketIntelSchema, parseGeminiJson } from "../lib/_schemas";
import { requireAuth, checkRateLimit } from "../lib/_auth";

/** Strip control characters and common prompt-injection patterns. */
function sanitizeInput(value: string, maxLen: number): string {
  return value
    .replace(/[\x00-\x1f\x7f]/g, "")   // strip control characters
    .replace(/\$\{[^}]*\}/g, "")        // strip template literal expressions
    .replace(/```/g, "'''")             // defuse code fences
    .trim()
    .slice(0, maxLen);
}

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Authentication — must come before any expensive work
  const userId = await requireAuth(req, res);
  if (!userId) return;

  // Per-user rate limit: 10 market-intel calls / minute (more expensive)
  if (!checkRateLimit(userId, "market-intel", res, 10)) return;

  const raw = req.body as {
    playerName: unknown;
    cardSpecifics: unknown;
    set: unknown;
    condition?: unknown;
    certNumber?: unknown;
  };

  if (
    typeof raw.playerName !== "string" ||
    typeof raw.cardSpecifics !== "string" ||
    typeof raw.set !== "string"
  ) {
    return res.status(400).json({ error: "playerName, cardSpecifics, and set are required strings" });
  }

  // Validate certNumber format (digits only, 6–12 chars) to prevent injection
  if (raw.certNumber !== undefined && raw.certNumber !== null) {
    if (typeof raw.certNumber !== "string" || !/^\d{6,12}$/.test(raw.certNumber)) {
      return res.status(400).json({ error: "Invalid certNumber format" });
    }
  }

  // Sanitize all user-supplied strings before inserting into the prompt
  const playerName   = sanitizeInput(raw.playerName,   100);
  const cardSpecifics = sanitizeInput(raw.cardSpecifics, 200);
  const set          = sanitizeInput(raw.set,           200);
  const condition    = raw.condition   ? sanitizeInput(String(raw.condition),   100) : undefined;
  const certNumber   = raw.certNumber  ? String(raw.certNumber) : undefined;

  if (!playerName || !cardSpecifics || !set) {
    return res.status(400).json({ error: "playerName, cardSpecifics, and set cannot be empty" });
  }

  try {
    const psaUrl = certNumber ? `https://www.psacard.com/cert/${certNumber}/psa` : null;

    const prompt = `
Return VERIFIED MARKET INTEL as JSON only.

TARGET CARD:
- Player: ${playerName}
- Set: ${set}
- Parallel/Variant: ${cardSpecifics}
- Condition/Grade: ${condition || "unknown"}
${certNumber ? `- PSA cert: ${certNumber} (verify against ${psaUrl})` : ""}

TASK:
1) Find 8–15 RECENT SOLD comps (last 90 days) for the *exact* card + grade.
2) Also find 6–12 ACTIVE listings for the exact card + grade.
3) Exclude: lots/multipacks, obvious mis-matches, damaged unless explicitly stated, reprints, "custom", "digital", "case hit lot".
4) For each item: title, uri, soldDate (sold only), price, currency, shipping, grade (if stated), matchConfidence 0..1, source, flags.
5) Convert everything to GBP via a stated FX rate note (fxRateUsed). Keep original currency in the item too.

Output schema: { sold: [...], active: [...], notes, fxRateUsed }.
`;

    const response = await generateWithRetry({
      model: DEFAULT_MODEL,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        tools: [{ googleSearch: {} }, ...(psaUrl ? [{ urlContext: {} }] : [])],
      },
    });

    if (!response) return res.status(500).json({ error: "Market intel request failed" });

    const result = parseGeminiJson(response.text || "{}", MarketIntelSchema);
    res.json({
      ...result,
      sources:
        response.candidates?.[0]?.groundingMetadata?.groundingChunks?.map((chunk: any) => ({
          title: chunk.web?.title || "Market Intel",
          uri: chunk.web?.uri || "#",
        })) || [],
    });
  } catch (error: any) {
    console.error("Market intel error:", error);
    res.status(500).json({ error: "Market intel request failed" });
  }
}
