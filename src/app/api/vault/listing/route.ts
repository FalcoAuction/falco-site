import { NextRequest, NextResponse } from "next/server"
import { getVaultApprovalSession } from "@/lib/vault-access-session"
import { recordVaultActivity } from "@/lib/vault-activity"
import { findVaultListing } from "@/lib/vault-listings"

export async function GET(req: NextRequest) {
  try {
    const approval = await getVaultApprovalSession(req)
    if (!approval) {
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

    const forwardedFor = req.headers.get("x-forwarded-for") ?? ""
    const ipAddress = forwardedFor.split(",")[0]?.trim() || "unknown"
    const userAgent = req.headers.get("user-agent") ?? "unknown"
    await recordVaultActivity({
      eventType: "vault_listing_viewed",
      email: approval.email,
      partnerName: approval.email,
      listingSlug: listing.slug,
      detail: `Opened ${listing.title || listing.slug}.`,
      ipAddress,
      userAgent,
      actedBy: approval.email,
      context: {
        county: listing.county || "",
        distressType: listing.distressType || "",
      },
    })

    return NextResponse.json({
      ok: true,
      listing,
    })
  } catch {
    return NextResponse.json(
      { ok: false, error: "Unable to load vault listing." },
      { status: 500 }
    )
  }
}
