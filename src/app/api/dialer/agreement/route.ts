import { NextRequest, NextResponse } from "next/server"
import { getDialerSession } from "@/lib/dialer-session"
import { recordDialerAcceptance } from "@/lib/dialer-acceptance"

export async function POST(req: NextRequest) {
  // Must have a dialer session (operator never hits this — they bypass).
  const session = getDialerSession(req)
  if (!session) {
    return NextResponse.json({ ok: false, error: "Not authenticated." }, { status: 401 })
  }

  let body: { caller?: string; email?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON." }, { status: 400 })
  }
  const email = (body.email ?? session.email ?? "").trim().toLowerCase()
  const caller = (body.caller ?? session.caller ?? "").trim()
  if (!email) {
    return NextResponse.json({ ok: false, error: "Email required." }, { status: 400 })
  }

  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    null
  const userAgent = req.headers.get("user-agent") || null

  const recorded = await recordDialerAcceptance({
    email,
    callerName: caller,
    ipAddress: ip,
    userAgent,
  })
  if (!recorded) {
    return NextResponse.json({ ok: false, error: "Failed to record." }, { status: 500 })
  }
  return NextResponse.json({ ok: true, acceptance: recorded })
}
