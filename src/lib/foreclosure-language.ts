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

const STANDARD_DISQUALIFIER =
  "We're not wholesalers. We do not charge commissions. We work to keep your equity in your hands, not extract it."

const SIGNATURE = "— Patrick Armour / FALCO"

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
  const open = foreclosureOpener(urgency, dts, streetOnly)
  const path = foreclosurePathLine(urgency)
  return [
    `${open} ${STANDARD_DISQUALIFIER}`,
    "",
    path,
    "",
    "Math sheet attached.",
    "",
    SIGNATURE,
  ].join("\n")
}

function foreclosureOpener(
  urgency: SaleUrgency,
  dts: number,
  streetOnly: string,
): string {
  switch (urgency) {
    case "far":
    case "comfortable":
    case "tight":
    case "urgent":
      return `${dts} days to your trustee sale.`
    case "critical":
      return dts === 0
        ? `Your trustee sale is today.`
        : `${dts} days to your trustee sale.`
    case "past":
      return `Your trustee sale already ran.`
    case "unscheduled":
      return `Pre-foreclosure on ${streetOnly}.`
  }
}

function foreclosurePathLine(urgency: SaleUrgency): string {
  switch (urgency) {
    case "far":
      return "If you're willing to speak to our auction partner, there's room to run a marketed auction inside that window — homeowner walks away with the equity instead of zero at the courthouse."
    case "comfortable":
      return "If you're willing to speak to our auction partner, we can request a postponement from your lender and run a marketed auction. Equity stays in your hands."
    case "tight":
      return "If you're willing to speak to our auction partner, we could possibly expedite a postponement of the sale and run a marketed auction. Window's tight, but it exists."
    case "urgent":
      return "If you're willing to speak to our auction partner, we could possibly expedite a postponement. Options are narrow, but they exist."
    case "critical":
      return "If you're willing to speak to our auction partner, an emergency postponement could still be possible. Options are narrow, but they exist."
    case "past":
      return "If there's still equity to recover or another sale coming, our auction partner can walk you through the math — what's possible, what isn't."
    case "unscheduled":
      return "Best window to act is before a sale gets scheduled. Our auction partner can run a marketed auction and have you walking away with the equity, on your timeline."
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
      return `Plenty of room to run a marketed auction before your trustee sale date — net to you instead of zero at the courthouse: {range}.`
    case "comfortable":
      return `With a postponement request to your lender, we can run a 30-day marketed auction. Net to you instead of zero at the courthouse: {range}.`
    case "tight":
      return `Tight window — but with a postponement request we could still run a marketed auction. Net to you: {range}, instead of zero at the trustee sale.`
    case "urgent":
      return `${dts} days out. Limited options — but the auction route, with an expedited postponement, could still net you {range}.`
    case "critical":
      return dts === 0
        ? `Sale is today. Last-window options are narrow — an emergency postponement + marketed auction could still net {range}.`
        : `Sale is days away. Last-window options are narrow — an expedited postponement + marketed auction could still net {range}.`
    case "past":
      return `Your trustee sale already ran. If there's redemption time or another sale coming, the marketed auction route could net {range}.`
    case "unscheduled":
      return `Sale's not scheduled yet — the strongest window to run a marketed auction. Net to you: {range}.`
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
