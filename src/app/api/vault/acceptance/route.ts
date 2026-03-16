import { NextRequest, NextResponse } from "next/server"
import { findVaultAcceptance } from "@/lib/vault-agreements"
import { getVaultApprovalSession } from "@/lib/vault-access-session"
import { findVaultListing } from "@/lib/vault-listings"

export async function GET(req: NextRequest) {
  try {
    const approval = await getVaultApprovalSession(req)
    const approvedEmail = approval?.email?.trim().toLowerCase() || ""

    if (!approvedEmail || !approval) {
      return NextResponse.json(
        { ok: false, error: "Approved vault access required." },
        { status: 401 }
      )
    }

    const slug = String(req.nextUrl.searchParams.get("slug") ?? "").trim()
    if (!slug) {
      return NextResponse.json(
        { ok: false, error: "Listing slug is required." },
        { status: 400 }
      )
    }

    const listing = await findVaultListing(slug)
    if (!listing) {
      return NextResponse.json(
        { ok: false, error: "Listing not found." },
        { status: 404 }
      )
    }

    const acceptance = await findVaultAcceptance(slug, approvedEmail)

    return NextResponse.json({
      ok: true,
      accepted: Boolean(acceptance),
      acceptance,
    })
  } catch {
    return NextResponse.json(
      { ok: false, error: "Unable to load agreement status." },
      { status: 500 }
    )
  }
}
