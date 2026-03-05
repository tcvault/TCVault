// Shared image validation utilities for serverless API routes.

export const ALLOWED_IMAGE_MIMES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/heic",
  "image/heif",
]);

/**
 * Hostname patterns that must never be fetched (SSRF defence).
 * Covers loopback, RFC-1918 private ranges, link-local (cloud metadata endpoints),
 * and IPv6 equivalents.
 */
const BLOCKED_HOST_PATTERNS = [
  /^localhost$/i,
  /^127\./,                     // IPv4 loopback
  /^10\./,                      // RFC-1918 Class A private
  /^172\.(1[6-9]|2\d|3[01])\./, // RFC-1918 Class B private
  /^192\.168\./,                // RFC-1918 Class C private
  /^169\.254\./,                // Link-local / cloud metadata (AWS IMDSv1, GCP, Azure)
  /^0\.0\.0\.0$/,               // Wildcard
  /^::1$/,                      // IPv6 loopback
  /^fd[\da-f]{2}:/i,            // IPv6 ULA (Unique Local Address)
];

/**
 * Validates a user-supplied image URL for SSRF safety.
 * Returns an error message string on failure, or null if the URL is safe to fetch.
 */
export function validateImageUrl(raw: string): string | null {
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    return "Invalid image URL";
  }
  if (parsed.protocol !== "https:") {
    return "Only HTTPS image URLs are allowed";
  }
  if (BLOCKED_HOST_PATTERNS.some((re) => re.test(parsed.hostname))) {
    return "Image URL points to a blocked address";
  }
  return null;
}
