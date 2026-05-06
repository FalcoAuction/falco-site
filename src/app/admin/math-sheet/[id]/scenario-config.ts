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
  | "bankruptcy_pre_petition"
  | "bankruptcy_363_sale"
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
   *  alternative (probate, FSBO, bankruptcy 363-sale). When true the math
   *  sheet renders a 4th path card and a dedicated MLS walkthrough. */
  showMls: boolean
  /** True when the audience is a BK trustee/court — applies 11 USC § 326
   *  trustee fee to every path and re-labels paths in trustee terms.
   *  Only set on bankruptcy_363_sale today. */
  applyTrusteeFee: boolean
  /** When set, the chrome shows a toggle linking to the sibling scenario
   *  for one-click view switching (e.g. "View as: § 363 sale"). Both
   *  bankruptcy scenarios point at each other. */
  viewToggle?: { label: string; scenario: Scenario }
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
  applyTrusteeFee: false,
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
  applyTrusteeFee: false,
}

const CODE_VIOLATION: ScenarioConfig = {
  scenario: "code_violation",
  headerEyebrow: "FALCO · LIABILITY OPTIONS",
  dateFieldLabel: "Violation issued",
  heroLine:
    "Investor auction transfers the violations to the buyer and clears the liability — net to you {range}, closed in 30–45 days, no out-of-pocket repair, no commission.",
  spreadComparator: "self-remediating: paying for repairs out of pocket while fines accrue every day",
  path1: {
    label: "Self-remediate then sell",
    valueText: "—",  // overridden by computed selfRemediate.netToHomeowner
    sub: "Pay for repairs out of pocket, eat fines while permits and contractors arrange (typically 2–4 months), then list on MLS. Best dollar outcome IF you have the capital, capacity, and patience — most owners in this position don't.",
    tone: "meh",
  },
  wholesalerIntro:
    "Wholesalers target code-violation properties hard because the discount opportunity is steep. They deduct repair cost AND their margin from the offer. Math behind a typical cash offer:",
  auctionIntro:
    "Investor auction means buyers who specialize in rehab compete on price. Property sold as-is — open violations transfer with the deed and the buyer takes responsibility for cure post-close. Realistic clearance is 65–75% of post-repair ARV (lower than standard auction, because investors price in their repair budget). 30–45 day campaign with photos and aggressive investor-pool marketing.",
  methodologyPath1:
    "Self-remediate model: closed price ≈ ARV × 95% (MLS clearance). Subtract out-of-pocket repair budget, fines accrued during cure period (monthly fine × cure months), 6% MLS commission, carrying costs (taxes/insurance/mortgage), and standard closing. MLS-as-is is functionally unavailable because conventional buyer lenders won't lend on properties with open violations — the cure has to happen first.",
  ctaHeader: "If you want this off your hands",
  showMls: false,
  applyTrusteeFee: false,
}

// Two BK flavors with very different audiences and math.
// PRE-PETITION: debtor still controls. They want to sell BEFORE filing
// to avoid losing equity above the TN $7,500 homestead exemption.
// 363 SALE: trustee/attorney post-filing. Trustee will sell. The
// question is "via MLS or via § 363 auction." Trustee fees (11 USC
// § 326) come out of every path's gross.

const BANKRUPTCY_PRE_PETITION: ScenarioConfig = {
  scenario: "bankruptcy_pre_petition",
  headerEyebrow: "FALCO · PRE-PETITION OPTIONS",
  dateFieldLabel: "BK filing planned",
  heroLine:
    "Selling pre-petition through a marketed auction nets you {range} — full proceeds minus loan payoff and closing. Once you file, the BK trustee takes everything above the TN $7,500 homestead exemption.",
  spreadComparator: "filing first and letting the trustee sell post-petition",
  path1: {
    label: "File BK first",
    valueText: "$7,500 (exemption only)",
    sub: "TN homestead exemption is $5,000 individual / $7,500 joint. Above that, the BK trustee captures all proceeds for creditors. You see only the exemption, regardless of equity.",
    tone: "loss",
  },
  wholesalerIntro:
    "Pre-petition wholesalers target debtors aggressively. Math behind a typical cash offer:",
  auctionIntro:
    "Pre-petition marketed auction means YOU control the sale. Full proceeds pass through to you minus loan payoff and closing — no trustee, no creditors at the table. 30–45 day campaign, defined sale day. After you receive funds, you can fund the BK plan or, with debt-counseling guidance, potentially avoid filing entirely.",
  methodologyPath1:
    "\"File BK first\" reflects TN's $5K individual / $7,500 joint homestead exemption (Tenn. Code Ann. § 26-2-301). Above that, the bankruptcy estate keeps proceeds for creditors.",
  ctaHeader: "If you want to sell pre-petition",
  showMls: true,
  applyTrusteeFee: false,
  viewToggle: {
    label: "View as: § 363 sale (post-petition)",
    scenario: "bankruptcy_363_sale",
  },
}

const BANKRUPTCY_363_SALE: ScenarioConfig = {
  scenario: "bankruptcy_363_sale",
  headerEyebrow: "FALCO · § 363 SALE OPTIONS",
  dateFieldLabel: "Petition filed",
  heroLine:
    "A court-approved § 363 marketed auction nets the estate {range} — comparable to MLS recovery without 6% agent commission and 60–90 days of carrying.",
  spreadComparator: "trustee MLS listing through a court-approved broker",
  path1: {
    label: "Trustee MLS listing",
    valueText: "—",
    sub: "Trustee lists through a court-approved broker. 6% commission, 3 months exposure on average, plus statutory trustee fees off the top.",
    tone: "meh",
  },
  wholesalerIntro:
    "Wholesalers occasionally approach BK trustees with cash offers. Most trustees decline (fiduciary duty to maximize recovery), but the math is here for completeness:",
  auctionIntro:
    "§ 363 marketed auction is the BK code's transparent-sale mechanism. Court-approved bidder procedures, 30–45 day exposure, defined sale day, no agent commission. Higher recovery to creditors and faster case closure.",
  methodologyPath1:
    "All paths reflect 11 USC § 326(a) statutory trustee compensation tier (25% / 10% / 5% / 3%). Real fees are billed via Form 4 fee applications and may be lower; the cap is the conservative ceiling.",
  ctaHeader: "If you want a § 363 sale",
  showMls: true,
  applyTrusteeFee: true,
  viewToggle: {
    label: "View as: pre-petition (debtor)",
    scenario: "bankruptcy_pre_petition",
  },
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
  applyTrusteeFee: false,
}

const TAX_LIEN: ScenarioConfig = {
  scenario: "tax_lien",
  headerEyebrow: "FALCO · TAX LIEN OPTIONS",
  dateFieldLabel: "Lien recorded",
  heroLine:
    "Marketed auction nets {range} after the lien is paid at close — clean title, no out-of-pocket lien resolution, sale clears before the next tax sale date.",
  spreadComparator: "letting it go to tax sale",
  path1: {
    label: "Let it go to tax sale",
    valueText: "—",  // overridden by computed taxSale.netToHomeowner in renderer
    sub: "TN chancery court tax sale: minimum bid = back taxes + costs. Investors typically bid 130% of lien or up to ~20% of ARV (whichever is higher). Homeowner walks with whatever's left after the lien clears — usually a fraction of true equity.",
    tone: "loss",
  },
  wholesalerIntro:
    "Wholesalers target tax-distressed properties hard because the time pressure converts. They bake the lien payoff into their offer (and discount accordingly). The 70%-rule math:",
  auctionIntro:
    "Marketed auction handles the lien at close: the title company pays the county directly out of proceeds, you sign a clean deed, the buyer takes free-and-clear title. 30–45 day campaign, generally fits before the next tax sale date.",
  methodologyPath1:
    "Tax sale model: minimum bid = back taxes + statutory costs; investors competing typically push to 130% of lien or up to ~20% of ARV (whichever is higher). Net to original owner = bid − lien − chancery court costs (~$5K). After tax sale, TN gives the original owner a 1-year right of redemption (Tenn. Code Ann. § 67-5-2701) at the bid price + 10% per annum + costs.",
  ctaHeader: "If you want clean title at close",
  showMls: true,
  applyTrusteeFee: false,
}

const SCENARIO_CONFIGS: Record<Scenario, ScenarioConfig> = {
  foreclosure: FORECLOSURE,
  probate: PROBATE,
  code_violation: CODE_VIOLATION,
  bankruptcy_pre_petition: BANKRUPTCY_PRE_PETITION,
  bankruptcy_363_sale: BANKRUPTCY_363_SALE,
  fsbo: FSBO,
  tax_lien: TAX_LIEN,
}

/** Map the pipeline distress_type code → math-sheet scenario.
 *
 * `viewOverride` lets the page route an explicit scenario (e.g. via a
 * ?view=363 query param when toggling between the two BK flows). When
 * provided AND valid, the override wins.
 */
export function resolveScenario(
  distressType: string | null | undefined,
  viewOverride?: string | null,
): ScenarioConfig {
  if (viewOverride && viewOverride in SCENARIO_CONFIGS) {
    return SCENARIO_CONFIGS[viewOverride as Scenario]
  }
  const t = (distressType || "").toUpperCase()
  switch (t) {
    case "PROBATE":
      return PROBATE
    case "CODE_VIOLATION":
      return CODE_VIOLATION
    case "BANKRUPTCY":
      // Default BK distress to pre-petition (debtor audience). The 363
      // sale view is reachable via the chrome toggle / ?view=...
      return BANKRUPTCY_PRE_PETITION
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
