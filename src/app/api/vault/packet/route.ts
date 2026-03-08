import fs from "fs"
import path from "path"
import { NextRequest, NextResponse } from "next/server"
import { findApprovalByEmail } from "@/lib/access-workflow"
import { findVaultAcceptance } from "@/lib/vault-agreements"
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

    const listing = findVaultListing(slug)
    if (!listing) {
      return NextResponse.json(
        { ok: false, error: "Listing not found." },
        { status: 404 }
      )
    }

    const approvedEmail = req.cookies.get("falco_vault_approved_email")?.value?.trim().toLowerCase() || ""
    if (!approvedEmail) {
      return NextResponse.json(
        { ok: false, error: "Approved access required." },
        { status: 401 }
      )
    }

    const approval = findApprovalByEmail(approvedEmail)
    if (!approval) {
      return NextResponse.json(
        { ok: false, error: "Email is not approved for vault access." },
        { status: 403 }
      )
    }

    const acceptance = findVaultAcceptance(slug, approvedEmail)
    if (!acceptance) {
      return NextResponse.json(
        { ok: false, error: "Agreement acceptance required before packet access." },
        { status: 403 }
      )
    }

    const packetFileName = listing.packetFileName
    if (!packetFileName) {
      return NextResponse.json(
        { ok: false, error: "Packet file is not configured for this listing." },
        { status: 404 }
      )
    }

    const packetPath = path.join(PRIVATE_PACKET_DIR, packetFileName)
    if (!fs.existsSync(packetPath)) {
      return NextResponse.json(
        { ok: false, error: "Packet file not found." },
        { status: 404 }
      )
    }

    const fileBuffer = fs.readFileSync(packetPath)

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${packetFileName}"`,
        "Cache-Control": "private, no-store, max-age=0",
      },
    })
  } catch {
    return NextResponse.json(
      { ok: false, error: "Unable to serve vault packet." },
      { status: 500 }
    )
  }
}