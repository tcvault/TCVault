import { createClient } from "@supabase/supabase-js";

// Resolve Supabase credentials from any of the naming conventions in use:
//  - SUPABASE_URL / SUPABASE_ANON_KEY          → Vercel Supabase integration
//  - VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY → manual .env.local / Vite
//  - NEXT_PUBLIC_SUPABASE_URL / ...             → legacy Next.js convention
const SUPABASE_URL =
  process.env.SUPABASE_URL ||
  process.env.VITE_SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  "";
const SUPABASE_ANON_KEY =
  process.env.SUPABASE_ANON_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "";

// ---------------------------------------------------------------------------
// Supabase client singleton — one instance per function cold start.
// ---------------------------------------------------------------------------
const supabase =
  SUPABASE_URL && SUPABASE_ANON_KEY
    ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    : null;

// ---------------------------------------------------------------------------
// In-memory rate limiting (per authenticated user + endpoint, single instance).
// Key format: "<userId>:<endpoint>" — prevents cross-endpoint counter bleed.
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

  if (!supabase) {
    console.error("[auth] Missing Supabase env vars in API route");
    res.status(500).json({ error: "Server misconfiguration" });
    return null;
  }

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
 * Checks whether the given user has exceeded the per-minute request cap for
 * the named endpoint. Each endpoint has its own independent counter.
 * Writes a 429 response and returns false when the limit is exceeded.
 * Evicts expired entries on each call to prevent unbounded Map growth.
 */
export function checkRateLimit(
  userId: string,
  endpoint: string,
  res: any,
  maxPerMinute = 20
): boolean {
  const now = Date.now();

  // Evict all expired entries to prevent memory leak.
  for (const [key, val] of rateLimitStore) {
    if (now > val.reset) rateLimitStore.delete(key);
  }

  const key = `${userId}:${endpoint}`;
  const entry = rateLimitStore.get(key);

  if (!entry || now > entry.reset) {
    rateLimitStore.set(key, { count: 1, reset: now + 60_000 });
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
