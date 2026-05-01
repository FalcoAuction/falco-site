#!/usr/bin/env node
/**
 * Renders the actual follow-up emails that would be sent to each priority
 * lead — same logic as /api/dialer/send-followup, output as markdown so
 * Patrick can review before clicking Send Follow-up Email in the dialer.
 *
 * Mirrors:
 *   - FSBO vs distressed branching (FSBO gets a different non-math pitch)
 *   - Standard 70% wholesaler scenario (NOT the inconsistent stretched/std mix)
 *
 * Run:
 *   node scripts/preview-followup-emails.mjs > preview.md
 */

import fs from "node:fs"
import path from "node:path"
import { createClient } from "@supabase/supabase-js"

function parseEnvFile(p) {
  if (!fs.existsSync(p)) return {}
  const out = {}
  for (const raw of fs.readFileSync(p, "utf8").split(/\r?\n/)) {
    const line = raw.trim()
    if (!line || line.startsWith("#")) continue
    const eq = line.indexOf("=")
    if (eq < 0) continue
    let val = line.slice(eq + 1).trim()
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1)
    }
    val = val.replace(/\\n$/g, "").trim()
    out[line.slice(0, eq).trim()] = val
  }
  return out
}

const ROOT = path.resolve(process.cwd())
const VERCEL_ENV = parseEnvFile(path.join(ROOT, ".env.vercel.production"))
const env = (n) => process.env[n] || VERCEL_ENV[n] || ""

const SUPABASE_URL = env("NEXT_PUBLIC_SUPABASE_URL") || env("SUPABASE_URL")
const SUPABASE_KEY = env("SUPABASE_SERVICE_ROLE_KEY")

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false },
})

// ---------- math (mirrors src/lib/math-sheet.ts) ----------
// Recalibrated 2026-04-30 — match what TN distressed wholesalers actually
// offer (45-55% of ARV cash to homeowner). Repairs/assignment/margin are
// baked into the spread, not deducted as line items. See math-sheet.ts.
function defaultRepairs(_arv) { return 0 }
function defaultAssignmentFee(_arv) { return 0 }
function defaultInvestorMargin(_arv) { return 0 }
function defaultInputsFor(arv, loanBalance) {
  return {
    arv,
    loanBalance,
    repairs: 0,
    assignmentFee: 0,
    investorMargin: 0,
    closingCosts: 5000,
    buyerPremiumPct: 0.08,
    auctionMinPct: 0.80,
    auctionMaxPct: 0.88,
    auctionWorstPct: 0.70,
    wholesalerMaoPct: 0.55,
    wholesalerStretchPct: 0.62,
  }
}
const WHOLESALER_MIN_NET = 5000
function computeMath(inp) {
  const totalDed = inp.repairs + inp.assignmentFee + inp.investorMargin
  // Standard 70% scenario — used consistently for line items + take-home
  const cashOfferStandard = Math.max(0, inp.arv * inp.wholesalerMaoPct - totalDed)
  const netStandard = cashOfferStandard - inp.loanBalance
  // Stretched only used to test "would the deal still happen" — not displayed
  const cashOfferStretched = Math.max(0, inp.arv * inp.wholesalerStretchPct - totalDed)
  const netStretched = cashOfferStretched - inp.loanBalance
  const realisticNet =
    netStandard >= WHOLESALER_MIN_NET ? netStandard
    : netStretched >= WHOLESALER_MIN_NET ? netStretched
    : 0
  // Clamp at $0 — never display negative take-home
  const auctionLow = Math.max(0, inp.arv * inp.auctionMinPct - inp.loanBalance - inp.closingCosts)
  const auctionHigh = Math.max(0, inp.arv * inp.auctionMaxPct - inp.loanBalance - inp.closingCosts)
  const auctionWorst = Math.max(0, inp.arv * inp.auctionWorstPct - inp.loanBalance - inp.closingCosts)
  const worstStillBeatsWholesaler = auctionWorst > realisticNet
  return {
    cashOfferStandard,
    realisticNet,
    auctionLow,
    auctionHigh,
    auctionWorst,
    worstStillBeatsWholesaler,
  }
}
function fmt(n) {
  if (!Number.isFinite(n)) return "—"
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 })
}

function firstName(full) {
  const t = (full || "").trim()
  if (!t) return ""
  const f = t.split(/\s+/)[0]
  if (f === f.toUpperCase()) return f.charAt(0) + f.slice(1).toLowerCase()
  return f
}

function streetOnly(addr) {
  if (!addr) return "your property"
  const m = addr.match(/^[\d-]+\s+([^,]+)/)
  return m ? m[1].trim() : addr.split(",")[0]
}

function estimatePayoff(orig, mortgageDateIso) {
  if (!orig || orig <= 0) return null
  if (!mortgageDateIso) return Math.round(orig * 0.93)
  const start = new Date(mortgageDateIso).getTime()
  if (Number.isNaN(start)) return Math.round(orig * 0.93)
  const yrs = Math.max(0, (Date.now() - start) / (1000 * 60 * 60 * 24 * 365.25))
  const r = 0.04 / 12
  const n = 360
  const paid = Math.min(yrs * 12, n)
  const remaining = (Math.pow(1 + r, n) - Math.pow(1 + r, paid)) / (Math.pow(1 + r, n) - 1)
  return Math.round(orig * remaining)
}

// ---------- main ----------
const { data, error } = await supabase
  .from("homeowner_requests")
  .select("property_address, county, full_name, owner_name_records, email, phone, property_value, mortgage_balance, trustee_sale_date, distress_type")
  .eq("source", "bot")
  .not("email", "is", null)
  .not("property_value", "is", null)
  .not("email", "eq", "")
  .order("property_value", { ascending: false })

if (error) {
  console.error("fetch error:", error.message)
  process.exit(1)
}

const callerName = "Patrick"
const middleTNCounties = ["davidson", "williamson", "wilson", "sumner", "rutherford", "cheatham", "robertson", "dickson", "maury", "montgomery"]
const filtered = data.filter((r) => {
  const c = (r.county || "").toLowerCase()
  return middleTNCounties.some((mtn) => c.includes(mtn))
})

console.log(`# Email Previews — ${filtered.length} priority leads with emails\n`)
console.log(`Sender: \`Patrick / FALCO <falco@falco.llc>\`\n`)
console.log(`Each email below is what the lead would receive if you click "Send follow-up email" in the dialer for that property.\n`)
console.log(`Branched by category:\n- **Underwater** (payoff > 90% of AVM): no math sheet — asks homeowner to verify payoff before modeling.\n- **FSBO**: non-foreclosure pitch focused on FSBO trade-offs.\n- **Distressed** (trustee notice / lis pendens / NOD): full 3-path math.\n`)
console.log(`---\n`)

filtered.forEach((lead, i) => {
  const ownerFull = lead.full_name || lead.owner_name_records || ""
  const greeting = firstName(ownerFull) || "there"
  const street = streetOnly(lead.property_address)
  const arv = lead.property_value
  const loan = lead.mortgage_balance || 0
  const payoff = estimatePayoff(loan, null) || loan

  const isFSBO = (lead.distress_type || "").toUpperCase() === "FSBO"
  const isUnderwater = arv > 0 && payoff > arv * 0.90

  const branchLabel = isUnderwater
    ? " · _underwater branch_"
    : isFSBO
    ? " · _FSBO branch_"
    : " · _distressed branch_"

  console.log(`## ${i + 1}. ${lead.property_address}`)
  console.log()
  console.log(`**To:** ${lead.email}`)
  console.log(`**Owner:** ${ownerFull || "(unknown)"}`)
  console.log(`**County / Distress:** ${lead.county} / ${lead.distress_type || "—"}${branchLabel}`)
  console.log(`**AVM:** ${fmt(arv)}${loan ? ` · est. payoff ${fmt(payoff)}` : " · no mortgage data"}`)
  console.log(`**Sale date:** ${lead.trustee_sale_date || "Pre-foreclosure (no date)"}`)
  console.log()

  if (isUnderwater) {
    // ── Underwater branch: payoff verification, no math ──
    const subject = `${street} — quick question on your mortgage payoff`
    const body = [
      `Hi ${greeting},`,
      ``,
      `Pulled what I could on ${lead.property_address} from public records. Based on what's filed, your loan payoff looks like it's right around — or above — the current market value of the house.`,
      ``,
      `Two things that's usually true:`,
      ``,
      `  • The recorded balance is often stale by years, or it stacks a HELOC on top of the first mortgage. Your real payoff might be $30K-$80K lower.`,
      `  • If the payoff really is at or above market, the cleanest path is usually a short-sale negotiation with your lender before the trustee sale runs — they often write off the deficiency rather than take the property back.`,
      ``,
      `Easiest way to get clarity: pull your most recent mortgage statement (or call the servicer's payoff line) and reply with the actual number. I'll re-run the comparison with real data — takes me about ten minutes — and we'll know exactly which path makes sense.`,
      ``,
      `No pressure, no sales pitch. If you'd rather just text me back the payoff number, that works too.`,
      ``,
      `— ${callerName}`,
      `FALCO · falco@falco.llc`,
    ].join("\n")

    console.log(`**Subject:** \`${subject}\``)
    console.log()
    console.log("```")
    console.log(body)
    console.log("```")
    console.log()
    console.log("---")
    console.log()
    return
  }

  if (isFSBO) {
    // ── FSBO branch: no math sheet, no foreclosure framing ──
    const subject = `${street} — quick note on your FSBO listing`
    const body = [
      `Hi ${greeting},`,
      ``,
      `Saw your property at ${lead.property_address} is listed for sale by owner. Most folks in your spot are doing it to keep more of the sale price (no 6% agent commission), but the trade-off is the open-ended timeline and managing inquiries yourself.`,
      ``,
      `If you've been at it a while, or just want a different option on the table, we route properties like yours through marketed auction with Parks Auction & Realty here in Nashville. A few things that tend to make sense for FSBO sellers:`,
      ``,
      `  • Defined sale date — typically 30-45 days from listing to close`,
      `  • The buyer pays the premium, so your sale price stays cleaner`,
      `  • Broad buyer pool — Parks has 40K+ active investors on their list`,
      `  • No showings, no repeated negotiations`,
      ``,
      `Won't always be the right move — depends on your situation. If it's worth a quick conversation, just reply or text the number that called you. No pressure either way.`,
      ``,
      `— ${callerName}`,
      `FALCO · falco@falco.llc`,
    ].join("\n")

    console.log(`**Subject:** \`${subject}\``)
    console.log()
    console.log("```")
    console.log(body)
    console.log("```")
    console.log()
    console.log("---")
    console.log()
    return
  }

  // ── Distressed branch: full math sheet ──
  const m = computeMath(defaultInputsFor(arv, payoff))
  const inputs = defaultInputsFor(arv, payoff)
  const subject = `${street} — quick numbers worth seeing`

  // Brutal opener + three-number table + full math sheet (PDF attached
  // in the actual email; preview shows the inline text version).
  const body = [
    `The wholesale offers calling you don't get better — they get worse as the sale date gets closer. Here's what your house actually clears, three ways:`,
    ``,
    `  Cash wholesaler — your take-home:  ${fmt(m.realisticNet)}`,
    `  Trustee sale (do nothing):         $0`,
    `  Marketed sale — your take-home:    ${fmt(m.auctionLow)} – ${fmt(m.auctionHigh)}`,
    ``,
    `One-page PDF attached with the full breakdown. Detail follows below in case the PDF doesn't render.`,
    ``,
    `─────────────────────────────────────────────────────────`,
    `PATH 1 · Cash wholesaler offer`,
    `─────────────────────────────────────────────────────────`,
    `  Property value (AVM):              ${fmt(arv)}`,
    `  Cash offer (real distressed comps): ${fmt(m.cashOfferStandard)}`,
    `  Less mortgage payoff (est.):     − ${fmt(payoff)}`,
    `  Your take-home:                    ${fmt(m.realisticNet)}`,
    `  (Reflects what TN cash buyers actually offer — 45-55% of market.`,
    `   Not the textbook 70% rule — that's what investors pay wholesalers,`,
    `   not what wholesalers pay you.)`,
    ``,
    `─────────────────────────────────────────────────────────`,
    `PATH 2 · If the trustee sale runs (no listing)`,
    `─────────────────────────────────────────────────────────`,
    `  Sells at the courthouse for whatever the bank needs to recover.`,
    `  Equity wiped. Almost always $0 to the homeowner.`,
    ``,
    `─────────────────────────────────────────────────────────`,
    `PATH 3 · Marketed sale (Parks Auction & Realty, state-licensed)`,
    `─────────────────────────────────────────────────────────`,
    `  Property value (AVM):              ${fmt(arv)}`,
    `  Modeled clearance range:           80% – 88%`,
    `  Winning bid range:                 ${fmt(arv * 0.8)} – ${fmt(arv * 0.88)}`,
    `  Less mortgage payoff (est.):     − ${fmt(payoff)}`,
    `  Less closing costs:              − ${fmt(inputs.closingCosts)}`,
    `  Your take-home:                    ${fmt(m.auctionLow)} – ${fmt(m.auctionHigh)}`,
    `  Buyer pays the auction premium, not you.`,
    ``,
    m.worstStillBeatsWholesaler
      ? `  Worst-case auction (~70% clearance): ${fmt(m.auctionWorst)} — still beats the wholesaler.`
      : `  Worst-case auction (~70% clearance): ${fmt(m.auctionWorst)}`,
    ``,
    `Reply or text back if you want to talk through it. If you don't, I'm not going to keep emailing — wanted you to have the actual math once.`,
    ``,
    `— ${callerName}`,
    `FALCO · falco@falco.llc`,
  ].join("\n")

  console.log(`**Subject:** \`${subject}\``)
  console.log()
  console.log("```")
  console.log(body)
  console.log("```")
  console.log()
  console.log("---")
  console.log()
})
