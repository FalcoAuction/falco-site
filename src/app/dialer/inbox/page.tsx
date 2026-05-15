/**
 * AI Inbox — bulk-draft queue for all active foreclosure-family leads.
 *
 * Patrick: "to all leads — everything I've ever touched + everything new."
 *
 * Filter:
 *   - source = 'bot'
 *   - distress_type in foreclosure family
 *   - trustee_sale_date >= today (active sales)
 *   - has phone
 *   - NOT DNC-flagged
 *   - NOT business-owner (LLC / INC / TRUST / etc.)
 *
 * UX (runner.tsx):
 *   - One card visible at a time
 *   - Lazy-loads AI draft via /api/dialer/[slug]/ai-compose (mode auto-
 *     selected: opener if no prior outbound, followup if any)
 *   - Send via Twilio (30s cooldown after each) OR iMessage (no cooldown)
 *   - Skip / Edit / Send actions auto-advance to next lead
 *   - Progress: 14 / 105
 */
import { redirect } from "next/navigation"
import { requireDialerSession } from "../require-session"
import { supabaseAdmin } from "@/lib/supabase-admin"
import { InboxRunner } from "./inbox-runner"

export const dynamic = "force-dynamic"

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
] as const

// Business-name patterns to filter out (matches the auto_promoter's
// LLC regex from falco-distress-bots/_address.py). Defensive — these
// should already be filtered at promotion, but belt and suspenders.
const BUSINESS_RE =
  /\b(LLC|L\.L\.C|INC|CORP|TRUST|HOLDINGS|PROPERTIES|COMPANY|GROUP|PARTNERS|REALTY|INVESTMENT|LP|LLP|FOUNDATION|CHURCH|ESTATES)\b/i

export type InboxLead = {
  slug: string
  ownerName: string
  ownerFirstName: string
  address: string
  county: string
  distressType: string
  saleDate: string | null
  daysToSale: number | null
  arv: number | null
  equity: number | null
  primaryPhone: string
  lineType: string | null
  altCount: number
  priorOutboundCount: number
  hasInboundReply: boolean
  // mode hint for the AI brain: 'opener' if no prior outbound, else 'followup'
  suggestedMode: "opener" | "followup" | "reply"
  lastInboundBody: string | null
}

export default async function InboxPage() {
  const session = await requireDialerSession("/dialer/inbox")
  if (!session) redirect("/dialer/login")

  if (!supabaseAdmin) {
    return (
      <main className="min-h-screen bg-[#060606] text-white p-8">
        <div className="text-red-300">Supabase admin unavailable.</div>
      </main>
    )
  }

  const today = new Date().toISOString().slice(0, 10)

  // 1. Pull active foreclosure-family leads (no per-row N+1; one query)
  const { data: rows, error } = await supabaseAdmin
    .from("homeowner_requests")
    .select(
      "pipeline_lead_key, owner_name_records, full_name, property_address, county, distress_type, trustee_sale_date, property_value, mortgage_balance, phone, alternate_phones, phone_metadata"
    )
    .eq("source", "bot")
    .in("distress_type", FORECLOSURE_DISTRESS as unknown as string[])
    .gte("trustee_sale_date", today)
    .not("phone", "is", null)
    .order("trustee_sale_date", { ascending: true })

  if (error) {
    return (
      <main className="min-h-screen bg-[#060606] text-white p-8">
        <div className="text-red-300">Query error: {error.message}</div>
      </main>
    )
  }

  // 2. For each lead, count prior outbound activity + find UNREPLIED
  // inbound (inbound more recent than our last outbound).
  const slugs = (rows ?? []).map((r) => r.pipeline_lead_key)
  const priorOutbound = new Map<string, number>()
  const inboundByLead = new Map<string, string>() // only set when unreplied
  const lastOutboundTs = new Map<string, number>()
  const lastInboundData = new Map<string, { body: string; ts: number }>()
  if (slugs.length > 0) {
    const { data: acts } = await supabaseAdmin
      .from("dialer_activities")
      .select("listing_slug, notes, occurred_at, channel")
      .in("listing_slug", slugs)
      .eq("channel", "text")
      .order("occurred_at", { ascending: true }) // chronological
    for (const a of acts ?? []) {
      const aTyped = a as { listing_slug: string; notes: string; occurred_at: string }
      const notes = aTyped.notes || ""
      const ts = new Date(aTyped.occurred_at).getTime()
      const isInbound = notes.startsWith("[IN]") || notes.startsWith("[IN ")
      if (isInbound) {
        const body = notes.replace(/^\[IN\]\s*/, "").trim()
        lastInboundData.set(aTyped.listing_slug, { body, ts })
      } else {
        priorOutbound.set(
          aTyped.listing_slug,
          (priorOutbound.get(aTyped.listing_slug) ?? 0) + 1
        )
        lastOutboundTs.set(aTyped.listing_slug, ts)
      }
    }
    // After scanning all activity, inbound is "unreplied" only if it's
    // more recent than the last outbound on that thread (so auto-replied
    // threads don't show up as urgent).
    for (const [slug, inbound] of lastInboundData) {
      const lastOut = lastOutboundTs.get(slug) ?? 0
      if (inbound.ts > lastOut) {
        inboundByLead.set(slug, inbound.body)
      }
    }
  }

  // 3. Shape into InboxLead, filter business owners + DNC
  const leads: InboxLead[] = []
  for (const r of rows ?? []) {
    const owner = (r.owner_name_records || r.full_name || "").trim()
    if (!owner) continue
    if (BUSINESS_RE.test(owner)) continue
    const pm = (r.phone_metadata ?? {}) as Record<string, unknown>
    const dncFlag = (pm["dnc"] ?? pm["dnc_status"] ?? "") as string | boolean
    if (dncFlag === true || dncFlag === "dnc" || dncFlag === "true") continue
    // sale_status manual flag — skip cancelled/reinstated
    const ss = pm["sale_status"] as { status?: string } | undefined
    if (
      ss &&
      (ss.status === "cancelled" ||
        ss.status === "reinstated" ||
        ss.status === "ran")
    ) {
      continue
    }

    const saleDate = (r.trustee_sale_date as string | null) || null
    const saleDtsMs = saleDate ? new Date(saleDate).getTime() - Date.now() : null
    const daysToSale =
      saleDtsMs !== null ? Math.ceil(saleDtsMs / (1000 * 60 * 60 * 24)) : null

    const arv = (r.property_value as number | null) ?? null
    const payoff = (r.mortgage_balance as number | null) ?? 0
    const equity = arv !== null ? arv - payoff : null

    const tw = pm["twilio_lookup"] as { line_type?: string } | undefined
    const lineType = (tw?.line_type as string | undefined) || null

    const slug = r.pipeline_lead_key as string
    const lastInbound = inboundByLead.get(slug) ?? null
    const priorOut = priorOutbound.get(slug) ?? 0
    const suggestedMode: "opener" | "followup" | "reply" = lastInbound
      ? "reply"
      : priorOut > 0
      ? "followup"
      : "opener"

    leads.push({
      slug,
      ownerName: owner,
      ownerFirstName: owner.split(/[\s,]+/)[0] || owner,
      address: (r.property_address as string) || "",
      county: (r.county as string) || "",
      distressType: (r.distress_type as string) || "",
      saleDate,
      daysToSale,
      arv,
      equity,
      primaryPhone: (r.phone as string) || "",
      lineType,
      altCount: Array.isArray(r.alternate_phones)
        ? (r.alternate_phones as unknown[]).length
        : 0,
      priorOutboundCount: priorOut,
      hasInboundReply: !!lastInbound,
      suggestedMode,
      lastInboundBody: lastInbound,
    })
  }

  // 4. Sort: inbound-replies first (hottest), then by sale-date asc,
  // then by equity desc.
  leads.sort((a, b) => {
    if (a.hasInboundReply !== b.hasInboundReply) {
      return a.hasInboundReply ? -1 : 1
    }
    if (a.daysToSale !== b.daysToSale) {
      return (a.daysToSale ?? 999) - (b.daysToSale ?? 999)
    }
    return (b.equity ?? 0) - (a.equity ?? 0)
  })

  return (
    <main className="min-h-screen bg-[#060606] text-white">
      <header className="sticky top-0 z-30 bg-[#060606]/90 backdrop-blur-xl border-b border-white/8">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-5 py-3.5">
          <div className="flex items-center gap-4">
            <a
              href="/dialer"
              className="text-[12px] text-white/55 hover:text-white tracking-wider"
            >
              ← Dialer
            </a>
            <div className="text-[12px] uppercase tracking-[0.22em] text-emerald-300/85 font-semibold">
              AI Inbox · bulk drafts
            </div>
          </div>
          <div className="text-[12px] text-white/60 tabular-nums">
            {leads.length} active leads
          </div>
        </div>
      </header>

      <InboxRunner leads={leads} caller={session.caller || "patrick"} />
    </main>
  )
}
