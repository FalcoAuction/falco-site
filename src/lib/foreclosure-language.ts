/**
 * Foreclosure outreach language — sale-date-aware.
 *
 * The trustee-sale clock changes the conversation. A homeowner with 60
 * days has time to run a full marketed auction. A homeowner with 12 days
 * needs a postponement request to the lender first. Same brand voice,
 * different urgency + path.
 *
 * Both the SMS opener (api/dialer/[slug]/opener-text) and the math
 * sheet hero (math-sheet-content.tsx) read from these helpers so the
 * language is consistent across channels — text and printable both
 * say the same thing about the equity path.
 *
 * Pure functions — no React, no server imports. Safe in client + server.
 */

/** Urgency tier driven by days-to-sale. Used internally to pick copy. */
export type SaleUrgency =
  | "unscheduled"  // pre-foreclosure, no sale date set
  | "far"          // 45+ days — comfortable to run an auction
  | "comfortable"  // 30-45 days — postponement straightforward
  | "tight"        // 14-30 days — postponement viable, urgency rising
  | "urgent"       // 7-14 days — last reasonable window
  | "critical"     // 1-7 days — narrow options
  | "past"         // sale already ran — redemption or next-sale conversation

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

/**
 * SMS opener hook — the lead sentence in the brutal-honest text.
 * Caller wraps this with greeting + signature.
 *
 * Example output for 36-day-out lead:
 *   "36 days to your trustee sale. We can request a postponement from
 *    your lender and run an auction — equity stays with you, not the
 *    bank."
 */
export function foreclosureSmsHook(
  daysToSale: number | null,
  streetOnly: string,
): string {
  const urgency = classifySaleUrgency(daysToSale)
  const dts = daysToSale ?? 0

  switch (urgency) {
    case "far":
      return `${dts} days to your trustee sale. Plenty of room to run a marketed auction inside that window and walk away with your equity instead of zero at the courthouse.`
    case "comfortable":
      return `${dts} days to your trustee sale. We can request a postponement from your lender and run an auction — equity stays with you, not the bank.`
    case "tight":
      return `${dts} days to your trustee sale. Tight window — but with a postponement request to your lender we can still run a marketed auction and protect your equity.`
    case "urgent":
      return `${dts} days to your trustee sale. Tight, but not over. Could mean walking away with your equity instead of zero.`
    case "critical":
      return dts === 0
        ? `Sale's today. Last-window options are narrow but real — equity-protection paths exist if we move now.`
        : `Sale's ${dts} days out. Options are narrow this close but real. Equity-protection paths exist.`
    case "past":
      return `Your trustee sale already ran. If there's still equity to recover or another sale coming, worth a conversation.`
    case "unscheduled":
      return `Pre-foreclosure on ${streetOnly}. Best window to act — run a marketed auction and walk with your equity before the sale gets scheduled.`
  }
}

/**
 * Math sheet hero line — same idea, full sentence, with a {range}
 * placeholder where the auction net range is substituted.
 *
 * Used by math-sheet-content.tsx for foreclosure scenario only.
 * Other scenarios (probate, code violation, BK) use scenario-config's
 * static heroLine — the sale-date dimension only matters for trustee
 * sales.
 *
 * Example output for 36-day-out lead:
 *   "We can request a postponement from your lender and run a 30-day
 *    marketed auction. Net to you instead of zero at the courthouse:
 *    {range}."
 */
export function foreclosureHeroLine(daysToSale: number | null): string {
  const urgency = classifySaleUrgency(daysToSale)
  const dts = daysToSale ?? 0

  switch (urgency) {
    case "far":
      return `Plenty of room to run a marketed auction before your trustee sale date. By auction instead of trustee sale, you walk away with {range}.`
    case "comfortable":
      return `We can request a postponement from your lender and run a 30-day marketed auction. Net to you instead of zero at the courthouse: {range}.`
    case "tight":
      return `Tight window — but with a postponement request to your lender we can still run a marketed auction. Net to you: {range}, instead of zero at the trustee sale.`
    case "urgent":
      return `${dts} days out. Limited options, but the auction route — with a postponement on your loan — could still net you {range}.`
    case "critical":
      return dts === 0
        ? `Sale is today. Last-window options are narrow, but the auction route with an emergency postponement request could still net {range}.`
        : `Sale is days away. Last-window options are narrow but worth knowing — auction with a postponement request could net {range}.`
    case "past":
      return `Your trustee sale already ran. If there's redemption time or another sale coming, the marketed auction route could net {range}.`
    case "unscheduled":
      return `Sale's not scheduled yet — best window to run a marketed auction. Net to you: {range}.`
  }
}

/**
 * Comparator phrase for the secondary spread line ("X more than Y").
 * Used by the math sheet hero to complete the sentence.
 *
 * Foreclosure-only. Other scenarios use scenario-config's spreadComparator.
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
