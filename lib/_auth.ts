import { createClient } from "@supabase/supabase-js";

// Resolve Supabase credentials from known naming conventions:
//  - SUPABASE_URL / SUPABASE_ANON_KEY
//  - VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY
//  - NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY
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

const supabase =
  SUPABASE_URL && SUPABASE_ANON_KEY
    ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    : null;

const rateLimitStore = new Map<string, { count: number; reset: number }>();

type ApiRequest = {
  headers: Record<string, string | string[] | undefined>;
};

type ApiResponse = {
  status: (code: number) => ApiResponse;
  json: (body: unknown) => void;
};

export async function requireAuth(
  req: ApiRequest,
  res: ApiResponse
): Promise<string | null> {
  const authHeader = req.headers["authorization"];
  const authValue = Array.isArray(authHeader) ? authHeader[0] : authHeader;
  const token = authValue?.startsWith("Bearer ") ? authValue.slice(7) : null;

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

export function checkRateLimit(
  userId: string,
  endpoint: string,
  res: ApiResponse,
  maxPerMinute = 20
): boolean {
  const now = Date.now();

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
