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
      return `Saw ${streetOnly} on the foreclosure list. When the bank takes the house at the sale, you lose the house and any money in it above what you owe the bank. I help homeowners save that money before that happens. No cost to you. Text me if I can help. Patrick at FALCO.`
    case "past":
      return `Saw ${streetOnly} on the foreclosure list. If there's still redemption time or another sale coming, there may still be money to recover. I help homeowners in your spot at no cost. Text me if I can help. Patrick at FALCO.`
    case "unscheduled":
      return `Saw ${streetOnly} heading toward a foreclosure sale. When the bank takes the house at the sale, you lose the house and any money in it above what you owe the bank. I help homeowners save that money before that happens. No cost to you. Text me if I can help. Patrick at FALCO.`
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
      return `Saw the demo permit on ${streetOnly}. Tearing the house down loses the value it has standing right now. I help homeowners sell it before the demo, so they walk away with cash. No cost to you. Text me if I can help. Patrick at FALCO.`
    case "fire_damage":
      return `Saw the fire damage permit on ${streetOnly}, sorry you are dealing with that. Rebuilding is expensive and takes months. I help homeowners sell the property as is, so they walk with cash. No cost to you. Text me if I can help. Patrick at FALCO.`
    case "storm_damage":
      return `Saw the storm damage permit on ${streetOnly}. Rebuilding is expensive and takes months. I help homeowners sell the property as is, so the buyer takes on the rebuild. No cost to you. Text me if I can help. Patrick at FALCO.`
    case "unknown":
    default:
      return `Saw a recent permit on ${streetOnly}. Rebuilding takes months and real money. I help homeowners sell as is and walk with cash instead. No cost to you. Text me if I can help. Patrick at FALCO.`
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
  return `Saw ${streetOnly} going through probate. Estates lose money every month the property sits, and a 6% MLS commission eats more. I help estates close faster without that commission. No cost to the estate. Text me if I can help. Patrick at FALCO.`
}

/**
 * Bankruptcy SMS body. Assumes pre-petition (debtor still controls the
 * property). The pitch is sell BEFORE filing to capture proceeds above
 * the TN $7,500 homestead exemption. Post-petition (§ 363) gets
 * adapted in conversation.
 */
export function bankruptcySmsBody(streetOnly: string): string {
  return `Saw ${streetOnly} flagged before a bankruptcy filing. Once you file, the trustee takes any money above the $7,500 TN exemption. I help homeowners sell first so they keep what is theirs. No cost to you. Text me if I can help. Patrick at FALCO.`
}

/**
 * Tax-lien SMS body. Owner has back property taxes accruing. Chancery
 * court tax sale clock is real. Pitch: auction handles lien payoff at
 * close, clean title, no out-of-pocket lien resolution.
 */
export function taxLienSmsBody(streetOnly: string): string {
  return `Saw the tax lien on ${streetOnly}. Eventually the county forces a tax sale and the homeowner usually walks away with very little. I help homeowners sell first, with the lien paid at close. No cost to you. Text me if I can help. Patrick at FALCO.`
}

export function codeViolationSmsBody(
  streetOnly: string,
  _violationCount: number = 0,
): string {
  void _violationCount
  return `Saw open code violations on ${streetOnly}. Citations stack up daily, and eventually the city forces a sale or you pay big repair bills. I help homeowners sell as is so the buyer takes on the citations. No cost to you. Text me if I can help. Patrick at FALCO.`
}
