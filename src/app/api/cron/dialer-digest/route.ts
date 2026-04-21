import { NextRequest, NextResponse } from "next/server"
import { sendDailyDialerDigest } from "@/lib/dialer-digest"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  try {
    const dryRun = req.nextUrl.searchParams.get("dryRun") === "1"
    const manualSecret = req.nextUrl.searchParams.get("secret")
    const recipientOverride = req.nextUrl.searchParams.get("to") ?? undefined

    const result = await sendDailyDialerDigest({
      dryRun,
      manualSecret,
      authHeader: req.headers.get("authorization"),
      recipientOverride: recipientOverride ?? undefined,
    })

    return NextResponse.json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to send dialer digest."
    const status = /Unauthorized/.test(message) ? 401 : 500
    console.error("dialer_digest error", error)
    return NextResponse.json({ ok: false, error: message }, { status })
  }
}
