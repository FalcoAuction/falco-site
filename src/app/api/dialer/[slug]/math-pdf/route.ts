// GET /api/dialer/[slug]/math-pdf
// Returns a one-page landscape PDF of the brutal-simple math sheet.
// Used by:
//   - Dialer "Download PDF" button (Patrick attaches to iMessage/text)
//   - send-followup email route (attaches as a "math.pdf" attachment)
// Auth: dialer or operator session.

import { NextRequest, NextResponse } from "next/server"
import { getDialerOrOperatorSession } from "@/lib/dialer-session"
import { findDialerInventoryLead } from "@/lib/dialer-inventory"
import { supabaseAdmin } from "@/lib/supabase-admin"
import { buildMathPdf } from "@/lib/math-pdf"

export const dynamic = "force-dynamic"
export const runtime = "nodejs" // pdfkit needs Node runtime, not edge

// Mortgage payoff estimator — same logic as send-followup route.
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
  const session = getDialerOrOperatorSession(req)
  if (!session) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 })
  }

  const { slug } = await params
  if (!slug) {
    return NextResponse.json({ error: "Missing slug." }, { status: 400 })
  }

  const inventory = await findDialerInventoryLead(slug)

  // Pull freshest property_value from homeowner_requests (BatchData re-enrich)
  let hrArv: number | null = null
  if (supabaseAdmin) {
    const { data } = await supabaseAdmin
      .from("homeowner_requests")
      .select("property_value")
      .eq("source", "bot")
      .eq("pipeline_lead_key", slug)
      .maybeSingle()
    if (data) {
      const snap = data as unknown as { property_value: number | null }
      hrArv = snap.property_value
    }
  }

  const arv = hrArv ?? inventory?.avmMid ?? 0
  if (arv <= 0) {
    return NextResponse.json(
      { error: "No AVM on file — can't generate math sheet yet." },
      { status: 400 }
    )
  }

  const loan = inventory?.mortgageAmount ?? 0
  const payoff = estimatePayoff(loan, inventory?.mortgageDate || null)

  const pdf = await buildMathPdf({
    address: inventory?.address || "(address unknown)",
    saleDate: inventory?.currentSaleDate || null,
    arv,
    payoff,
  })

  // Build a clean filename: "math-720-sweetbrier-rd.pdf"
  const filenameBase = (inventory?.address || "math")
    .toLowerCase()
    .replace(/,.*$/, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60)

  return new NextResponse(new Uint8Array(pdf), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="math-${filenameBase}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  })
}
