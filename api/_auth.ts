import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.VITE_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY!;

// ---------------------------------------------------------------------------
// In-memory rate limiting (per authenticated user, single instance only).
// For multi-instance production deployments replace this with Redis / Upstash.
// ---------------------------------------------------------------------------
const rateLimitStore = new Map<string, { count: number; reset: number }>();

/**
 * Verifies the Bearer JWT in the Authorization header against Supabase auth.
 * Returns the authenticated user's ID on success.
 * Writes a 401/500 response and returns null on failure — the caller must
 * return immediately when null is received.
 */
export async function requireAuth(
  req: any,
  res: any
): Promise<string | null> {
  const authHeader = req.headers["authorization"] as string | undefined;
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!token) {
    res.status(401).json({ error: "Authentication required" });
    return null;
  }

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error("[auth] Missing Supabase env vars in API route");
    res.status(500).json({ error: "Server misconfiguration" });
    return null;
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token);

  if (error || !user) {
    res.status(401).json({ error: "Invalid or expired token" });
    return null;
  }

  return user.id;
}

/**
 * Checks whether the given user has exceeded the per-minute request cap.
 * Writes a 429 response and returns false when the limit is exceeded.
 */
export function checkRateLimit(
  userId: string,
  res: any,
  maxPerMinute = 20
): boolean {
  const now = Date.now();
  const entry = rateLimitStore.get(userId);

  if (!entry || now > entry.reset) {
    rateLimitStore.set(userId, { count: 1, reset: now + 60_000 });
    return true;
  }

  if (entry.count >= maxPerMinute) {
    res
      .status(429)
      .json({ error: "Rate limit exceeded. Please wait before trying again." });
    return false;
  }

  entry.count += 1;
  return true;
}
