import fs from "fs"
import path from "path"
import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Missing Supabase environment variables.")
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

const filePath = path.join(process.cwd(), "data", "vault_listings.ndjson")

if (!fs.existsSync(filePath)) {
  console.error(`Missing file: ${filePath}`)
  process.exit(1)
}

const raw = fs.readFileSync(filePath, "utf8").trim()
const rows = raw
  ? raw
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => JSON.parse(line))
  : []

const mapped = rows
  .filter((row) => row.slug)
  .map((row) => ({
    slug: row.slug,
    title: row.title ?? row.address_masked ?? row.address ?? row.slug,
    county: row.county ?? null,
    state: row.state ?? "TN",
    falco_score:
      typeof row.falco_score === "number"
        ? row.falco_score
        : typeof row.falcoScore === "number"
        ? row.falcoScore
        : typeof row.falco_score_internal === "number"
        ? row.falco_score_internal
        : null,
    auction_readiness: row.auction_readiness ?? row.auctionReadiness ?? null,
    equity_band: row.equity_band ?? row.equityBand ?? null,
    dts_days:
      typeof row.dts_days === "number"
        ? row.dts_days
        : typeof row.dtsDays === "number"
        ? row.dtsDays
        : row.dts_days
        ? Number(row.dts_days)
        : row.dtsDays
        ? Number(row.dtsDays)
        : null,
    packet_path:
      row.packet_path ??
      row.packetFileName ??
      row.packet_pdf ??
      row.pdf_path ??
      (row.slug ? `${row.slug}.pdf` : null),
    is_active: row.is_active ?? true,
  }))

if (!mapped.length) {
  console.log("No rows to import.")
  process.exit(0)
}

const { error } = await supabase
  .from("vault_listings")
  .upsert(mapped, { onConflict: "slug" })

if (error) {
  console.error("Import failed:", error.message)
  process.exit(1)
}

const mappedSlugs = mapped.map((row) => row.slug)

const { data: existingRows, error: existingError } = await supabase
  .from("vault_listings")
  .select("slug")

if (existingError) {
  console.error("Import post-check failed:", existingError.message)
  process.exit(1)
}

const staleSlugs = (existingRows ?? [])
  .map((row) => row.slug)
  .filter((slug) => slug && !mappedSlugs.includes(slug))

if (staleSlugs.length > 0) {
  const { error: deleteError } = await supabase
    .from("vault_listings")
    .delete()
    .in("slug", staleSlugs)

  if (deleteError) {
    console.error("Stale row cleanup failed:", deleteError.message)
    process.exit(1)
  }
}

console.log(`Imported ${mapped.length} vault listings.`)
console.log(`Removed ${staleSlugs.length} stale vault listings.`)
