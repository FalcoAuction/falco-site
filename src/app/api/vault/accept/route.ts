import { NextRequest, NextResponse } from "next/server"
import {
  appendVaultAcceptance,
  NDA_VERSION,
  NON_CIRC_VERSION,
} from "@/lib/vault-agreements"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    const listingSlug = String(body?.listingSlug ?? "").trim()
    const fullName = String(body?.fullName ?? "").trim()
    const email = String(body?.email ?? "").trim().toLowerCase()
    const ndaAccepted = Boolean(body?.ndaAccepted)
    const nonCircAccepted = Boolean(body?.nonCircAccepted)

    if (!listingSlug || !fullName || !email) {
      return NextResponse.json(
        { ok: false, error: "Missing required fields." },
        { status: 400 }
      )
    }

    if (!ndaAccepted || !nonCircAccepted) {
      return NextResponse.json(
        { ok: false, error: "Both agreements must be accepted." },
        { status: 400 }
      )
    }

    const forwardedFor = req.headers.get("x-forwarded-for") ?? ""
    const ipAddress = forwardedFor.split(",")[0]?.trim() || "unknown"
    const userAgent = req.headers.get("user-agent") ?? "unknown"

    appendVaultAcceptance({
      listingSlug,
      fullName,
      email,
      ndaVersion: NDA_VERSION,
      nonCircVersion: NON_CIRC_VERSION,
      acceptedAt: new Date().toISOString(),
      ipAddress,
      userAgent,
    })

    const res = NextResponse.json({ ok: true })

    res.cookies.set(`falco_vault_access_${listingSlug}`, "accepted", {
      httpOnly: false,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    })

    res.cookies.set(`falco_vault_email_${listingSlug}`, email, {
      httpOnly: false,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    })

    return res
  } catch {
    return NextResponse.json(
      { ok: false, error: "Unable to record acceptance." },
      { status: 500 }
    )
  }
}