/**
 * Foreclosure outreach language — sale-date-aware.
 *
 * Voice + format calibrated from the text Patrick sent that drew the
 * first homeowner response. Multi-line, no greeting, the disqualifier
 * + commission line lead, then the path, then the math, then full sig.
 *
 *   "{N} days to your trustee sale. We're not wholesalers. We do not
 *    charge commissions. We work to keep your equity in your hands,
 *    not extract it.
 *
 *    If you're willing to speak to our auction partner, we could
 *    possibly expedite a postponement of the sale. Options are
 *    narrow, but they exist.
 *
 *    Math sheet attached.
 *
 *    — Patrick Armour / FALCO"
 *
 * The SMS opener route + math sheet hero both read from these helpers
 * so what the homeowner sees on their phone matches the printable.
 *
 * Pure functions — no React, no server imports. Safe in client + server.
 */

/** Urgency tier driven by days-to-sale. */
export type SaleUrgency =
  | "unscheduled"
  | "far"
  | "comfortable"
  | "tight"
  | "urgent"
  | "critical"
  | "past"

export function classifySaleUrgency(daysToSale: number | null): SaleUrgency {
  if (daysToSale === null) return "unscheduled"
  if (daysToSale < 0) return "past"
  if (daysToSale === 0) return "critical"
  if (daysToSale < 7) return "critical"
  if (daysToSale < 14) return "urgent"
  if (daysToSale < 30) return "tight"
  if (daysToSale < 45) return "comfortable"
  return "far"
}

// No em dashes anywhere in SMS bodies. They read as AI-generated and
// trash the credibility of a cold outreach. Periods, commas, or split
// sentences instead.
//
// "No cost to you" is FALCO's primary differentiator vs wholesalers
// (30-45% spread), agents (6% commission), and attorneys (hourly).
// Every body foregrounds it; never bury it in a disqualifier list.

const SIGNATURE = "Patrick"

/**
 * Full SMS body for foreclosure leads — multi-line, no greeting,
 * paragraphs separated by blank lines. Caller does not add a greeting
 * prefix or signature; this returns the complete body verbatim.
 */
export function foreclosureSmsBody(
  daysToSale: number | null,
  streetOnly: string,
): string {
  const urgency = classifySaleUrgency(daysToSale)
  const dts = daysToSale ?? 0
  switch (urgency) {
    case "far":
    case "comfortable":
      return `Bank takes ${streetOnly} in ${dts} days. Whatever equity you have goes with it. We can run a marketed auction so it stays in your hands. Costs $0. Worth 10 minutes? ${SIGNATURE}`
    case "tight":
    case "urgent":
      return `Bank takes ${streetOnly} in ${dts} days. Whatever equity you have goes with it. We can postpone and run a marketed auction so it stays in your hands. Costs $0. Worth 10 minutes? ${SIGNATURE}`
    case "critical":
      return dts === 0
        ? `Bank takes ${streetOnly} TODAY. Emergency postponement plus auction could still save the equity. Costs $0. Call me? ${SIGNATURE}`
        : `Bank takes ${streetOnly} in ${dts} days. Emergency postponement plus auction could still save the equity. Costs $0. Worth 10 minutes? ${SIGNATURE}`
    case "past":
      return `Bank took ${streetOnly} at the trustee sale. If there's redemption time or another sale coming, we can walk you through what's left. Costs $0. Worth 10 minutes? ${SIGNATURE}`
    case "unscheduled":
      return `${streetOnly} is heading to a trustee sale. Best window to act is before it gets scheduled. Marketed auction keeps the equity in your hands. Costs $0. Worth 10 minutes? ${SIGNATURE}`
  }
}

/**
 * Math sheet hero line — same path messaging, sentence form, with a
 * {range} placeholder for the auction net range.
 *
 * Used by math-sheet-content.tsx for foreclosure scenario only.
 */
export function foreclosureHeroLine(daysToSale: number | null): string {
  const urgency = classifySaleUrgency(daysToSale)
  const dts = daysToSale ?? 0

  switch (urgency) {
    case "far":
      return `Plenty of room to run a marketed auction before your trustee sale date. Net to you instead of zero at the courthouse: {range}.`
    case "comfortable":
      return `With a postponement request to your lender, we can run a 30-day marketed auction. Net to you instead of zero at the courthouse: {range}.`
    case "tight":
      return `Tight window. With a postponement request we could still run a marketed auction. Net to you: {range}, instead of zero at the trustee sale.`
    case "urgent":
      return `${dts} days out. Options are limited, but the auction route with an expedited postponement could still net you {range}.`
    case "critical":
      return dts === 0
        ? `Sale is today. Last-window options are narrow. An emergency postponement plus marketed auction could still net {range}.`
        : `Sale is days away. Last-window options are narrow. An expedited postponement plus marketed auction could still net {range}.`
    case "past":
      return `Your trustee sale already ran. If there's redemption time or another sale coming, the marketed auction route could net {range}.`
    case "unscheduled":
      return `Sale isn't scheduled yet. That's the strongest window to run a marketed auction. Net to you: {range}.`
  }
}

/**
 * Comparator phrase for the secondary spread line ("X more than Y").
 * Foreclosure-only.
 */
export function foreclosureSpreadComparator(daysToSale: number | null): string {
  const urgency = classifySaleUrgency(daysToSale)
  switch (urgency) {
    case "past":
      return "what's typically left after a trustee sale already ran"
    case "unscheduled":
      return "letting the foreclosure process advance to a scheduled sale"
    default:
      return "letting the bank take it at the trustee sale"
  }
}

/**
 * Full SMS body for code-violation leads. Different framing than
 * foreclosure: the homeowner isn't necessarily behind on a mortgage,
 * they're carrying an open code-enforcement liability with fines that
 * accrue daily. The auction pitch is "transfer the violation to the
 * buyer and clear the liability" — same phrasing as the math sheet
 * hero so the homeowner sees consistency between the text and the
 * attached image.
 *
 * Voice (calibrated 2026-05-08): role-clarity ("not wholesalers, we
 * run sales for owners") leads, since CV leads are even more prone
 * to the buyer-vs-seller-rep confusion than foreclosure leads.
 * "No commissions ever" is a stronger no-strings disqualifier than
 * the foreclosure body's commission line.
 */
/**
 * Full SMS body for demolition / fire-damage / storm-damage permit leads.
 *
 * The owner has already paid the city for a permit and committed to a
 * costly path: tear down + rebuild OR rehab a damaged structure. They're
 * NOT in foreclosure. They've made a calculated decision but probably
 * don't realize the auction-now alternative captures the standing
 * structure's value before they spend $$$ on demo or rehab.
 *
 * Three variants by subtype:
 *   - teardown:     pure demolition permit (residential)
 *   - fire_damage:  fire-damage rehab permit
 *   - storm_damage: storm-damage rehab permit
 *
 * Voice mirrors codeViolationSmsBody: role-clarity first, then path,
 * then math sheet hook. No commission line — these owners aren't
 * thinking about commissions, they're thinking about the demo bill or
 * the rehab estimate.
 */
export type DemolitionSubtype =
  | "teardown"
  | "fire_damage"
  | "storm_damage"
  | "major_rebuild"
  | "unknown"

export function demolitionSmsBody(
  subtype: DemolitionSubtype,
  streetOnly: string,
  constCost: number | null,
): string {
  const cost = constCost && constCost > 0 ? formatCostShort(constCost) : null

  switch (subtype) {
    case "teardown":
    case "major_rebuild": {
      const threat = cost
        ? `Tearing down ${streetOnly} costs you ${cost} plus months of carry.`
        : `Tearing down ${streetOnly} costs you tens of thousands plus months of carry.`
      return `${threat} Selling it as-is right now puts cash in your hand instead, buyer handles the demo. Costs $0. Worth 10 minutes? ${SIGNATURE}`
    }
    case "fire_damage": {
      const threat = cost
        ? `Fire damage rehab on ${streetOnly} runs ${cost} plus months of carry.`
        : `Fire damage rehab on ${streetOnly} runs into six figures plus months of carry.`
      return `${threat} Investor buyers pay cash for it as-is, no repair bills. Costs $0. Worth 10 minutes? ${SIGNATURE}`
    }
    case "storm_damage": {
      const threat = cost
        ? `Storm damage rehab on ${streetOnly} runs ${cost} plus months of carry.`
        : `Storm damage rehab on ${streetOnly} eats months of carry and a real bill.`
      return `${threat} Investor buyers pay cash for it as-is and take on the rebuild. Costs $0. Worth 10 minutes? ${SIGNATURE}`
    }
    case "unknown":
    default:
      return `Saw a recent permit on ${streetOnly}. If selling as-is beats the rebuild, we can run a marketed auction with no repair bills and no carrying costs. Costs $0. Worth 10 minutes? ${SIGNATURE}`
  }
}

function formatCostShort(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`
  if (n >= 1_000) return `$${Math.round(n / 1_000)}K`
  return `$${n.toFixed(0)}`
}

/**
 * Probate SMS body. Addressed to the executor / heir. Tone is
 * respectful (someone died) but practical: the property is costing the
 * estate money every month and an auction is cleaner than MLS for
 * probate-court timelines.
 */
export function probateSmsBody(streetOnly: string): string {
  return `MLS commission on ${streetOnly} would eat 6% of the heirs' share, plus 60 to 120 days of carry. Marketed auction is attorney-friendly, closes in 30 days, no commission. Costs the estate $0. Worth 10 minutes? ${SIGNATURE}`
}

/**
 * Bankruptcy SMS body. Assumes pre-petition (debtor still controls the
 * property). The pitch is sell BEFORE filing to capture proceeds above
 * the TN $7,500 homestead exemption. Post-petition (§ 363) gets
 * adapted in conversation.
 */
export function bankruptcySmsBody(streetOnly: string): string {
  return `File BK on ${streetOnly} and the trustee takes everything above the $7,500 TN homestead exemption. Sell before you file and you keep all of it. Costs $0. Worth 10 minutes? ${SIGNATURE}`
}

/**
 * Tax-lien SMS body. Owner has back property taxes accruing. Chancery
 * court tax sale clock is real. Pitch: auction handles lien payoff at
 * close, clean title, no out-of-pocket lien resolution.
 */
export function taxLienSmsBody(streetOnly: string): string {
  return `Tax lien on ${streetOnly} with the chancery court sale clock running. We auction it and the title company pays the county at close, you sign a clean deed. Costs $0. Worth 10 minutes? ${SIGNATURE}`
}

export function codeViolationSmsBody(
  streetOnly: string,
  violationCount: number = 0,
): string {
  const threat =
    violationCount >= 2
      ? `${violationCount} citations on ${streetOnly} and the fines accrue daily.`
      : `Open code citations on ${streetOnly} and the fines accrue daily.`
  return `${threat} Sell it as-is and the violations transfer to the buyer at closing. Equity stays in your pocket instead of the city's. Costs $0. Worth 10 minutes? ${SIGNATURE}`
}
