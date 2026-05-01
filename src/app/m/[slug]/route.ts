// GET /m/[slug]
// Public landing for the one-page math PDF. Linked from the brutal-honest
// opener text Patrick sends to homeowners. No auth — the lead slug is a
// sha40 hash so it's effectively unguessable, and the only thing exposed
// is the auction math for one specific property (no PII).
//
// IP rate limit applied to prevent enumeration / scraping.
//
// Behavior:
//   - default: redirects to falco.llc with PDF inline (browser shows it)
//   - ?dl=1: forces download disposition
//
// 404 if slug not found, has no AVM, or hits rate limit.

import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase-admin"
import { findDialerInventoryLead } from "@/lib/dialer-inventory"
import { buildMathPdf } from "@/lib/math-pdf"
import { getClientIp } from "@/lib/public-form-guard"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

// In-memory rate limit — same pattern as public-form-guard but with its
// own bucket. 30 PDF fetches per IP per hour. Generous because legit
// users may forward the link to spouse/lawyer who load it again.
const buckets = new Map<string, { count: number; resetAt: number }>()
const WINDOW_MS = 60 * 60 * 1000 // 1 hour
const MAX = 30

function allow(ip: string): boolean {
  const now = Date.now()
  const b = buckets.get(ip)
  if (!b || b.resetAt < now) {
    buckets.set(ip, { count: 1, resetAt: now + WINDOW_MS })
    return true
  }
  if (b.count >= MAX) return false
  b.count += 1
  return true
}

function estimatePayoff(orig: number, mortgageDateIso: string | null): number {
  if (!orig || orig <= 0) return 0
  const start = mortgageDateIso ? new Date(mortgageDateIso).getTime() : NaN
  if (Number.isNaN(start)) return Math.round(orig * 0.93)
  const yrs = Math.max(0, (Date.now() - start) / (1000 * 60 * 60 * 24 * 365.25))
  const r = 0.04 / 12
  const n = 360
  const paid = Math.min(yrs * 12, n)
  const remaining = (Math.pow(1 + r, n) - Math.pow(1 + r, paid)) / (Math.pow(1 + r, n) - 1)
  return Math.round(orig * remaining)
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const ip = getClientIp(req) || "unknown"
  if (!allow(ip)) {
    return NextResponse.json({ error: "Rate limited." }, { status: 429 })
  }

  const { slug } = await params
  if (!slug || slug.length < 8) {
    return NextResponse.json({ error: "Invalid link." }, { status: 404 })
  }

  // Resolve slug to a lead. The link Patrick sends uses the FULL
  // pipeline_lead_key, so direct lookup. (If we shorten in the future,
  // switch to LIKE prefix match here.)
  let arv = 0
  let address = ""
  if (supabaseAdmin) {
    const { data } = await supabaseAdmin
      .from("homeowner_requests")
      .select("property_address, property_value")
      .eq("source", "bot")
      .eq("pipeline_lead_key", slug)
      .maybeSingle()
    if (data) {
      const snap = data as unknown as {
        property_address: string | null
        property_value: number | null
      }
      arv = snap.property_value ?? 0
      address = snap.property_address ?? ""
    }
  }

  // Pull mortgage + sale-date context from the dialer inventory snapshot
  // so the PDF has the same data the dialer would render.
  const inventory = await findDialerInventoryLead(slug)
  if (!arv && inventory?.avmMid) arv = inventory.avmMid
  if (!address && inventory?.address) address = inventory.address

  if (!address || arv <= 0) {
    return NextResponse.json(
      { error: "Math not available for this property." },
      { status: 404 }
    )
  }

  const loan = inventory?.mortgageAmount ?? 0
  const payoff = estimatePayoff(loan, inventory?.mortgageDate || null)

  const pdf = await buildMathPdf({
    address,
    saleDate: inventory?.currentSaleDate || null,
    arv,
    payoff,
  })

  const force = req.nextUrl.searchParams.get("dl") === "1"
  const filenameBase = address
    .toLowerCase()
    .replace(/,.*$/, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60)

  return new NextResponse(new Uint8Array(pdf), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${force ? "attachment" : "inline"}; filename="math-${filenameBase}.pdf"`,
      "Cache-Control": "private, max-age=300", // 5 min — sharable but not stale
      "X-Robots-Tag": "noindex, nofollow",
    },
  })
}
