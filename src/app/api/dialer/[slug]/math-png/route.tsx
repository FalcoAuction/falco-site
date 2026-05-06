// GET /api/dialer/[slug]/math-png
// Renders the math sheet as a PNG image suitable for iMessage / SMS / MMS
// attachment. iMessage previews render the image inline in the conversation
// thread — homeowners see the math without tapping anything, no link to
// trust, no app to install.
//
// 1080×1350 (4:5 portrait). Reads as a thumbnail in iMessage AND looks
// crisp when tapped to full screen. Same brutally simple three-path
// layout as the PDF, color-coded so the green box (marketed sale) is the
// obvious win at a glance.
//
// Auth: dialer/operator session (this route is for Patrick to download
// before sending; the public PDF route at /m/[slug] is no longer the
// distribution channel).

import { ImageResponse } from "next/og"
import { NextRequest, NextResponse } from "next/server"
import { getDialerOrOperatorSession } from "@/lib/dialer-session"
import { findDialerInventoryLead } from "@/lib/dialer-inventory"
import { supabaseAdmin } from "@/lib/supabase-admin"
import { defaultInputsFor, computeMath, fmt } from "@/lib/math-sheet"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

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
  return await renderMathPng(req, params).catch((err: unknown) => {
    // Surface the actual error in the response body so we can debug
    // without needing Vercel runtime logs (which are CLI-flaky).
    const msg = err instanceof Error ? `${err.name}: ${err.message}\n${err.stack || ""}` : String(err)
    console.error("math-png crashed:", msg)
    return new NextResponse(`math-png error: ${msg}`, {
      status: 500,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    })
  })
}

async function renderMathPng(
  req: NextRequest,
  params: Promise<{ slug: string }>,
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
      { error: "No AVM on file — can't generate math sheet." },
      { status: 400 }
    )
  }

  const loan = inventory?.mortgageAmount ?? 0
  const payoff = estimatePayoff(loan, inventory?.mortgageDate || null)
  const address = inventory?.address || "(address unknown)"
  const saleDate = inventory?.currentSaleDate || null
  const m = computeMath(defaultInputsFor(arv, payoff))

  // Pull just the street for the headline (city/state don't fit at this size)
  const streetOnly = (() => {
    const mm = address.match(/^[\d-]+\s+([^,]+)/)
    return mm ? `${address.split(",")[0]}` : address.split(",")[0]
  })()

  const wholesaleNet = Math.max(0, m.wholesaler.realisticNet)
  const auctionLow = Math.max(0, m.auction.low.netToHomeowner)
  const auctionHigh = Math.max(0, m.auction.high.netToHomeowner)

  const saleStr = (() => {
    if (!saleDate) return "Pre-foreclosure (no sale date scheduled)"
    const d = new Date(saleDate)
    if (Number.isNaN(d.getTime())) return saleDate
    const dts = Math.ceil((d.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    const pretty = d.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    })
    if (dts < 0) return `Trustee sale: ${pretty} (passed)`
    return `Trustee sale: ${pretty} · ${dts} days from today`
  })()

  // ─── Image layout ────────────────────────────────────────────────────
  // 1080×1350 portrait. iMessage renders this large enough to read inline
  // without expanding — typical preview at ~360px wide on iPhone. All
  // text sized so the take-home dollar amounts are scannable at thumb.

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          width: "100%",
          height: "100%",
          background: "#ffffff",
          padding: "48px 48px 32px",
          fontFamily: "system-ui, -apple-system, sans-serif",
        }}
      >
        {/* HEADER */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            paddingBottom: "20px",
            borderBottom: "2px solid #0f172a",
          }}
        >
          <div
            style={{
              fontSize: "16px",
              color: "#15803d",
              fontWeight: 700,
              letterSpacing: "3px",
              marginBottom: "8px",
            }}
          >
            FALCO · MATH SHEET
          </div>
          <div
            style={{
              fontSize: "44px",
              color: "#0f172a",
              fontWeight: 700,
              lineHeight: 1.1,
              letterSpacing: "-1px",
            }}
          >
            {streetOnly}
          </div>
          <div
            style={{
              fontSize: "20px",
              color: "#475569",
              marginTop: "10px",
            }}
          >
            {saleStr}
          </div>
        </div>

        {/* THREE PATHS */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            marginTop: "28px",
          }}
        >
          {/* PATH 1: WHOLESALE */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              padding: "24px 28px",
              background: "#fef2f2",
              border: "2px solid #dc2626",
              borderRadius: "12px",
              marginBottom: "18px",
            }}
          >
            <div
              style={{
                fontSize: "16px",
                color: "#991b1b",
                fontWeight: 700,
                letterSpacing: "2px",
              }}
            >
              PATH 1 · CASH WHOLESALER
            </div>
            <div
              style={{
                display: "flex",
                marginTop: "14px",
                alignItems: "baseline",
              }}
            >
              <div
                style={{
                  fontSize: "20px",
                  color: "#475569",
                  marginRight: "auto",
                }}
              >
                Your take-home after payoff
              </div>
              <div
                style={{
                  fontSize: "54px",
                  color: "#991b1b",
                  fontWeight: 800,
                  letterSpacing: "-1.5px",
                }}
              >
                {fmt(wholesaleNet)}
              </div>
            </div>
            <div
              style={{
                fontSize: "16px",
                color: "#64748b",
                marginTop: "8px",
              }}
            >
              Closes 14-21 days · Real-world TN distressed offer (45-55% of market)
            </div>
          </div>

          {/* PATH 2: TRUSTEE SALE */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              padding: "24px 28px",
              background: "#f5f5f4",
              border: "2px solid #57534e",
              borderRadius: "12px",
              marginBottom: "18px",
            }}
          >
            <div
              style={{
                fontSize: "16px",
                color: "#44403c",
                fontWeight: 700,
                letterSpacing: "2px",
              }}
            >
              PATH 2 · TRUSTEE SALE RUNS
            </div>
            <div
              style={{
                display: "flex",
                marginTop: "14px",
                alignItems: "baseline",
              }}
            >
              <div
                style={{
                  fontSize: "20px",
                  color: "#475569",
                  marginRight: "auto",
                }}
              >
                Your take-home
              </div>
              <div
                style={{
                  fontSize: "54px",
                  color: "#44403c",
                  fontWeight: 800,
                  letterSpacing: "-1.5px",
                }}
              >
                $0
              </div>
            </div>
            <div
              style={{
                fontSize: "16px",
                color: "#64748b",
                marginTop: "8px",
              }}
            >
              Day of sale · Bank takes back the house, equity wiped
            </div>
          </div>

          {/* PATH 3: MARKETED SALE */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              padding: "24px 28px",
              background: "#f0fdf4",
              border: "2px solid #15803d",
              borderRadius: "12px",
            }}
          >
            <div
              style={{
                fontSize: "16px",
                color: "#166534",
                fontWeight: 700,
                letterSpacing: "2px",
              }}
            >
              PATH 3 · MARKETED SALE
            </div>
            <div
              style={{
                display: "flex",
                marginTop: "14px",
                alignItems: "baseline",
              }}
            >
              <div
                style={{
                  fontSize: "20px",
                  color: "#475569",
                  marginRight: "auto",
                }}
              >
                Your take-home after payoff
              </div>
              <div
                style={{
                  fontSize: "44px",
                  color: "#166534",
                  fontWeight: 800,
                  letterSpacing: "-1.5px",
                }}
              >
                {fmt(auctionLow)}–{fmt(auctionHigh)}
              </div>
            </div>
            <div
              style={{
                fontSize: "16px",
                color: "#64748b",
                marginTop: "8px",
              }}
            >
              Closes 30-45 days · Buyer pays the auction premium, you keep the price
            </div>
          </div>
        </div>

        {/* FOOTER */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            marginTop: "auto",
            paddingTop: "24px",
            borderTop: "1px solid #e2e8f0",
          }}
        >
          <div
            style={{
              fontSize: "14px",
              color: "#94a3b8",
              lineHeight: 1.5,
            }}
          >
            Numbers from public AVM data + FALCO model. Sharpens once we pull
            your actual mortgage payoff letter. Marketed sale routed through
            Parks Auction &amp; Realty (state-licensed, Nashville).
          </div>
          <div
            style={{
              fontSize: "16px",
              color: "#64748b",
              marginTop: "12px",
              fontWeight: 600,
            }}
          >
            FALCO · falco@falco.llc
          </div>
        </div>
      </div>
    ),
    {
      width: 1080,
      height: 1350,
    }
  )
}
