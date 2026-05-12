// GET /api/dialer/math-pdf-bulk?slugs=slug1,slug2,...
//
// Returns ONE multi-page landscape PDF with a math sheet per slug.
// Used for door-knock days when Patrick needs all his leads' math
// sheets printed at once before heading out.
//
// Auth: dialer or operator session. Same as the per-lead /math-pdf
// route — no public access.

import { NextRequest, NextResponse } from "next/server"
import { getDialerOrOperatorSession } from "@/lib/dialer-session"
import { findDialerInventoryLead } from "@/lib/dialer-inventory"
import { supabaseAdmin } from "@/lib/supabase-admin"
import { buildMultiMathPdf, type MathPdfInput } from "@/lib/math-pdf"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"
export const maxDuration = 60 // allow generous time for 20+ sheet renders

// Same payoff estimator as the per-lead route — kept inline so the
// two endpoints can diverge if needed without coupling.
function estimatePayoff(orig: number, mortgageDateIso: string | null): number {
  if (!orig || orig <= 0) return 0
  const start = mortgageDateIso ? new Date(mortgageDateIso).getTime() : NaN
  if (Number.isNaN(start)) return Math.round(orig * 0.93)
  const yrs = Math.max(0, (Date.now() - start) / (1000 * 60 * 60 * 24 * 365.25))
  const r = 0.04 / 12
  const n = 360
  const paid = Math.min(yrs * 12, n)
  const remaining =
    (Math.pow(1 + r, n) - Math.pow(1 + r, paid)) / (Math.pow(1 + r, n) - 1)
  return Math.round(orig * remaining)
}

export async function GET(req: NextRequest) {
  const session = getDialerOrOperatorSession(req)
  if (!session) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 })
  }

  const slugsParam = req.nextUrl.searchParams.get("slugs") || ""
  const slugs = slugsParam
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)

  if (slugs.length === 0) {
    return NextResponse.json(
      { error: "Missing slugs. Pass ?slugs=a,b,c" },
      { status: 400 },
    )
  }
  if (slugs.length > 50) {
    return NextResponse.json(
      { error: "Too many slugs. Max 50 per request." },
      { status: 400 },
    )
  }

  // For each slug, fetch inventory + freshest property_value from HR.
  const inputs: MathPdfInput[] = []
  const failures: { slug: string; reason: string }[] = []

  for (const slug of slugs) {
    try {
      const inventory = await findDialerInventoryLead(slug)
      if (!inventory) {
        failures.push({ slug, reason: "lead_not_found" })
        continue
      }

      // Pull freshest property_value + owner name from homeowner_requests
      let hrArv: number | null = null
      let hrOwner: string | null = null
      if (supabaseAdmin) {
        const { data } = await supabaseAdmin
          .from("homeowner_requests")
          .select("property_value, owner_name_records, full_name")
          .eq("source", "bot")
          .eq("pipeline_lead_key", slug)
          .maybeSingle()
        if (data) {
          const snap = data as unknown as {
            property_value: number | null
            owner_name_records: string | null
            full_name: string | null
          }
          hrArv = snap.property_value
          hrOwner = snap.owner_name_records || snap.full_name || null
        }
      }

      const arv = hrArv ?? inventory.avmMid ?? 0
      if (arv <= 0) {
        failures.push({ slug, reason: "no_arv" })
        continue
      }

      const loan = inventory.mortgageAmount ?? 0
      const payoff = estimatePayoff(loan, inventory.mortgageDate || null)
      const ownerName = hrOwner || inventory.ownerName || null

      inputs.push({
        address: inventory.address || "(address unknown)",
        saleDate: inventory.currentSaleDate || null,
        arv,
        payoff,
        ownerName,
      })
    } catch (err) {
      failures.push({
        slug,
        reason: err instanceof Error ? err.message : "unknown_error",
      })
    }
  }

  if (inputs.length === 0) {
    return NextResponse.json(
      {
        error: "No usable leads in slug list.",
        failures,
      },
      { status: 400 },
    )
  }

  const pdf = await buildMultiMathPdf(inputs)

  const today = new Date().toISOString().slice(0, 10)
  const filename = `falco-math-sheets-${today}-${inputs.length}-leads.pdf`

  return new NextResponse(new Uint8Array(pdf), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store",
      "X-Lead-Count": String(inputs.length),
      "X-Failure-Count": String(failures.length),
    },
  })
}
