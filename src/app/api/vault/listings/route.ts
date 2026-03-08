import { NextResponse } from "next/server"
import {
  listVaultListings,
  seedVaultListingsIfEmpty,
} from "@/lib/vault-listings"

export async function GET() {
  try {
    await seedVaultListingsIfEmpty()
    const listings = await listVaultListings()

    return NextResponse.json({
      ok: true,
      listings,
    })
  } catch {
    return NextResponse.json(
      { ok: false, error: "Unable to load vault listings." },
      { status: 500 }
    )
  }
}