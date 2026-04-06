import { NextRequest, NextResponse } from "next/server"
import { upsertVaultListing } from "@/lib/vault-listings"
import fs from "fs"
import path from "path"

export const dynamic = "force-dynamic"

const APPROVAL_SECRET = process.env.FALCO_APPROVAL_SECRET ?? ""

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const secret = String(body?.secret ?? "").trim()

    if (!APPROVAL_SECRET || secret !== APPROVAL_SECRET) {
      return NextResponse.json(
        { ok: false, error: "Unauthorized." },
        { status: 401 }
      )
    }

    const ndjsonPath = path.join(process.cwd(), "data", "vault_listings.ndjson")
    if (!fs.existsSync(ndjsonPath)) {
      return NextResponse.json(
        { ok: false, error: "vault_listings.ndjson not found." },
        { status: 404 }
      )
    }

    const raw = fs.readFileSync(ndjsonPath, "utf-8").trim()
    if (!raw) {
      return NextResponse.json({ ok: true, synced: 0, errors: 0 })
    }

    let synced = 0
    let errors = 0

    for (const line of raw.split("\n")) {
      const trimmed = line.trim()
      if (!trimmed) continue

      try {
        const row = JSON.parse(trimmed)
        if (!row?.slug) continue

        const result = await upsertVaultListing(row)
        if (result) {
          synced++
        } else {
          errors++
        }
      } catch {
        errors++
      }
    }

    return NextResponse.json({ ok: true, synced, errors })
  } catch {
    return NextResponse.json(
      { ok: false, error: "Sync failed." },
      { status: 500 }
    )
  }
}
