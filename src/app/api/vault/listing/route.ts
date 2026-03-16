import { NextRequest, NextResponse } from "next/server"
import { getVaultApprovalSession } from "@/lib/vault-access-session"
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
