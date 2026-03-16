import { NextRequest, NextResponse } from "next/server"
import { findVaultAcceptance } from "@/lib/vault-agreements"
import { getVaultApprovalSession } from "@/lib/vault-access-session"
import { findVaultListing } from "@/lib/vault-listings"
import {
  createVaultPursuitRequest,
  getVaultRoutingSnapshot,
  listVaultPursuitRequestsByListing,
} from "@/lib/vault-pursuit"

export async function GET(req: NextRequest) {
  try {
    const listingSlug = String(req.nextUrl.searchParams.get("slug") ?? "").trim()
    if (!listingSlug) {
      return NextResponse.json(
        { ok: false, error: "Missing listing slug." },
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

    const approval = await getVaultApprovalSession(req)
    const approvedEmail = approval?.email?.trim().toLowerCase() || ""
    if (!approvedEmail || !approval) {
      return NextResponse.json(
        { ok: false, error: "Approved vault access required." },
        { status: 401 }
      )
    }

    const snapshot = await getVaultRoutingSnapshot(listingSlug, listing.status !== "active")
    const requests = await listVaultPursuitRequestsByListing(listingSlug)
    const currentRequest = approvedEmail
      ? requests.find(
          (row) =>
            row.email === approvedEmail &&
            (row.status === "pursuit_requested" || row.status === "pursuit_reserved")
        )
      : null

    return NextResponse.json({
      ok: true,
      routingState: snapshot.routingState,
      requestCount: snapshot.requestCount,
      reservedByCurrentUser:
        snapshot.routingState === "reserved" &&
        snapshot.reservedByEmail === approvedEmail,
      hasRequestedByCurrentUser: Boolean(currentRequest),
    })
  } catch {
    return NextResponse.json(
      { ok: false, error: "Unable to load pursuit state." },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const listingSlug = String(body?.listingSlug ?? "").trim()
    const fullName = String(body?.fullName ?? "").trim()
    const message = String(body?.message ?? "").trim()
    const approval = await getVaultApprovalSession(req)
    const approvedEmail = approval?.email?.trim().toLowerCase() || ""

    if (!listingSlug) {
      return NextResponse.json(
        { ok: false, error: "Listing slug is required." },
        { status: 400 }
      )
    }

    if (!approvedEmail) {
      return NextResponse.json(
        { ok: false, error: "Approved access required before requesting pursuit." },
        { status: 401 }
      )
    }

    if (!approval) {
      return NextResponse.json(
        { ok: false, error: "Email is not approved for vault access." },
        { status: 403 }
      )
    }

    const listing = await findVaultListing(listingSlug)
    if (!listing) {
      return NextResponse.json(
        { ok: false, error: "Listing not found." },
        { status: 404 }
      )
    }

    if (listing.status !== "active" || listing.routingState === "closed") {
      return NextResponse.json(
        { ok: false, error: "This listing is no longer accepting pursuit requests." },
        { status: 403 }
      )
    }

    if (listing.routingState === "reserved") {
      return NextResponse.json(
        { ok: false, error: "This listing is currently reserved through another active routing path." },
        { status: 403 }
      )
    }

    const acceptance = await findVaultAcceptance(listingSlug, approvedEmail)
    if (!acceptance) {
      return NextResponse.json(
        { ok: false, error: "Agreement acceptance required before requesting pursuit." },
        { status: 403 }
      )
    }

    const requestRecord = await createVaultPursuitRequest({
      listingSlug,
      email: approvedEmail,
      fullName: fullName || approvedEmail,
      message,
    })

    return NextResponse.json({
      ok: true,
      requestId: requestRecord.requestId,
      status: requestRecord.status,
    })
  } catch (error) {
    console.error("vault_pursuit error", error)
    return NextResponse.json(
      { ok: false, error: "Unable to submit pursuit request." },
      { status: 500 }
    )
  }
}
