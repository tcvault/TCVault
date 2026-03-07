import { createClient } from "@supabase/supabase-js";

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

const localRateLimitStore = new Map<string, { count: number; reset: number }>();

type ApiRequest = {
  headers: Record<string, string | string[] | undefined>;
};

type ApiResponse = {
  status: (code: number) => ApiResponse;
  json: (body: unknown) => void;
};

function getAuthToken(req: ApiRequest): string | null {
  const authHeader = req.headers["authorization"];
  const authValue = Array.isArray(authHeader) ? authHeader[0] : authHeader;
  return authValue?.startsWith("Bearer ") ? authValue.slice(7) : null;
}

export async function requireAuth(
  req: ApiRequest,
  res: ApiResponse
): Promise<string | null> {
  const token = getAuthToken(req);

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

function consumeLocalRateLimit(key: string, maxPerMinute: number): boolean {
  const now = Date.now();

  for (const [entryKey, val] of localRateLimitStore) {
    if (now > val.reset) localRateLimitStore.delete(entryKey);
  }

  const entry = localRateLimitStore.get(key);
  if (!entry || now > entry.reset) {
    localRateLimitStore.set(key, { count: 1, reset: now + 60_000 });
    return true;
  }

  if (entry.count >= maxPerMinute) return false;

  entry.count += 1;
  return true;
}

function isMissingRateLimitRpc(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const e = error as { code?: string; message?: string; details?: string };
  const haystack = [e.code ?? "", e.message ?? "", e.details ?? ""]
    .join(" ")
    .toLowerCase();
  return haystack.includes("consume_rate_limit") || haystack.includes("does not exist");
}

export async function checkRateLimit(
  req: ApiRequest,
  userId: string,
  endpoint: string,
  res: ApiResponse,
  maxPerMinute = 20
): Promise<boolean> {
  if (!supabase) {
    res.status(500).json({ error: "Server misconfiguration" });
    return false;
  }

  const token = getAuthToken(req);
  if (!token) {
    res.status(401).json({ error: "Authentication required" });
    return false;
  }

  const limiterClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  });

  const key = `${userId}:${endpoint}`;
  const { data, error } = await limiterClient.rpc("consume_rate_limit", {
    p_key: key,
    p_window_seconds: 60,
    p_max: maxPerMinute,
  });

  if (error) {
    // Local development fallback when migrations are not yet applied.
    if (process.env.NODE_ENV !== "production" && isMissingRateLimitRpc(error)) {
      const allowed = consumeLocalRateLimit(key, maxPerMinute);
      if (!allowed) {
        res
          .status(429)
          .json({ error: "Rate limit exceeded. Please wait before trying again." });
      }
      return allowed;
    }

    console.error("[rate-limit] consume_rate_limit failed", error);
    res.status(500).json({ error: "Rate limiting unavailable. Run latest migrations." });
    return false;
  }

  if (data !== true) {
    res
      .status(429)
      .json({ error: "Rate limit exceeded. Please wait before trying again." });
    return false;
  }

  return true;
}
