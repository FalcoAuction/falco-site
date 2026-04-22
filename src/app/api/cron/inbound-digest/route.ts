import { NextRequest, NextResponse } from "next/server"
import { sendInboundDigest } from "@/lib/inbound-digest"

export const dynamic = "force-dynamic"

/**
 * Daily digest cron. Wired up in vercel.json to fire once per day.
 *
 * Auth: Vercel cron sends `Authorization: Bearer <CRON_SECRET>` if you set
 * the env var. We allow:
 *   - Vercel cron with matching CRON_SECRET
 *   - manual GET with ?secret=<CRON_SECRET> for testing
 * If CRON_SECRET isn't set the endpoint is open (fine for dev / manual runs).
 */
export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET?.trim()
  if (cronSecret) {
    const authHeader = req.headers.get("authorization") ?? ""
    const expected = `Bearer ${cronSecret}`
    const querySecret = req.nextUrl.searchParams.get("secret") ?? ""
    if (authHeader !== expected && querySecret !== cronSecret) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 })
    }
  }

  const force = req.nextUrl.searchParams.get("force") === "1"
  try {
    const result = await sendInboundDigest({ force })
    return NextResponse.json(result)
  } catch (err) {
    const message = err instanceof Error ? err.message : "digest failed"
    console.error("inbound-digest error:", err)
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}
