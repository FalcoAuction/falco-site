import { NextRequest, NextResponse } from "next/server"
import { sendWeeklyPartnerDigest } from "@/lib/partner-digest"

export async function GET(req: NextRequest) {
  try {
    const dryRun = req.nextUrl.searchParams.get("dryRun") === "1"
    const manualSecret = req.nextUrl.searchParams.get("secret") ?? ""
    const result = await sendWeeklyPartnerDigest({
      dryRun,
      manualSecret,
      authHeader: req.headers.get("authorization"),
    })

    return NextResponse.json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to send partner digest."
    const status = /Unauthorized/.test(message) ? 401 : 500
    console.error("partner_digest error", error)
    return NextResponse.json({ ok: false, error: message }, { status })
  }
}
