# TC Vault — Build & Deployment Guide

> **Last updated:** March 2026
> **Stack:** Vite + React (frontend) · Vercel Serverless Functions (backend) · Supabase (auth + database) · Google Gemini API (AI)

---

## Table of Contents

1. [Project Structure](#1-project-structure)
2. [Environment Variables](#2-environment-variables)
3. [Local Development](#3-local-development)
4. [Production Deployment](#4-production-deployment)
5. [Architecture Decisions & Change Log](#5-architecture-decisions--change-log)
6. [Troubleshooting](#6-troubleshooting)

---

## 1. Project Structure

```
TCVault/
├── api/                        # Vercel Serverless Functions (backend)
│   ├── tsconfig.json           # ⚠️ API-specific TypeScript config (CommonJS)
│   ├── bounding-box.ts         # POST /api/bounding-box
│   ├── identify-card.ts        # POST /api/identify-card
│   └── market-intel.ts         # POST /api/market-intel
│
├── lib/                        # Shared server-side utilities
│   ├── _auth.ts                # JWT auth middleware + in-memory rate limiter
│   ├── _gemini.ts              # GoogleGenAI client + generateWithRetry()
│   └── _schemas.ts             # Zod schemas for all Gemini responses
│
├── src/ (or root components)   # Vite + React frontend
├── dist/                       # Frontend build output (git-ignored)
│
├── vercel.json                 # Security headers + SPA rewrite rules
├── tsconfig.json               # Root TypeScript config (frontend only, noEmit)
├── package.json                # No "type":"module" — required for CJS functions
└── .vercel/                    # Vercel project link (git-ignored)
```

### Key Structural Rule

**`api/` files are Vercel function entry points.** Vercel's `@vercel/node` builder only compiles files in `api/` that do **not** start with `_`. Shared utilities must live in `lib/` (project root), not in `api/`.

| Location | Purpose | Compiled by |
|----------|---------|-------------|
| `api/bounding-box.ts` | HTTP handler | `@vercel/node` → CJS bundle |
| `api/identify-card.ts` | HTTP handler | `@vercel/node` → CJS bundle |
| `api/market-intel.ts` | HTTP handler | `@vercel/node` → CJS bundle |
| `lib/_auth.ts` | Shared helper | Included in each function bundle |
| `lib/_gemini.ts` | Shared helper | Included in each function bundle |
| `lib/_schemas.ts` | Shared helper | Included in each function bundle |

---

## 2. Environment Variables

### Required Variables

All three variables must be set in **every environment** (production + development) that runs the serverless functions.

| Variable | Where to get it | Used by |
|----------|----------------|---------|
| `GEMINI_API_KEY` | [Google AI Studio](https://aistudio.google.com/app/apikey) | `lib/_gemini.ts` |
| `SUPABASE_URL` | Supabase dashboard → Project Settings → API | `lib/_auth.ts` |
| `SUPABASE_ANON_KEY` | Supabase dashboard → Project Settings → API → `anon public` | `lib/_auth.ts` |

### Naming Convention Fallbacks

`lib/_auth.ts` resolves Supabase credentials from **any** of three naming conventions (checked in order):

```
SUPABASE_URL           ← set by Vercel's Supabase marketplace integration
VITE_SUPABASE_URL      ← set manually for Vite build exposure
NEXT_PUBLIC_SUPABASE_URL ← legacy / carried over from earlier setup
```

The same fallback chain applies to `SUPABASE_ANON_KEY`. You only need **one** of each to be set.

### Setting Variables on Vercel

```bash
# Production + Development environments
vercel env add GEMINI_API_KEY
vercel env add VITE_SUPABASE_URL
vercel env add VITE_SUPABASE_ANON_KEY
```

Or via the Vercel dashboard: **Project → Settings → Environment Variables**.

### Local `.env.local`

Create `.env.local` in the project root (git-ignored):

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
GEMINI_API_KEY=your-gemini-key
```

---

## 3. Local Development

### Prerequisites

```bash
npm install -g vercel          # Vercel CLI (required for API routes locally)
```

### Starting the Dev Server

Local development uses `vercel dev`, not `npm run dev`. This is because Vite's dev server (`npm run dev`) does not serve the `api/` serverless functions — it only handles the React frontend. `vercel dev` runs both simultaneously.

```bash
vercel dev --yes --listen 3000
```

Or if you have a Vercel auth token:

```bash
vercel dev --token YOUR_VERCEL_TOKEN --yes --listen 3000
```

The server starts at **http://localhost:3000**.

> **Note:** On the first run, `vercel dev` may ask you to link the project. Select the existing `tcvault-8067s-projects/tc-vault` project.

### Frontend Only (no API)

If you only need the React UI without the serverless functions:

```bash
npm run dev        # Vite only, port 3000 — /api/* routes will 404
```

### Building Locally

```bash
npm run build      # Runs: tsc && vite build
                   # tsc: type-checks frontend code only (noEmit: true)
                   # vite build: bundles frontend to dist/
```

To test the full Vercel build output locally:

```bash
vercel build       # Compiles frontend + all API functions
                   # Output: .vercel/output/
```

Inspect compiled function output at `.vercel/output/functions/api/<name>.func/`.

---

## 4. Production Deployment

### Automatic Deployment (recommended)

Every push to `main` on GitHub triggers an automatic production deployment:

```bash
git add .
git commit -m "your message"
git push origin main
```

Vercel picks up the push, builds, and deploys in ~30–40 seconds. Check status at [vercel.com](https://vercel.com) or:

```bash
vercel ls          # List recent deployments and their status
```

### Manual Production Deploy

```bash
vercel --prod --yes
```

### Force Clean Deploy (no build cache)

Use this when a deployment is serving stale compiled code despite source changes:

```bash
vercel --force --yes        # Deploys to preview (no cache)
vercel --prod --yes         # Promotes to production
```

### Promoting a Preview to Production

```bash
vercel --prod
```

Or promote a specific deployment URL:

```bash
vercel promote <deployment-url>
```

### Verifying a Deployment

After deployment, confirm the API is up and rejecting unauthenticated requests (expected: HTTP 401):

```bash
curl -s -o - -w "\n[status: %{http_code}]" \
  -X POST https://tc-vault-three.vercel.app/api/bounding-box \
  -H "Content-Type: application/json" \
  -d '{"imageData":"data:image/jpeg;base64,test"}'
# Expected: {"error":"Authentication required"} [status: 401]
```

---

## 5. Architecture Decisions & Change Log

This section documents significant architectural decisions made during the build, with the reasoning, so future maintainers understand the "why."

---

### Change 1 — Moved shared helpers from `api/_*.ts` to `lib/`

**Commit:** `fix: move shared API helpers from api/_* to lib/`

**Problem:** Vercel's `@vercel/node` builder silently skips any file prefixed with `_` inside the `api/` directory. These files are treated as "private" and never compiled or deployed. At runtime, `require('./api/_gemini')` would produce `ERR_MODULE_NOT_FOUND`.

**Files moved:**
- `api/_auth.ts` → `lib/_auth.ts`
- `api/_gemini.ts` → `lib/_gemini.ts`
- `api/_schemas.ts` → `lib/_schemas.ts`

**Imports updated in all three handlers:**
```typescript
// Before (broken)
import { requireAuth } from "./_auth";

// After (correct)
import { requireAuth } from "../lib/_auth";
```

---

### Change 2 — Removed `"type": "module"` + added `api/tsconfig.json`

**Commits:** `fix: switch API functions to CommonJS for Vercel compatibility`

**Problem:** `@vercel/node` uses unbundled TypeScript compilation — each `.ts` file is compiled to its own `.js` file. The compiled files preserved ESM `import` syntax (`import { ... } from '../lib/_gemini'`). Node.js ESM requires explicit `.js` extensions on relative specifiers. Without them, `ERR_MODULE_NOT_FOUND` occurred at runtime even though `lib/_gemini.js` was in the function bundle.

**Root cause chain:**
```
"type":"module" in package.json
  → @vercel/node uses ESM compilation (import/export syntax in output)
  → Node.js ESM requires explicit .js extensions
  → import '../lib/_gemini' fails (no extension)
  → FUNCTION_INVOCATION_FAILED
```

**Fix — two-part:**

1. **`package.json`** — Remove `"type": "module"`. Node.js defaults `.js` files to CommonJS. Vite manages its own ESM bundling independently and is unaffected.

2. **`api/tsconfig.json`** — New file that `@vercel/node` discovers first (TypeScript searches for the nearest `tsconfig.json` walking up from the compiled file). Configures `module: CommonJS` so the compiled output uses `require()` instead of `import`:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "CommonJS",
    "moduleResolution": "Node",
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "strict": true,
    "noImplicitReturns": true,
    "skipLibCheck": true,
    "resolveJsonModule": true
  },
  "include": ["*.ts", "../lib/*.ts"]
}
```

With CommonJS output, `require('../lib/_gemini')` automatically tries `../lib/_gemini.js` — Node.js CJS resolves the extension, and the function starts correctly.

> ⚠️ **Do not add `"type": "module"` back to `package.json`.** The `api/tsconfig.json` and the CJS compilation model depend on its absence.

---

### Change 3 — MIME type detection for images

**Commit:** `fix: detect actual image MIME type and retry on 429/500 from Gemini`

**Problem:** Both `bounding-box.ts` and `identify-card.ts` hardcoded `mimeType: "image/jpeg"` when calling Gemini, regardless of the actual image format. PNG and WebP uploads from the frontend triggered Gemini `ApiError` (400 INVALID_ARGUMENT), returned to the client as HTTP 500.

**Fix:** Extract the real MIME type from the data URI header for inline images, and read the `Content-Type` response header when fetching from a URL:

```typescript
// URL path: read Content-Type from response headers
const fetchRes = await fetch(imageData);
const contentType = fetchRes.headers.get("content-type") || "image/jpeg";
const detectedMime = contentType.split(";")[0].trim();
base64Data = `data:${detectedMime};base64,...`;

// Data URI path: parse the MIME from the URI prefix
const mimeMatch = base64Data.match(/^data:([^;]+);base64,/);
const imageMimeType = mimeMatch?.[1] ?? "image/jpeg";
```

**Supported MIME types (Gemini):** `image/jpeg`, `image/png`, `image/webp`, `image/gif`, `image/heic`, `image/heif`

---

### Change 4 — Extended Gemini retry logic

**Commit:** `fix: detect actual image MIME type and retry on 429/500 from Gemini`

**Problem:** `generateWithRetry` previously only retried on HTTP 503 (service overloaded). Gemini also returns 429 (rate limit) and intermittent 500 (server error) on transient failures.

**Fix in `lib/_gemini.ts`:**
```typescript
const isRetryable =
  statusCode === 429 || statusCode === 500 || statusCode === 503 ||
  msgIncludes(429) || msgIncludes(500) || msgIncludes(503);
```

Backoff timing: `delay × (attempt + 1)` — defaults to 1s, 2s (3 attempts total).

---

### Change 5 — Security headers

**Commit:** (part of security hardening batch)

Added to `vercel.json`, applied to all routes:

| Header | Value | Purpose |
|--------|-------|---------|
| `X-Content-Type-Options` | `nosniff` | Prevent MIME-type sniffing |
| `X-Frame-Options` | `DENY` | Prevent clickjacking |
| `X-XSS-Protection` | `1; mode=block` | Legacy XSS filter |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Limit referrer leakage |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=()` | Disable browser APIs |

---

### Change 6 — Prompt injection sanitization (market-intel)

`api/market-intel.ts` sanitizes all user-supplied strings before interpolating into the Gemini prompt:

```typescript
function sanitizeInput(value: string, maxLen: number): string {
  return value
    .replace(/[\x00-\x1f\x7f]/g, "")    // strip ASCII control characters
    .replace(/\$\{[^}]*\}/g, "")         // strip template literal expressions
    .replace(/```/g, "'''")              // defuse code fences
    .trim()
    .slice(0, maxLen);
}
```

PSA `certNumber` is validated against `/^\d{6,12}$/` before use — digits only, 6–12 characters.

---

## 6. Troubleshooting

### `FUNCTION_INVOCATION_FAILED` on any `/api/*` route

**Check 1 — Build logs:**
```bash
vercel inspect <deployment-url> --logs
```
Look for TypeScript compile errors (TS codes like `TS2345`, `TS7030`).

**Check 2 — Runtime logs:**
```bash
vercel logs
```
Look for `ERR_MODULE_NOT_FOUND` or `ApiError`.

**Check 3 — Verify lib/ files are in git:**
```bash
git ls-tree HEAD lib/
# Should show: _auth.ts  _gemini.ts  _schemas.ts
```

**Check 4 — Verify no `"type":"module"` in package.json:**
```bash
grep '"type"' package.json
# Should return nothing (field must not be present)
```

---

### `ERR_MODULE_NOT_FOUND: Cannot find module '/var/task/api/_gemini'`

The function bundle still contains compiled code with the old import path `./_gemini`. This means either:

- A stale build cache is being used → run `vercel --force --yes && vercel --prod --yes`
- The `api/_gemini.ts` file was re-created locally and committed → delete it, the file must live at `lib/_gemini.ts`

---

### `ApiError` from Gemini (HTTP 500 from your API)

**Most common causes:**

| Symptom | Likely cause | Fix |
|---------|-------------|-----|
| Consistent failures on PNG uploads | Was the MIME type fix deployed? | Ensure commit `9f589c2` is in production |
| Intermittent failures | Gemini rate limit (429) or server error (500) | Retry logic handles up to 2 retries — persistent failures mean Gemini is overloaded |
| All requests fail | `GEMINI_API_KEY` missing or invalid | Check Vercel env vars: `vercel env ls` |
| Failures only on large images | Image exceeds 10 MB limit | Reduce image resolution before upload |

---

### Authentication errors (`401 Invalid or expired token`)

1. Confirm `SUPABASE_URL` and `SUPABASE_ANON_KEY` are set in the deployment environment:
   ```bash
   vercel env ls
   ```
2. Check that the frontend is sending the Supabase session JWT in the `Authorization: Bearer <token>` header.
3. If the token is expired, the user needs to re-sign-in — Supabase JWTs expire after 1 hour by default.

---

### Rate limit errors (`429 Rate limit exceeded`)

The in-memory rate limiter resets every 60 seconds per user. Limits per endpoint:

| Endpoint | Limit |
|----------|-------|
| `/api/bounding-box` | 30 requests / minute |
| `/api/identify-card` | 20 requests / minute |
| `/api/market-intel` | 10 requests / minute |

> ⚠️ **Known limitation:** The rate limiter is in-process memory. On Vercel, each serverless function instance has its own counter. If multiple instances are running (after scaling), a user can exceed the stated limits. For strict rate limiting at scale, replace the `rateLimitStore` Map with [Upstash Redis](https://upstash.com/).

---

### `vercel` command not found

The Vercel CLI must be installed globally:

```bash
npm install -g vercel
```

If the shell can't find it after install (common on Windows), use the full path:

```bash
# Windows — typical global npm bin location
C:\Users\<username>\AppData\Roaming\npm\vercel.cmd dev --yes
```

Or use `npx`:

```bash
npx vercel dev --yes
```

---

### Vite build fails after removing `"type":"module"`

Removing `"type":"module"` from `package.json` does **not** affect the Vite frontend build. Vite manages its own ESM bundling through its internal Rollup pipeline and does not depend on the `"type"` field in `package.json`.

If you see Vite errors after this change, they are unrelated to the `"type"` field. Check the specific error message.

---

*For Vercel-specific documentation see [vercel.com/docs](https://vercel.com/docs). For Gemini API see [ai.google.dev](https://ai.google.dev).*
