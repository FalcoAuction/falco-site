import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

/**
 * TEMPORARY diagnostic endpoint — confirms which critical env vars the
 * running deployment can actually see. Returns presence + length only;
 * never the values. Safe to leave deployed but feel free to delete once
 * /admin/login is working.
 *
 * Example response:
 *   { ok: true, runtime: "nodejs", env: { FALCO_ADMIN_PASSWORD: { set: true, length: 12 }, ... } }
 */
export async function GET() {
  const keys = [
    "FALCO_ADMIN_PASSWORD",
    "FALCO_SESSION_SECRET",
    "NEXT_PUBLIC_SUPABASE_URL",
    "SUPABASE_SERVICE_ROLE_KEY",
    "RESEND_API_KEY",
    "FALCO_INBOUND_NOTIFY_TO",
    "FALCO_FROM_EMAIL",
    "VERCEL_ENV",
    "VERCEL_GIT_COMMIT_SHA",
  ] as const

  const env: Record<string, { set: boolean; length?: number; value?: string }> = {}
  for (const k of keys) {
    const raw = process.env[k]
    if (raw === undefined) {
      env[k] = { set: false }
    } else {
      const trimmed = raw.trim()
      env[k] = { set: trimmed.length > 0, length: raw.length }
      // Show actual value only for public / non-sensitive identifiers
      if (k === "VERCEL_ENV" || k === "VERCEL_GIT_COMMIT_SHA") {
        env[k].value = raw
      }
    }
  }

  return NextResponse.json({
    ok: true,
    runtime: "nodejs",
    nodeVersion: process.version,
    env,
    note: "Lengths only — values are NOT returned for sensitive keys.",
  })
}
