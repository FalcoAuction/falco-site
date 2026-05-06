/**
 * Per-distress-type framing for the math sheet.
 *
 * The 3-path math (compute in src/lib/math-sheet.ts) stays the same: ARV,
 * loan, wholesaler offer, marketed auction range. What changes per scenario
 * is the FRAMING — the "do nothing" baseline (Path 1) is different for a
 * probate executor vs. a homeowner facing trustee sale, and the headline
 * the homeowner reads in 5 seconds has to speak to their situation.
 *
 * To add a new scenario: extend the Scenario union, add a config object to
 * SCENARIO_CONFIGS, and (if you want a new distress_type code from the
 * pipeline to map there) add the code to the switch in resolveScenario().
 */

export type Scenario =
  | "foreclosure"
  | "probate"
  | "code_violation"
  | "bankruptcy"
  | "fsbo"
  | "tax_lien"

export type ScenarioConfig = {
  scenario: Scenario
  /** Eyebrow at the top of the printable sheet (replaces "FALCO · YOUR OPTIONS"). */
  headerEyebrow: string
  /** Label for the date field in the facts strip (replaces "Trustee sale"). */
  dateFieldLabel: string
  /** Hero block: the one-sentence bottom line. {range} substitutes the auction net range. */
  heroLine: string
  /** "More than X" comparator for the secondary spread line. e.g. "letting the bank take it". */
  spreadComparator: string
  /** Path 1 (status-quo) card. */
  path1: {
    label: string
    /** Static dollar number to show. Most scenarios = "$0"; code_violation
     *  shows accruing fines + repairs that the homeowner would face. */
    valueText: string
    sub: string
    /** "loss" = red (catastrophic), "meh" = neutral grey (suboptimal but not zero). */
    tone: "loss" | "meh"
  }
  /** Wholesaler section intro paragraph (replaces the foreclosure-flavored one). */
  wholesalerIntro: string
  /** Auction section intro paragraph. */
  auctionIntro: string
  /** Footer methodology bullet for Path 1 (replaces the trustee-sale bullet). */
  methodologyPath1: string
  /** Section header above the next-steps list. */
  ctaHeader: string
  /** True for scenarios where MLS is the homeowner/executor's REAL default
   *  alternative (probate, FSBO). When true the math sheet renders a 4th
   *  path card and a dedicated MLS walkthrough section. */
  showMls: boolean
}

const FORECLOSURE: ScenarioConfig = {
  scenario: "foreclosure",
  headerEyebrow: "FALCO · YOUR OPTIONS",
  dateFieldLabel: "Trustee sale",
  heroLine:
    "By taking your home to a marketed auction instead of letting the trustee sale close, you stand to walk away with {range}.",
  spreadComparator: "letting the bank take it",
  path1: {
    label: "Do nothing",
    valueText: "$0",
    sub: "Bank takes the property for the loan balance on the trustee sale date. Your equity is wiped out.",
    tone: "loss",
  },
  wholesalerIntro:
    "The wholesale industry uses a published formula — the \"70% rule.\" They aren't pulling numbers out of a hat; they're pulling them out of YOU.",
  auctionIntro:
    "Same property. Different process: photos, advertising, a 30–60 day campaign, a defined sale day, and buyers competing openly on price.",
  methodologyPath1:
    "Trustee sale closes at the loan balance — homeowner equity is consumed by the foreclosing lender.",
  ctaHeader: "If you want to move forward",
  showMls: false,
}

const PROBATE: ScenarioConfig = {
  scenario: "probate",
  headerEyebrow: "FALCO · ESTATE OPTIONS",
  dateFieldLabel: "Probate opened",
  heroLine:
    "Run through a marketed auction, the estate nets {range} — clean 30-day close, attorney-friendly, no MLS commission eating into the heirs' share.",
  spreadComparator: "what an MLS listing nets after agent commission and 60–120 days of carrying costs",
  path1: {
    label: "Hold the estate",
    valueText: "—",
    sub: "Property keeps accruing taxes, insurance, and maintenance every month it sits. Probate clock keeps ticking. Heirs see nothing until the estate clears.",
    tone: "meh",
  },
  wholesalerIntro:
    "Wholesalers approach probate executors aggressively because the timeline pressure (close the estate, distribute to heirs) usually pulls a lower-than-market price. Here is the math behind their offer:",
  auctionIntro:
    "Marketed auction is attorney-friendly and probate-court-compatible: 30–45 day campaign, defined sale day, no showings, no commission deducted from the estate. The buyer pays a 10% premium on top of the hammer price.",
  methodologyPath1:
    "\"Hold the estate\" assumes the property is not sold; the estate continues to absorb taxes, insurance, and maintenance until probate closes.",
  ctaHeader: "If the estate wants to move forward",
  showMls: true,
}

const CODE_VIOLATION: ScenarioConfig = {
  scenario: "code_violation",
  headerEyebrow: "FALCO · LIABILITY OPTIONS",
  dateFieldLabel: "Violation issued",
  heroLine:
    "Selling through a marketed auction transfers the violations and clears the liability — net to you: {range}, closed in 30–45 days.",
  spreadComparator: "self-remediating and waiting for a buyer who'll accept it",
  path1: {
    label: "Self-remediate",
    valueText: "Cost + time",
    sub: "Cure the violations yourself: contractor estimates, permits, re-inspections, fines compounding while you wait. Most owners stall and condemnation timelines run.",
    tone: "loss",
  },
  wholesalerIntro:
    "Wholesalers love code-violation properties because the price discount is often steep. Here is the math behind a typical offer:",
  auctionIntro:
    "Auction takes the property as-is. We resolve the open violations after close and the buyer accepts that risk in their bid. 30–45 day campaign with photos and aggressive marketing to investor buyers.",
  methodologyPath1:
    "\"Self-remediate\" assumes the homeowner pays out of pocket to bring the property into compliance and then sells normally. Path 1 net excludes that capital outlay and the months it takes to clear.",
  ctaHeader: "If you want this off your hands",
  showMls: false,
}

const BANKRUPTCY: ScenarioConfig = {
  scenario: "bankruptcy",
  headerEyebrow: "FALCO · § 363 / PRE-PETITION OPTIONS",
  dateFieldLabel: "Petition filed",
  heroLine:
    "Through a court-approved § 363 sale, the asset clears at {range} — maximizing recovery before discharge.",
  spreadComparator: "letting the trustee liquidate at fire-sale pricing",
  path1: {
    label: "Trustee liquidation",
    valueText: "Trustee fee + low",
    sub: "BK trustee sells through their own channels. Standard trustee fees apply, and the timeline often pulls below-market pricing.",
    tone: "loss",
  },
  wholesalerIntro:
    "Wholesalers approach BK debtors and trustees aggressively. Math behind a typical pre-petition offer:",
  auctionIntro:
    "Marketed auction can be structured as a court-approved § 363 sale (Chapter 11) or coordinated with the BK trustee (Chapter 7). 30–45 day campaign, attorney-coordinated, transparent pricing.",
  methodologyPath1:
    "Trustee liquidation values reflect the discount typically applied when a BK trustee sells through their channels under timeline pressure.",
  ctaHeader: "If you want a § 363 sale",
  showMls: false,
}

const FSBO: ScenarioConfig = {
  scenario: "fsbo",
  headerEyebrow: "FALCO · LISTING OPTIONS",
  dateFieldLabel: "Listed",
  heroLine:
    "Auction closes in 30 days at {range} — no seller commission, buyer pays the 10% premium on top.",
  spreadComparator: "an MLS listing after agent commission and 60–120 days of carrying costs",
  path1: {
    label: "Stay on MLS",
    valueText: "Retail − 6%",
    sub: "Average TN FSBO sits 60–120 days. Agent commission (typically 6%) comes out of your proceeds. Carrying costs (mortgage, taxes, insurance) accrue every month.",
    tone: "meh",
  },
  wholesalerIntro:
    "FSBOs get heavy wholesaler outreach. The 70%-rule math behind a typical cash offer:",
  auctionIntro:
    "Marketed auction closes faster than MLS at competitive net. Buyer pays a 10% premium on top of the hammer price; you pay no seller commission. 30–45 day campaign, defined sale day, no contingencies.",
  methodologyPath1:
    "MLS path assumes a 6% agent commission and a typical 60–120 day market exposure for TN FSBO listings.",
  ctaHeader: "If you want a faster close",
  showMls: true,
}

const TAX_LIEN: ScenarioConfig = {
  scenario: "tax_lien",
  headerEyebrow: "FALCO · TAX LIEN OPTIONS",
  dateFieldLabel: "Lien recorded",
  heroLine:
    "Marketed auction nets {range} after the lien is paid at close — clean title, no out-of-pocket lien resolution.",
  spreadComparator: "paying off the lien yourself before listing",
  path1: {
    label: "Pay off lien yourself",
    valueText: "Lien + repairs",
    sub: "Bring the tax lien current out of pocket, then list. Few owners in this position have the cash on hand; most properties end up at tax sale.",
    tone: "loss",
  },
  wholesalerIntro:
    "Wholesalers who target tax-distressed properties bake the lien payoff into their offer (and discount accordingly). The 70%-rule math:",
  auctionIntro:
    "Marketed auction handles the lien at close: the title company pays the county directly out of proceeds, you sign a clean deed, the buyer takes free-and-clear title.",
  methodologyPath1:
    "\"Pay off lien yourself\" path assumes the homeowner has cash on hand to clear the lien before listing.",
  ctaHeader: "If you want clean title at close",
  showMls: false,
}

const SCENARIO_CONFIGS: Record<Scenario, ScenarioConfig> = {
  foreclosure: FORECLOSURE,
  probate: PROBATE,
  code_violation: CODE_VIOLATION,
  bankruptcy: BANKRUPTCY,
  fsbo: FSBO,
  tax_lien: TAX_LIEN,
}

/** Map the pipeline distress_type code → math-sheet scenario. */
export function resolveScenario(distressType: string | null | undefined): ScenarioConfig {
  const t = (distressType || "").toUpperCase()
  switch (t) {
    case "PROBATE":
      return PROBATE
    case "CODE_VIOLATION":
      return CODE_VIOLATION
    case "BANKRUPTCY":
      return BANKRUPTCY
    case "FSBO":
      return FSBO
    case "TAX_LIEN":
      return TAX_LIEN
    case "PRE_FORECLOSURE":
    case "PREFORECLOSURE":
    case "TRUSTEE_NOTICE":
    case "LIS_PENDENS":
    default:
      return FORECLOSURE
  }
}

export function getScenarioConfig(scenario: Scenario): ScenarioConfig {
  return SCENARIO_CONFIGS[scenario]
}
