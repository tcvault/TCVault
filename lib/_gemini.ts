import { GoogleGenAI } from "@google/genai";

let ai: GoogleGenAI | null = null;

export function getAi(): GoogleGenAI {
  if (!ai) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("GEMINI_API_KEY is not configured");
    ai = new GoogleGenAI({ apiKey });
  }
  return ai;
}

type RetryableErrorShape = {
  status?: unknown;
  message?: unknown;
  error?: { code?: unknown };
};

const getStatusCode = (error: unknown): number => {
  if (!error || typeof error !== "object") return 0;
  const shape = error as RetryableErrorShape;
  if (typeof shape.status === "number") return shape.status;
  if (typeof shape.error?.code === "number") return shape.error.code;
  return 0;
};

const includesStatusCode = (error: unknown, code: number): boolean => {
  if (!error || typeof error !== "object") return false;
  const shape = error as RetryableErrorShape;
  return typeof shape.message === "string" && shape.message.includes(String(code));
};

export async function generateWithRetry(params: unknown, retries = 2, delay = 1000) {
  const client = getAi();
  let lastError: unknown;
  for (let i = 0; i <= retries; i++) {
    try {
      return await client.models.generateContent(params as Parameters<typeof client.models.generateContent>[0]);
    } catch (error: unknown) {
      lastError = error;
      // Retry on 429 (rate-limit), 500 (Gemini server error), and 503 (overloaded)
      const statusCode = getStatusCode(error);
      const isRetryable =
        statusCode === 429 || statusCode === 500 || statusCode === 503 ||
        includesStatusCode(error, 429) || includesStatusCode(error, 500) || includesStatusCode(error, 503);
      if (isRetryable && i < retries) {
        await new Promise((resolve) => setTimeout(resolve, delay * (i + 1)));
        continue;
      }
      throw error;
    }
  }
  // All retries exhausted (only reachable after repeated 503s)
  throw lastError;
}

export const DEFAULT_MODEL = "gemini-2.0-flash";

export const UNIVERSAL_SOCCER_CARD_REGISTRY = `
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
