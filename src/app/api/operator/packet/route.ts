import fs from "fs"
import path from "path"
import { NextRequest, NextResponse } from "next/server"
import { hasOperatorSession } from "@/lib/operator-access-session"
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

    if (!hasOperatorSession(req)) {
      return NextResponse.json(
        { ok: false, error: "Operator session required." },
        { status: 401 }
      )
    }

    const listing = await findVaultListing(slug)
    if (!listing) {
      return NextResponse.json(
        { ok: false, error: "Listing not found." },
        { status: 404 }
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
  } catch (error) {
    console.error("operator_packet error", error)
    return NextResponse.json(
      { ok: false, error: "Unable to serve operator packet." },
      { status: 500 }
    )
  }
}
