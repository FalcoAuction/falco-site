import { NextRequest, NextResponse } from "next/server"
import { findApprovalByEmail } from "@/lib/access-workflow"
import {
  appendVaultAcceptance,
  NDA_VERSION,
  NON_CIRC_VERSION,
} from "@/lib/vault-agreements"

const COOKIE_IS_SECURE = process.env.NODE_ENV === "production"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    const listingSlug = String(body?.listingSlug ?? "").trim()
    const fullName = String(body?.fullName ?? "").trim()
    const email = String(body?.email ?? "").trim().toLowerCase()
    const ndaAccepted = Boolean(body?.ndaAccepted)
    const nonCircAccepted = Boolean(body?.nonCircAccepted)
    const approvedEmail =
      req.cookies.get("falco_vault_approved_email")?.value?.trim().toLowerCase() || ""

    if (!listingSlug || !fullName || !email) {
      return NextResponse.json(
        { ok: false, error: "Missing required fields." },
        { status: 400 }
      )
    }

    if (!approvedEmail) {
      return NextResponse.json(
        { ok: false, error: "Approved vault access must be verified before acceptance." },
        { status: 401 }
      )
    }

    if (email !== approvedEmail) {
      return NextResponse.json(
        { ok: false, error: "Acceptance must be recorded with your approved vault email." },
        { status: 403 }
      )
    }

    const approval = await findApprovalByEmail(approvedEmail)
    if (!approval) {
      console.warn("vault_accept denied_unapproved_email", { listingSlug, approvedEmail })
      return NextResponse.json(
        { ok: false, error: "Email is not approved for vault access." },
        { status: 403 }
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

    await appendVaultAcceptance({
      listingSlug,
      fullName,
      email: approvedEmail,
      ndaVersion: NDA_VERSION,
      nonCircVersion: NON_CIRC_VERSION,
      acceptedAt: new Date().toISOString(),
      ipAddress,
      userAgent,
    })

    console.info("vault_accept recorded", { listingSlug, email: approvedEmail })

    const res = NextResponse.json({ ok: true })

    res.cookies.set(`falco_vault_access_${listingSlug}`, "accepted", {
      httpOnly: false,
      sameSite: "lax",
      secure: COOKIE_IS_SECURE,
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    })

    res.cookies.set(`falco_vault_email_${listingSlug}`, approvedEmail, {
      httpOnly: false,
      sameSite: "lax",
      secure: COOKIE_IS_SECURE,
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    })

    return res
  } catch (error) {
    console.error("vault_accept error", error)
    return NextResponse.json(
      { ok: false, error: "Unable to record acceptance." },
      { status: 500 }
    )
  }
}
