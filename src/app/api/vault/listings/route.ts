import { NextRequest, NextResponse } from "next/server"
import {
  listVaultListings,
  seedVaultListingsIfEmpty,
} from "@/lib/vault-listings"
import { getVaultApprovalSession } from "@/lib/vault-access-session"

export const dynamic = "force-dynamic"
export const revalidate = 0

export async function GET(req: NextRequest) {
  try {
    const approval = await getVaultApprovalSession(req)
    if (!approval) {
      return NextResponse.json(
        { ok: false, error: "Approved vault access required." },
        { status: 401 }
      )
    }

    await seedVaultListingsIfEmpty()
    const listings = await listVaultListings()

    return NextResponse.json(
      {
        ok: true,
        listings,
      },
      {
        headers: {
          "Cache-Control": "private, no-store, max-age=0",
        },
      }
    )
  } catch {
    return NextResponse.json(
      { ok: false, error: "Unable to load vault listings." },
      { status: 500 }
    )
  }
}
