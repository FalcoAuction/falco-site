import Link from "next/link"
import type { DialerLead } from "@/lib/dialer-data"
import type { PitchBucket } from "@/lib/dialer-inventory"

type Lead = DialerLead & {
  avmMid?: number | null
  avmLow?: number | null
  avmHigh?: number | null
  pitchBucket?: PitchBucket
  mortgageDefensible?: boolean
  mortgageLenderResolved?: string
  mortgageOriginationYear?: number
  mortgageRatePct?: number
  equityAmount?: number
}

function fmtCurrency(n: number | null | undefined): string {
  if (n === null || n === undefined) return "—"
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 })
}

function daysToSale(iso: string | null | undefined): number | null {
  if (!iso) return null
  const ms = new Date(iso).getTime() - Date.now()
  if (Number.isNaN(ms)) return null
  return Math.ceil(ms / (1000 * 60 * 60 * 24))
}

function firstName(full: string | null | undefined): string {
  if (!full) return ""
  return full.split(/\s+/)[0]
}

/**
 * Pitch panel — the rep's ten-second briefing per lead.
 *
 * Renders an opener tailored to the lead's pitch bucket plus a tight
 * row of "numbers that matter" for THIS conversation. For
 * EQUITY_PROTECT (foreclosure with equity), routes to the math sheet
 * which is already the right tool. For other buckets, renders bucket-
 * specific framing instead — a math sheet would deflate the call.
 */
export function PitchPanel({ lead }: { lead: Lead }) {
  const bucket = lead.pitchBucket ?? "UNCLASSIFIED"
  const dts = daysToSale(lead.currentSaleDate)
  const fname = firstName(lead.ownerName)
  const avm = lead.avmMid
  const balance = lead.mortgageAmount
  const equity = lead.equityAmount ?? (avm && balance ? avm - balance : null) ?? null
  const lender = lead.mortgageLenderResolved ?? lead.mortgageLender ?? null

  // Per-bucket label, tone, and opener
  const bucketSpec = SPECS[bucket](lead, { dts, fname, avm, balance, equity, lender })

  return (
    <section className={`mt-4 rounded-2xl border p-4 ${bucketSpec.tone.border} ${bucketSpec.tone.bg}`}>
      <div className="flex items-baseline justify-between gap-3 flex-wrap">
        <div className={`text-[10px] uppercase tracking-wider font-semibold ${bucketSpec.tone.label}`}>
          {bucketSpec.label}
        </div>
        {bucketSpec.urgency && (
          <div className={`text-[10px] uppercase tracking-wider ${bucketSpec.tone.urgency}`}>
            {bucketSpec.urgency}
          </div>
        )}
      </div>

      {/* Opener — copy/paste opening line for the call */}
      <p className={`mt-2 text-sm leading-relaxed ${bucketSpec.tone.opener}`}>
        {bucketSpec.opener}
      </p>

      {/* Key numbers — the 3-4 facts that matter for THIS bucket */}
      {bucketSpec.keyNumbers.length > 0 && (
        <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2">
          {bucketSpec.keyNumbers.map((kn) => (
            <div
              key={kn.label}
              className="rounded-lg bg-black/25 border border-white/8 px-3 py-2"
            >
              <div className="text-[9px] uppercase tracking-wider text-white/50">
                {kn.label}
              </div>
              <div className={`mt-0.5 text-sm font-semibold ${kn.tone ?? "text-white"}`}>
                {kn.value}
              </div>
              {kn.subtitle && (
                <div className="text-[10px] text-white/45 mt-0.5">{kn.subtitle}</div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Action — primary CTA per bucket */}
      {bucketSpec.cta && (
        <Link
          href={bucketSpec.cta.href.replace("{slug}", lead.slug)}
          className={`mt-3 inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs uppercase tracking-wider transition-colors ${bucketSpec.tone.cta}`}
        >
          {bucketSpec.cta.label} →
        </Link>
      )}
    </section>
  )
}

// ─── Per-bucket specs ───────────────────────────────────────────────────

type SpecArgs = {
  dts: number | null
  fname: string
  avm: number | null | undefined
  balance: number | null | undefined
  equity: number | null
  lender: string | null
}

type Tone = {
  border: string
  bg: string
  label: string
  opener: string
  urgency: string
  cta: string
}

type BucketSpec = {
  label: string
  opener: string
  urgency?: string
  keyNumbers: Array<{
    label: string
    value: string
    subtitle?: string
    tone?: string
  }>
  cta?: { label: string; href: string }
  tone: Tone
}

const TONE_GREEN: Tone = {
  border: "border-emerald-400/35",
  bg: "bg-emerald-400/[0.05]",
  label: "text-emerald-300",
  opener: "text-emerald-50/90",
  urgency: "text-emerald-300/70",
  cta: "border-emerald-400/45 bg-emerald-400/15 text-emerald-100 hover:bg-emerald-400/25",
}
const TONE_RED: Tone = {
  border: "border-red-400/35",
  bg: "bg-red-400/[0.06]",
  label: "text-red-300",
  opener: "text-red-50/90",
  urgency: "text-red-300/80",
  cta: "border-red-400/45 bg-red-400/15 text-red-100 hover:bg-red-400/25",
}
const TONE_AMBER: Tone = {
  border: "border-amber-400/35",
  bg: "bg-amber-400/[0.05]",
  label: "text-amber-300",
  opener: "text-amber-50/90",
  urgency: "text-amber-300/80",
  cta: "border-amber-400/45 bg-amber-400/15 text-amber-100 hover:bg-amber-400/25",
}
const TONE_BLUE: Tone = {
  border: "border-blue-400/35",
  bg: "bg-blue-400/[0.05]",
  label: "text-blue-300",
  opener: "text-blue-50/90",
  urgency: "text-blue-300/80",
  cta: "border-blue-400/45 bg-blue-400/15 text-blue-100 hover:bg-blue-400/25",
}
const TONE_VIOLET: Tone = {
  border: "border-violet-400/35",
  bg: "bg-violet-400/[0.05]",
  label: "text-violet-300",
  opener: "text-violet-50/90",
  urgency: "text-violet-300/80",
  cta: "border-violet-400/45 bg-violet-400/15 text-violet-100 hover:bg-violet-400/25",
}
const TONE_NEUTRAL: Tone = {
  border: "border-white/15",
  bg: "bg-white/[0.03]",
  label: "text-white/65",
  opener: "text-white/85",
  urgency: "text-white/45",
  cta: "border-white/20 bg-white/[0.06] text-white hover:bg-white/[0.10]",
}

const SPECS: Record<PitchBucket, (l: Lead, a: SpecArgs) => BucketSpec> = {
  EQUITY_PROTECT: (lead, a) => ({
    label: "Equity Protect · Math Sheet First",
    urgency: a.dts !== null ? `Sale in ${a.dts}d` : undefined,
    opener: a.fname
      ? `"Hi ${a.fname}, I'm calling about the property at ${lead.address}. I see a notice of sale${a.dts !== null ? ` ${a.dts} days out` : ""}. Property's worth around ${fmtCurrency(a.avm)}, you've got about ${fmtCurrency(a.equity)} of equity, and if we do nothing the trustee sale wipes most of that out. Got 5 minutes to walk through three options?"`
      : `"Hi, I'm calling about the property at ${lead.address}. Notice of sale${a.dts !== null ? ` ${a.dts} days out` : ""}. About ${fmtCurrency(a.equity)} of equity at risk. Three paths I want to walk you through — got 5 minutes?"`,
    keyNumbers: [
      { label: "Equity at Risk", value: fmtCurrency(a.equity), tone: "text-emerald-200" },
      { label: "Sale Date", value: a.dts !== null ? `${a.dts}d` : "—", subtitle: lead.currentSaleDate ?? "" },
      { label: "Loan Balance", value: fmtCurrency(a.balance), subtitle: a.lender ?? "" },
      { label: "Market Value", value: fmtCurrency(a.avm) },
    ],
    cta: { label: "Open Math Sheet", href: "/dialer/{slug}/math-sheet" },
    tone: TONE_GREEN,
  }),

  LOW_EQUITY_FC: (lead, a) => ({
    label: "Low-Equity Foreclosure · Stop the Sale",
    urgency: a.dts !== null ? `Sale in ${a.dts}d` : undefined,
    opener: a.fname
      ? `"Hi ${a.fname}, I'm calling about your property at ${lead.address}. I want to be straight with you — there isn't a lot of equity here, but the bigger issue is your credit. A trustee sale stays on your record for 7 years. We can stop the sale and help you exit clean instead. Worth a 5-minute call?"`
      : `"Hi, calling about ${lead.address}. We can stop the trustee sale and help with relocation/credit protection — has more value than the math here. Worth talking?"`,
    keyNumbers: [
      { label: "Equity", value: fmtCurrency(a.equity), tone: a.equity && a.equity < 0 ? "text-red-300" : "text-white/75" },
      { label: "Sale Date", value: a.dts !== null ? `${a.dts}d` : "—" },
      { label: "Loan Balance", value: fmtCurrency(a.balance), subtitle: a.lender ?? "" },
      { label: "Credit Impact", value: "7 yrs", subtitle: "trustee sale on record" },
    ],
    cta: { label: "Open Math Sheet (compare paths)", href: "/dialer/{slug}/math-sheet" },
    tone: TONE_AMBER,
  }),

  UNDERWATER: (lead, a) => ({
    label: "Underwater · Stop-the-Bleed",
    urgency: a.dts !== null ? `Sale in ${a.dts}d` : undefined,
    opener: a.fname
      ? `"Hi ${a.fname}, I want to be honest with you — the loan balance is currently above the property value, so a normal sale isn't going to net you anything. What we CAN do: stop the trustee sale, work a short-sale or deed-in-lieu with the lender, and get you out clean instead of a 7-year foreclosure on your record. Worth a call?"`
      : `"Hi, calling about ${lead.address}. Loan exceeds value — short-sale or DIL is the play here. Stop the foreclosure mark on credit. Worth talking?"`,
    keyNumbers: [
      { label: "Underwater By", value: fmtCurrency(a.equity ? -a.equity : null), tone: "text-red-300" },
      { label: "Sale Date", value: a.dts !== null ? `${a.dts}d` : "—" },
      { label: "Loan Balance", value: fmtCurrency(a.balance), subtitle: a.lender ?? "" },
      { label: "Credit Impact", value: "7 yrs", subtitle: "if foreclosed" },
    ],
    tone: TONE_RED,
  }),

  PROBATE: (lead, a) => ({
    label: "Probate · Estate Net to Heirs",
    opener: `"Hi, I'm calling about the estate property at ${lead.address}. As executor you're balancing the probate close-out clock and net to the heirs. Most estates lose 8–12% to MLS commission, holding costs, and family disagreement. We can close clean in 30 days at a competitive number — attorney-friendly, no showings. Estate nets approximately ${fmtCurrency(a.equity)}. Time to look at numbers?"`,
    keyNumbers: [
      { label: "Estimated Estate Net", value: fmtCurrency(a.equity), tone: "text-violet-200" },
      { label: "Market Value", value: fmtCurrency(a.avm) },
      { label: "Loan Balance", value: fmtCurrency(a.balance), subtitle: a.lender ?? "" },
      { label: "Approach", value: "Attorney-friendly", subtitle: "30-day close" },
    ],
    tone: TONE_VIOLET,
  }),

  CODE_VIOLATION: (lead, a) => ({
    label: "Code Violation · Liability Transfer",
    opener: a.fname
      ? `"Hi ${a.fname}, calling about your property at ${lead.address}. Codes has issued violations and fines compound — most owners don't realize how fast condemnation timelines move. We can take the property as-is, resolve the violations, and close in 30 days. Worth 5 minutes to walk through?"`
      : `"Hi, calling about ${lead.address}. We resolve code violations + close fast — take the headache off your hands. Worth a call?"`,
    keyNumbers: [
      { label: "Property Value", value: fmtCurrency(a.avm), subtitle: "as-is, before rehab" },
      { label: "Loan Balance", value: fmtCurrency(a.balance) },
      { label: "Close Time", value: "30 days", subtitle: "as-is, no showings" },
      { label: "Equity (est.)", value: fmtCurrency(a.equity) },
    ],
    tone: TONE_BLUE,
  }),

  BANKRUPTCY: (lead) => ({
    label: "Bankruptcy · 363 Sale / Pre-Petition",
    opener: `"Hi, I'm calling about ${lead.address}. We work with debtors in Chapter 7 and 13 to maximize asset value before discharge — § 363 sales, pre-petition transfers, attorney-coordinated. Want me to send a one-pager?"`,
    keyNumbers: [
      { label: "Approach", value: "§ 363 sale", subtitle: "court-approved" },
      { label: "Coordination", value: "Attorney + Trustee", subtitle: "we manage" },
    ],
    tone: TONE_BLUE,
  }),

  FSBO: (lead, a) => ({
    label: "FSBO · Auction-vs-MLS",
    opener: a.fname
      ? `"Hi ${a.fname}, I see your property at ${lead.address} is for sale. Most FSBOs sit 60–120 days. Auction can close in 30 with a guaranteed close date and net comparable to MLS after commission. Want to compare numbers?"`
      : `"Hi, your property at ${lead.address} is FSBO. Auction is faster than MLS, comparable net. Worth comparing?"`,
    keyNumbers: [
      { label: "Auction Close", value: "30 days", subtitle: "vs MLS 60–120" },
      { label: "Market Value", value: fmtCurrency(a.avm) },
      { label: "Net @ Auction", value: fmtCurrency(a.avm ? Math.round(a.avm * 0.91) : null), subtitle: "after 9% commission" },
    ],
    tone: TONE_BLUE,
  }),

  LLC_INVESTOR: (lead, a) => ({
    label: "LLC / Investor · Net Comparator",
    opener: `"Hi, this is FALCO. I see ${lead.ownerName} owns ${lead.address}. We move distressed properties through certified auction in 21–30 days at competitive net. ${a.dts !== null ? `Trustee sale's ${a.dts} days out — ` : ""}worth comparing numbers?"`,
    keyNumbers: [
      { label: "Market Value", value: fmtCurrency(a.avm) },
      { label: "Loan Balance", value: fmtCurrency(a.balance), subtitle: a.lender ?? "" },
      { label: "Net @ Auction", value: fmtCurrency(a.avm && a.balance ? Math.round(a.avm * 0.91 - a.balance) : null), subtitle: "after 9% commission" },
      { label: "Close Speed", value: "21–30 days" },
    ],
    tone: TONE_BLUE,
  }),

  UNCLASSIFIED: (lead, a) => ({
    label: "Unclassified · Manual Review",
    opener: `Lead doesn't fit a standard pitch bucket. Property at ${lead.address}, owner ${lead.ownerName ?? "unknown"}. Use the data below to choose an approach.`,
    keyNumbers: [
      { label: "Market Value", value: fmtCurrency(a.avm) },
      { label: "Loan Balance", value: fmtCurrency(a.balance) },
    ],
    tone: TONE_NEUTRAL,
  }),
}
