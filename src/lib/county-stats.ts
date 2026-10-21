// Live foreclosure activity per county, read from the pipeline's own
// tables. This is the one thing a county page can say that no template
// and no competitor can: how many trustee sales are actually scheduled
// here right now, and who is filing them. Rendered server-side on the
// county pages (revalidated daily), and it is what turns 32 near-identical
// pages into 32 distinct, dated documents for the index.
//
// Never throws. Any failure (no client, query error, empty county)
// returns null and the page renders without the block.
import "server-only"

import { supabaseAdmin } from "./supabase-admin"

export type CountyStats = {
  asOf: string // ISO date
  upcoming30: number // sales scheduled in the next 30 days
  upcoming60: number
  past90: number // sales that were scheduled in the last 90 days
  tracked: number // every dated notice we hold for the county
  nextSaleDate: string | null // ISO date of the soonest upcoming sale
  trustees: string[] // most frequent substitute trustees, up to 3
}

// Only the foreclosure family counts as "a trustee sale was noticed".
// Code violations, tax liens and probate carry no sale date anyway, but
// the filter keeps a stray row from inflating the numbers.
const FORECLOSURE_TYPES = [
  "PRE_FORECLOSURE",
  "TRUSTEE_NOTICE",
  "SOT",
  "NOD",
  "FORECLOSURE",
  "LIS_PENDENS",
]

type Row = {
  trustee_sale_date: string | null
  distress_type: string | null
  raw_payload: { structured?: { substitute_trustee?: unknown } } | null
}

function cleanTrustee(v: unknown): string | null {
  if (typeof v !== "string") return null
  const s = v.replace(/\s+/g, " ").replace(/[.,;]+$/, "").trim()
  if (s.length < 4 || s.length > 70) return null
  // Title-case the all-caps names the notices use.
  return s
    .toLowerCase()
    .replace(/\b([a-z])/g, (m) => m.toUpperCase())
    .replace(/\bLlc\b/g, "LLC")
    .replace(/\bPllc\b/g, "PLLC")
    .replace(/\bPc\b/g, "PC")
    .replace(/\bLlp\b/g, "LLP")
}

export async function getCountyStats(county: string): Promise<CountyStats | null> {
  if (!supabaseAdmin) return null
  const pattern = `${county.toLowerCase()}%`
  const select = "trustee_sale_date, distress_type, raw_payload"
  try {
    const [staging, live] = await Promise.all([
      supabaseAdmin
        .from("homeowner_requests_staging")
        .select(select)
        .ilike("county", pattern)
        .in("distress_type", FORECLOSURE_TYPES)
        .not("trustee_sale_date", "is", null)
        .limit(5000),
      supabaseAdmin
        .from("homeowner_requests")
        .select(select)
        .eq("source", "bot")
        .ilike("county", pattern)
        .in("distress_type", FORECLOSURE_TYPES)
        .not("trustee_sale_date", "is", null)
        .limit(5000),
    ])
    if (staging.error || live.error) return null
    const rows: Row[] = [...(staging.data ?? []), ...(live.data ?? [])] as Row[]
    if (rows.length === 0) return null

    const today = new Date()
    today.setUTCHours(0, 0, 0, 0)
    const day = 86_400_000
    const t0 = today.getTime()
    let upcoming30 = 0
    let upcoming60 = 0
    let past90 = 0
    let next: number | null = null
    const trusteeCounts = new Map<string, number>()

    for (const r of rows) {
      const t = r.trustee_sale_date ? Date.parse(r.trustee_sale_date) : NaN
      if (!Number.isNaN(t)) {
        const d = (t - t0) / day
        if (d >= 0 && d <= 30) upcoming30++
        if (d >= 0 && d <= 60) upcoming60++
        if (d < 0 && d >= -90) past90++
        if (d >= 0 && (next === null || t < next)) next = t
      }
      const name = cleanTrustee(r.raw_payload?.structured?.substitute_trustee)
      if (name) trusteeCounts.set(name, (trusteeCounts.get(name) ?? 0) + 1)
    }

    const trustees = [...trusteeCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([n]) => n)

    return {
      asOf: today.toISOString().slice(0, 10),
      upcoming30,
      upcoming60,
      past90,
      tracked: rows.length,
      nextSaleDate: next === null ? null : new Date(next).toISOString().slice(0, 10),
      trustees,
    }
  } catch {
    return null
  }
}

export function fmtDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number)
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  })
}
