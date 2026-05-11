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

// VOICE — calm, helpful, neighbor-tone. Open the door for a
// conversation. Don't lead with the threat (no "Bank takes..."),
// don't weaponize the date or dollar amount, don't ask for immediate
// commitment.
//
// PATTERN: "Hi, Patrick with FALCO. Saw [street] [neutral context].
// I help homeowners in this spot [outcome] at no cost. Around if
// you'd want to talk. No pressure."
//
// No em dashes (AI tell). The "no cost" line is woven into the
// offer, not foregrounded as a flag.

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
  switch (urgency) {
    case "far":
    case "comfortable":
    case "tight":
    case "urgent":
    case "critical":
      return `Hi, Patrick with FALCO. Saw ${streetOnly} on the trustee docket. I help homeowners in this spot keep their options open at no cost. Around if you'd want to talk through what's possible. No pressure.`
    case "past":
      return `Hi, Patrick with FALCO. Saw ${streetOnly} on the trustee docket. If there's still redemption time or another sale coming, I help homeowners in this spot look at what's left. No cost. Around if you'd want to talk.`
    case "unscheduled":
      return `Hi, Patrick with FALCO. Saw ${streetOnly} heading toward a trustee sale. I help homeowners in this spot keep their options open at no cost. Around if you'd want to talk through what's possible. No pressure.`
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
  _constCost: number | null,
): string {
  void _constCost
  switch (subtype) {
    case "teardown":
    case "major_rebuild":
      return `Hi, Patrick with FALCO. Saw the demo permit on ${streetOnly}. I help homeowners in this spot see if selling as-is could beat the demo path. No cost to talk through it. Around if you'd want to chat. No pressure.`
    case "fire_damage":
      return `Hi, Patrick with FALCO. Saw the fire damage permit on ${streetOnly}, sorry you're dealing with that. I help homeowners find buyers who'd take the rebuild themselves. No cost to talk through it. Around if you'd want to chat. No pressure.`
    case "storm_damage":
      return `Hi, Patrick with FALCO. Saw the storm damage permit on ${streetOnly}. I help homeowners find buyers who'd take the rebuild themselves. No cost to talk through it. Around if you'd want to chat. No pressure.`
    case "unknown":
    default:
      return `Hi, Patrick with FALCO. Saw a recent permit on ${streetOnly}. If you'd ever want to look at whether selling as-is beats the rebuild path, I help homeowners think through it at no cost. No pressure.`
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
  return `Hi, Patrick with FALCO. Saw ${streetOnly} is going through probate. I help families and executors look at sale paths that don't eat the heirs' share. No cost to talk through what's possible. Around if you'd want to chat. No pressure.`
}

/**
 * Bankruptcy SMS body. Assumes pre-petition (debtor still controls the
 * property). The pitch is sell BEFORE filing to capture proceeds above
 * the TN $7,500 homestead exemption. Post-petition (§ 363) gets
 * adapted in conversation.
 */
export function bankruptcySmsBody(streetOnly: string): string {
  return `Hi, Patrick with FALCO. Saw ${streetOnly} flagged in a pre-petition window. I help homeowners look at options before the trustee gets involved. No cost to talk it through. Around if you'd want to chat. No pressure.`
}

/**
 * Tax-lien SMS body. Owner has back property taxes accruing. Chancery
 * court tax sale clock is real. Pitch: auction handles lien payoff at
 * close, clean title, no out-of-pocket lien resolution.
 */
export function taxLienSmsBody(streetOnly: string): string {
  return `Hi, Patrick with FALCO. Saw the tax lien on ${streetOnly}. I help homeowners find sale paths that clear the lien at close, no out-of-pocket. No cost to talk it through. Around if you'd want to chat. No pressure.`
}

export function codeViolationSmsBody(
  streetOnly: string,
  _violationCount: number = 0,
): string {
  void _violationCount
  return `Hi, Patrick with FALCO. Saw some open code citations on ${streetOnly}. I help homeowners in this spot find paths that skip the repair bills and commissions, with the violations transferring to the buyer at close. No cost to talk it through. Around if you'd want to chat. No pressure.`
}
