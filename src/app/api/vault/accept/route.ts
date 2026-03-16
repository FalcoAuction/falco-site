import { NextRequest, NextResponse } from "next/server"
import {
  appendVaultAcceptance,
  NDA_VERSION,
  NON_CIRC_VERSION,
} from "@/lib/vault-agreements"
import { getVaultApprovalSession } from "@/lib/vault-access-session"
import { recordVaultActivity } from "@/lib/vault-activity"
import { findVaultListing } from "@/lib/vault-listings"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    const listingSlug = String(body?.listingSlug ?? "").trim()
    const fullName = String(body?.fullName ?? "").trim()
    const email = String(body?.email ?? "").trim().toLowerCase()
    const ndaAccepted = Boolean(body?.ndaAccepted)
    const nonCircAccepted = Boolean(body?.nonCircAccepted)
    const approval = await getVaultApprovalSession(req)
    const approvedEmail = approval?.email?.trim().toLowerCase() || ""

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

    const listing = await findVaultListing(listingSlug)
    if (!listing) {
      return NextResponse.json(
        { ok: false, error: "Listing not found." },
        { status: 404 }
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
    await recordVaultActivity({
      eventType: "vault_acceptance_recorded",
      email: approvedEmail,
      partnerName: fullName,
      listingSlug,
      detail: `Signed NDA and non-circ for ${listing.title || listing.slug}.`,
      ipAddress,
      userAgent,
      actedBy: approvedEmail,
      context: {
        ndaVersion: NDA_VERSION,
        nonCircVersion: NON_CIRC_VERSION,
      },
    })

    console.info("vault_accept recorded", { listingSlug, email: approvedEmail })

    return NextResponse.json({
      ok: true,
      accepted: true,
    })
  } catch (error) {
    console.error("vault_accept error", error)
    return NextResponse.json(
      { ok: false, error: "Unable to record acceptance." },
      { status: 500 }
    )
  }
}
