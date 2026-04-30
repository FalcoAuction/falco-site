// Lightweight defense for public POST endpoints (homeowner / buyer /
// partner / inquiry forms). Two layers:
//
// 1. Origin allowlist — reject cross-origin POSTs at the edge. Not bulletproof
//    (origin is set by the browser, not the server), but stops casual abuse
//    + most automation that doesn't bother spoofing headers.
//
// 2. In-memory IP rate limit — best-effort throttle. Not durable across
//    serverless instance recycles, but fine as a soft cap for the pilot.
//    Upgrade to a Redis/KV-backed limiter when traffic justifies it.

import { NextRequest, NextResponse } from "next/server"

const ALLOWED_ORIGINS = new Set<string>([
  "https://falco.llc",
  "https://www.falco.llc",
  "http://localhost:3000",
  "http://localhost:3001",
])

// Allow Vercel preview deployments (falco-site-XXX.vercel.app)
function isAllowedOrigin(origin: string | null): boolean {
  if (!origin) return false
  if (ALLOWED_ORIGINS.has(origin)) return true
  try {
    const u = new URL(origin)
    if (u.host.endsWith(".vercel.app") && u.protocol === "https:") return true
  } catch {
    return false
  }
  return false
}

/** Extract the client IP from common proxy headers. */
export function getClientIp(req: NextRequest): string | null {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    null
  )
}

// In-memory token bucket per IP. Keyed by `${ip}:${endpoint}`.
type Bucket = { count: number; resetAt: number }
const buckets = new Map<string, Bucket>()
const WINDOW_MS = 10 * 60 * 1000 // 10 minutes
const MAX_PER_WINDOW = 5         // 5 submissions per IP per endpoint per 10 min

function checkRateLimit(key: string): { ok: true } | { ok: false; retryAfterSec: number } {
  const now = Date.now()
  const b = buckets.get(key)
  if (!b || b.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + WINDOW_MS })
    return { ok: true }
  }
  if (b.count >= MAX_PER_WINDOW) {
    return { ok: false, retryAfterSec: Math.ceil((b.resetAt - now) / 1000) }
  }
  b.count += 1
  return { ok: true }
}

/** Run before form submission processing. Returns a 4xx NextResponse if
 *  the request should be rejected, else null to continue. */
export function guardPublicForm(
  req: NextRequest,
  endpointName: string
): NextResponse | null {
  // Browsers send Origin on POST; missing Origin is suspicious for a form.
  const origin = req.headers.get("origin")
  if (!isAllowedOrigin(origin)) {
    return NextResponse.json(
      { ok: false, error: "Forbidden — invalid origin." },
      { status: 403 }
    )
  }
  const ip = getClientIp(req) || "unknown"
  const limit = checkRateLimit(`${ip}:${endpointName}`)
  if (!limit.ok) {
    return NextResponse.json(
      {
        ok: false,
        error: `Too many submissions. Try again in ${Math.ceil(limit.retryAfterSec / 60)} minute(s).`,
      },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSec) } }
    )
  }
  return null
}
