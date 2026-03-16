import fs from "fs"
import path from "path"
import { NextRequest, NextResponse } from "next/server"
import { findVaultAcceptance } from "@/lib/vault-agreements"
import { getVaultApprovalSession } from "@/lib/vault-access-session"
import { recordVaultActivity } from "@/lib/vault-activity"
import { findVaultListing } from "@/lib/vault-listings"

const PRIVATE_PACKET_DIR = path.join(process.cwd(), "private", "vault", "packets")

export async function GET(req: NextRequest) {
  try {
    const slug = String(req.nextUrl.searchParams.get("slug") ?? "").trim()

    if (!slug) {
      return NextResponse.json(
        { ok: false, error: "Missing listing slug." },
        { status: 400 }
      )
    }

    const listing = await findVaultListing(slug)
    if (!listing) {
      console.warn("vault_packet listing_not_found", { slug })
      return NextResponse.json(
        { ok: false, error: "Listing not found." },
        { status: 404 }
      )
    }

    const approval = await getVaultApprovalSession(req)
    const approvedEmail = approval?.email?.trim().toLowerCase() || ""
    if (!approvedEmail) {
      console.warn("vault_packet denied_missing_approval_cookie", { slug })
      return NextResponse.json(
        { ok: false, error: "Approved access required." },
        { status: 401 }
      )
    }

    if (!approval) {
      console.warn("vault_packet denied_unapproved_email", { slug, approvedEmail })
      return NextResponse.json(
        { ok: false, error: "Email is not approved for vault access." },
        { status: 403 }
      )
    }

    const acceptance = await findVaultAcceptance(slug, approvedEmail)
    if (!acceptance) {
      console.warn("vault_packet denied_missing_acceptance", { slug, approvedEmail })
      return NextResponse.json(
        { ok: false, error: "Agreement acceptance required before packet access." },
        { status: 403 }
      )
    }

    if (listing.routingState === "closed") {
      console.warn("vault_packet denied_closed_listing", { slug, approvedEmail })
      return NextResponse.json(
        { ok: false, error: "This listing is no longer available for packet access." },
        { status: 403 }
      )
    }

    if (
      listing.routingState === "reserved" &&
      listing.routingReservedByEmail &&
      listing.routingReservedByEmail !== approvedEmail
    ) {
      console.warn("vault_packet denied_reserved_listing", {
        slug,
        approvedEmail,
        reservedByEmail: listing.routingReservedByEmail,
      })
      return NextResponse.json(
        { ok: false, error: "This listing is currently reserved through another active routing path." },
        { status: 403 }
      )
    }

    const packetFileName = listing.packetFileName
    if (!packetFileName) {
      console.error("vault_packet missing_packet_filename", { slug })
      return NextResponse.json(
        { ok: false, error: "Packet file is not configured for this listing." },
        { status: 404 }
      )
    }

    const packetPath = path.join(PRIVATE_PACKET_DIR, packetFileName)
    if (!fs.existsSync(packetPath)) {
      console.error("vault_packet packet_file_not_found", { slug, packetFileName })
      return NextResponse.json(
        { ok: false, error: "Packet file not found." },
        { status: 404 }
      )
    }

    const fileBuffer = fs.readFileSync(packetPath)
    const forwardedFor = req.headers.get("x-forwarded-for") ?? ""
    const ipAddress = forwardedFor.split(",")[0]?.trim() || "unknown"
    const userAgent = req.headers.get("user-agent") ?? "unknown"
    await recordVaultActivity({
      eventType: "vault_packet_viewed",
      email: approvedEmail,
      partnerName: approvedEmail,
      listingSlug: listing.slug,
      detail: `Opened packet for ${listing.title || listing.slug}.`,
      ipAddress,
      userAgent,
      actedBy: approvedEmail,
      context: {
        county: listing.county || "",
        distressType: listing.distressType || "",
        packetFileName,
      },
    })
    console.info("vault_packet served", { slug, approvedEmail, packetFileName })

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${packetFileName}"`,
        "Cache-Control": "private, no-store, max-age=0",
      },
    })
  } catch (error) {
    console.error("vault_packet error", error)
    return NextResponse.json(
      { ok: false, error: "Unable to serve vault packet." },
      { status: 500 }
    )
  }
}
