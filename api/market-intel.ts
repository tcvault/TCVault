import { getAi, generateWithRetry, DEFAULT_MODEL } from "./_gemini";

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { playerName, cardSpecifics, set, condition, certNumber } = req.body || {};
  if (!playerName || !cardSpecifics || !set) {
    return res.status(400).json({ error: 'playerName, cardSpecifics, and set are required' });
  }

  try {
    const ai = getAi();
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
3) Exclude: lots/multipacks, obvious mis-matches, damaged unless explicitly stated, reprints, "custom", "digital", "case hit lot".
4) For each item: title, uri, soldDate (sold only), price, currency, shipping, grade (if stated), matchConfidence 0..1, source, flags.
5) Convert everything to GBP via a stated FX rate note (fxRateUsed). Keep original currency in the item too.

Output schema: { sold: [...], active: [...], notes, fxRateUsed }.
`;

    const response = await generateWithRetry(ai, {
      model: DEFAULT_MODEL,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        tools: [
          { googleSearch: {} },
          ...(psaUrl ? [{ urlContext: {} }] : []),
        ],
      },
    });

    if (!response) return res.json(null);

    const result = JSON.parse(response.text || '{}');
    res.json({
      ...result,
      sources: response.candidates?.[0]?.groundingMetadata?.groundingChunks?.map((chunk: any) => ({
        title: chunk.web?.title || 'Market Intel',
        uri: chunk.web?.uri || '#',
      })) || [],
    });
  } catch (error: any) {
    const status = (error?.status === 429 || error?.error?.code === 429) ? 429 : 500;
    res.status(status).json({ error: error.message });
  }
}
