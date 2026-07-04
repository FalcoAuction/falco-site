// GET /api/cron/sunday-call-sheet
//
// Weekly Sunday-evening email: the top imminent, high-equity,
// reachable trustee-sale leads statewide, plus a three-line pipeline
// pulse. The point: the system pings Patrick once a week with exactly
// who to call — he decides Sunday night whether the week has room to
// swing. No dashboard to remember to check.
//
// Lead bar (mirrors what makes a lead actually callable):
//   - source='bot', trustee-notice/foreclosure family
//   - sale date between tomorrow and +30 days
//   - equity > $25k (known), phone on file
//   - no manual sale_status (cancelled/reinstated/ran)
// Ranked: notice verified-fresh first (seen within 14d), then soonest
// sale, then biggest equity. Top 5 in the email; freshness labeled on
// each so a stale one reads "verify first," not "call now."
//
// Cron: Sunday 23:00 UTC (~6pm CT). Auth: CRON_SECRET bearer.

import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase-admin"
import { Resend } from "resend"

export const dynamic = "force-dynamic"
export const maxDuration = 60

const DIGEST_RECIPIENT =
  process.env.FALCO_DIGEST_EMAIL || "yuriarmour@gmail.com"

const FORECLOSURE_DISTRESS = [
  "PRE_FORECLOSURE",
  "PREFORECLOSURE",
  "TRUSTEE_NOTICE",
  "LIS_PENDENS",
  "SOT",
  "SUBSTITUTION_OF_TRUSTEE",
  "NOD",
  "NOTICE_OF_DEFAULT",
  "FORECLOSURE",
]

type LeadRow = {
  full_name: string | null
  owner_name_records: string | null
  property_address: string | null
  county: string | null
  property_value: number | null
  mortgage_balance: number | null
  trustee_sale_date: string | null
  sale_date_last_seen_at: string | null
  phone: string | null
  phone_metadata: Record<string, unknown> | null
  pipeline_lead_key: string | null
}

function fmtMoney(n: number): string {
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
  return `$${Math.round(n / 1000)}k`
}

function fmtPhone(raw: string): string {
  const d = raw.replace(/\D/g, "").replace(/^1(?=\d{10}$)/, "")
  if (d.length !== 10) return raw
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`
}

export async function GET(req: NextRequest) {
  const cronSecret = (process.env.CRON_SECRET || "").trim()
  if (cronSecret) {
    const authHeader = req.headers.get("authorization") || ""
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
  }

  if (!supabaseAdmin) {
    return NextResponse.json({ error: "Supabase unavailable" }, { status: 503 })
  }
  const resendKey = (process.env.RESEND_API_KEY || "").trim()
  if (!resendKey) {
    return NextResponse.json({ error: "RESEND_API_KEY not set" }, { status: 503 })
  }

  const today = new Date().toISOString().slice(0, 10)
  const in30 = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10)

  // ── Candidate leads ──────────────────────────────────────────────
  const { data: rows, error } = await supabaseAdmin
    .from("homeowner_requests")
    .select(
      "full_name, owner_name_records, property_address, county, property_value, mortgage_balance, trustee_sale_date, sale_date_last_seen_at, phone, phone_metadata, pipeline_lead_key"
    )
    .eq("source", "bot")
    .in("distress_type", FORECLOSURE_DISTRESS)
    .gte("trustee_sale_date", today)
    .lte("trustee_sale_date", in30)
    .gt("property_value", 0)
    .gt("mortgage_balance", 0)
    .not("phone", "is", null)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const now = Date.now()
  const candidates = ((rows || []) as LeadRow[])
    .map((r) => {
      const equity = (r.property_value || 0) - (r.mortgage_balance || 0)
      const equityPct = r.property_value
        ? Math.round((100 * equity) / r.property_value)
        : 0
      const daysToSale = r.trustee_sale_date
        ? Math.ceil((new Date(r.trustee_sale_date).getTime() - now) / 86400000)
        : null
      const seenDaysAgo = r.sale_date_last_seen_at
        ? Math.floor((now - new Date(r.sale_date_last_seen_at).getTime()) / 86400000)
        : null
      const fresh = seenDaysAgo !== null && seenDaysAgo <= 14
      const pm = (r.phone_metadata || {}) as Record<string, unknown>
      const manualStatus =
        ((pm["sale_status"] as Record<string, unknown> | undefined)?.[
          "status"
        ] as string) || ""
      const dncFlag = pm["dnc"] === true || pm["dnc"] === "true"
      return {
        ...r,
        equity,
        equityPct,
        daysToSale,
        seenDaysAgo,
        fresh,
        manualStatus,
        dncFlag,
      }
    })
    .filter(
      (l) =>
        l.equity > 25000 &&
        !l.dncFlag &&
        !["cancelled", "reinstated", "ran"].includes(l.manualStatus) &&
        (l.phone || "").replace(/\D/g, "").length >= 10
    )
    .sort((a, b) => {
      if (a.fresh !== b.fresh) return a.fresh ? -1 : 1
      if (a.daysToSale !== b.daysToSale)
        return (a.daysToSale ?? 99) - (b.daysToSale ?? 99)
      return b.equity - a.equity
    })

  const top = candidates.slice(0, 5)

  // ── Pipeline pulse ───────────────────────────────────────────────
  const weekAgoIso = new Date(now - 7 * 86400000).toISOString()
  const [stagedRes, promotedRes] = await Promise.all([
    supabaseAdmin
      .from("homeowner_requests_staging")
      .select("id", { count: "exact", head: true })
      .gte("staged_at", weekAgoIso),
    supabaseAdmin
      .from("homeowner_requests")
      .select("id", { count: "exact", head: true })
      .eq("source", "bot")
      .gte("submitted_at", weekAgoIso),
  ])
  const stagedWeek = stagedRes.count ?? 0
  const promotedWeek = promotedRes.count ?? 0
  const totalEquityAtRisk = candidates.reduce((s, l) => s + l.equity, 0)

  // ── Email ────────────────────────────────────────────────────────
  const leadBlocks = top
    .map((l, i) => {
      const name =
        (l.full_name || l.owner_name_records || "").trim() ||
        "(pull owner name from county assessor)"
      const freshLabel = l.fresh
        ? `<span style="color:#059669;">verified ${l.seenDaysAgo}d ago</span>`
        : `<span style="color:#b45309;">unseen ${l.seenDaysAgo ?? "?"}d — verify with trustee first</span>`
      return `
      <div style="border:1px solid #e5e7eb; border-radius:10px; padding:14px 16px; margin-bottom:10px;">
        <div style="font-size:15px; font-weight:600;">${i + 1}. ${name}</div>
        <div style="color:#374151; margin-top:2px;">${l.property_address || ""} · ${l.county || ""}</div>
        <div style="margin-top:6px;">
          <strong>${fmtMoney(l.equity)} equity (${l.equityPct}%)</strong>
          · sale ${l.trustee_sale_date} (${l.daysToSale}d)
          · ${freshLabel}
        </div>
        <div style="margin-top:6px; font-size:16px;">
          <a href="tel:${(l.phone || "").replace(/\D/g, "")}" style="color:#111827; text-decoration:none; font-weight:600;">${fmtPhone(l.phone || "")}</a>
        </div>
      </div>`
    })
    .join("\n")

  const html = `<!doctype html><html><body style="font-family: -apple-system, Segoe UI, Roboto, sans-serif; color:#111827; max-width:600px; margin:0 auto; padding:20px;">
  <h1 style="font-size:18px; margin:0 0 4px 0;">FALCO · Sunday call sheet</h1>
  <p style="color:#6b7280; margin:0 0 16px 0; font-size:13px;">
    Top ${top.length} of ${candidates.length} callable leads going to sale in the next 30 days.
    ${fmtMoney(totalEquityAtRisk)} total equity at risk.
  </p>
  ${leadBlocks || `<p>No leads clear the bar this week (equity &gt; $25k, phone, sale inside 30d).</p>`}
  <div style="border-top:1px solid #e5e7eb; margin-top:16px; padding-top:12px; color:#6b7280; font-size:13px;">
    Pipeline pulse: ${stagedWeek} staged this week · ${promotedWeek} promoted · ${candidates.length} callable in next 30d.
  </div>
  <p style="color:#9ca3af; font-size:12px; margin-top:14px;">
    One call is the whole ask. If the week has no room, delete this and the sheet regenerates next Sunday.
  </p>
</body></html>`

  const resend = new Resend(resendKey)
  const subjectLead = top[0]
  const subject = subjectLead
    ? `FALCO Sunday · ${candidates.length} callable · top: ${fmtMoney(subjectLead.equity)} equity, sale in ${subjectLead.daysToSale}d`
    : `FALCO Sunday · no leads clear the bar this week`
  try {
    const { error: sendErr } = await resend.emails.send({
      from: "FALCO <falco@falco.llc>",
      to: [DIGEST_RECIPIENT],
      subject,
      html,
    })
    if (sendErr) {
      return NextResponse.json({ error: String(sendErr) }, { status: 502 })
    }
  } catch (e) {
    return NextResponse.json({ error: String(e).slice(0, 200) }, { status: 502 })
  }

  return NextResponse.json({
    ok: true,
    sent_to: DIGEST_RECIPIENT,
    leads_in_email: top.length,
    callable_total: candidates.length,
    equity_at_risk: totalEquityAtRisk,
    staged_week: stagedWeek,
    promoted_week: promotedWeek,
  })
}
