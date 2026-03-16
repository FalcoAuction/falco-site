import { NextRequest, NextResponse } from "next/server"
import { getAdminApprovalSecret } from "@/lib/admin-approval-secret"
import { updateVaultListingStatus } from "@/lib/vault-listings"

export async function POST(req: NextRequest) {
  try {
    const adminApprovalSecret = getAdminApprovalSecret()
    const body = await req.json()
    const secret = String(body?.secret ?? "").trim()
    const action = String(body?.action ?? "").trim()
    const slug = String(body?.slug ?? "").trim()

    if (!secret || secret !== adminApprovalSecret) {
      return NextResponse.json(
        { ok: false, error: "Unauthorized vault action." },
        { status: 401 }
      )
    }

    if (!slug) {
      return NextResponse.json(
        { ok: false, error: "Listing slug is required." },
        { status: 400 }
      )
    }

    if (action !== "remove") {
      return NextResponse.json(
        { ok: false, error: "Invalid vault action." },
        { status: 400 }
      )
    }

    const listing = await updateVaultListingStatus(slug, "expired")
    if (!listing) {
      return NextResponse.json(
        { ok: false, error: "Vault listing not found." },
        { status: 404 }
      )
    }

    return NextResponse.json({ ok: true, listing })
  } catch (error) {
    if (error instanceof Error && error.message === "Missing FALCO_APPROVAL_SECRET.") {
      return NextResponse.json(
        { ok: false, error: "Approval secret is not configured." },
        { status: 500 }
      )
    }

    console.error("operator_vault error", error)
    return NextResponse.json(
      { ok: false, error: "Unable to update vault listing." },
      { status: 500 }
    )
  }
}
