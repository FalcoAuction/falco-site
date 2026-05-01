/**
 * The 3-path comparison math we send to every distressed homeowner.
 *
 * Inputs and assumptions are based on the same numbers the manifesto
 * page sources publicly (70% rule, marketed auction targets 80–88%).
 * Every default is overridable from the admin UI — these are starting
 * points, not commitments.
 */

export type MathInputs = {
  /** After-repair value of the home in dollars. */
  arv: number
  /** Mortgage payoff at trustee sale date. */
  loanBalance: number
  /** Estimated repairs the wholesaler will deduct. Defaults scale with ARV. */
  repairs: number
  /** Wholesaler assignment fee (their cut). Defaults scale with ARV. */
  assignmentFee: number
  /** Investor profit margin baked into the wholesaler's MAO. Defaults scale with ARV. */
  investorMargin: number
  /** Closing costs at marketed sale (title, recording, etc.). Default $5,000. */
  closingCosts: number
  /** Buyer's premium percentage paid by buyer on top of bid. Default 8%. */
  buyerPremiumPct: number
  /** Marketed auction modeled clearance — low end. Default 0.80. */
  auctionMinPct: number
  /** Marketed auction modeled clearance — high end. Default 0.88. */
  auctionMaxPct: number
  /** Worst-case marketed auction clearance for the "even if it goes badly"
   *  comparison. Default 0.70 — substantially below the typical range,
   *  modeling a poorly-attended sale day or weak market. */
  auctionWorstPct: number
  /** 70% rule MAO cap. Default 0.70. */
  wholesalerMaoPct: number
  /** Stretched MAO when wholesaler eats margin to close a thinner deal. Default 0.78. */
  wholesalerStretchPct: number
}

/**
 * Defaults — RECALIBRATED 2026-04-30 to match what TN distressed
 * wholesalers ACTUALLY offer (not the textbook 70% MAO formula).
 *
 * Why the change: the old model (0.70 MAO minus assignmentFee minus
 * investorMargin) showed homeowners wholesaler take-home of $50-150K
 * on properties where actual wholesalers were quoting them $20-40K.
 * Result: homeowners held out for the inflated FALCO-modeled wholesale
 * number, missed the trustee sale, netted $0. The "70% rule" is what
 * an INVESTOR pays the wholesaler — the wholesaler offers BELOW that
 * to capture margin. Real TN distressed cash offers run 45-55% of ARV.
 *
 * New model: cash_offer_to_homeowner = ARV × wholesalerMaoPct (0.55).
 * Repairs/assignment/margin are baked into the spread between offer
 * and resale value. Those line items default to 0 to keep schema
 * compat with admin-overrideable inputs.
 *
 * On a $500K distressed home: cash offer = $275K. After $250K mortgage
 * payoff, homeowner pockets $25K. Matches what wholesalers in Memphis,
 * Nashville, and Knoxville quote.
 */
function defaultRepairs(_arv: number): number {
  return 0  // Baked into the 45% wholesale-spread
}
function defaultAssignmentFee(_arv: number): number {
  return 0  // Baked into the 45% wholesale-spread
}
function defaultInvestorMargin(_arv: number): number {
  return 0  // Baked into the 45% wholesale-spread
}

/** Build sensible defaults for a given property value. */
export function defaultInputsFor(arv: number, loanBalance: number): MathInputs {
  return {
    arv,
    loanBalance,
    repairs: defaultRepairs(arv),
    assignmentFee: defaultAssignmentFee(arv),
    investorMargin: defaultInvestorMargin(arv),
    closingCosts: 5000,
    buyerPremiumPct: 0.08,
    auctionMinPct: 0.80,
    auctionMaxPct: 0.88,
    auctionWorstPct: 0.70,
    // Real-world TN distressed wholesale cap, NOT the textbook 70% rule.
    // 70% is what investors pay; wholesalers offer below that. 55% matches
    // actual cash-offer reality on distressed properties in Middle TN.
    wholesalerMaoPct: 0.55,
    // Stretched: wholesaler reaches if they really want the deal.
    // Still well below the textbook 78%.
    wholesalerStretchPct: 0.62,
  }
}

/** Legacy static defaults — kept for backwards compat with the old admin UI.
 *  Prefer defaultInputsFor() for new callers. */
export const DEFAULT_INPUTS: Omit<MathInputs, "arv" | "loanBalance"> = {
  repairs: 25000,
  assignmentFee: 10000,
  investorMargin: 40000,
  closingCosts: 5000,
  buyerPremiumPct: 0.08,
  auctionMinPct: 0.80,
  auctionMaxPct: 0.88,
  auctionWorstPct: 0.70,
  wholesalerMaoPct: 0.70,
  wholesalerStretchPct: 0.78,
}

/** Three possible wholesaler outcomes for a given property. */
export type WholesalerScenario =
  | "standard"   // pure 70% rule works; this is what they'd offer
  | "stretched"  // standard rule underwater; wholesaler stretches to ~78% to close
  | "walks"      // even stretched is underwater; wholesaler doesn't make an offer

export type WholesalerBreakdown = {
  arv: number
  // Standard 70% rule chain
  maoCeiling: number          // ARV × 0.70
  repairs: number             // shown as deduction
  assignmentFee: number       // shown as deduction
  investorMargin: number      // shown as deduction
  cashOfferStandard: number   // = max(0, MAO - repairs - fee - margin)
  netStandard: number         // cashOfferStandard - loanBalance (may be negative)
  // Stretched scenario — wholesaler at ~78% MAO to close a thinner deal
  cashOfferStretched: number  // = max(0, ARV * 0.78 - repairs - fee - margin)
  netStretched: number        // cashOfferStretched - loanBalance
  // Loan + scenario summary
  loanBalance: number
  scenario: WholesalerScenario
  /** What the homeowner most realistically nets, scenario-aware:
   *  - standard:   netStandard
   *  - stretched:  netStretched
   *  - walks:      0 (no deal happens) */
  realisticNet: number
  /** Human label for the scenario, ready for UI display. */
  scenarioLabel: string
}

export type AuctionScenario = {
  retailPct: number
  winningBid: number
  loanBalance: number   // negative
  closingCosts: number  // negative
  netToHomeowner: number
  buyerPremium: number  // paid by buyer ON TOP of bid (does not affect seller)
}

export type AuctionBreakdown = {
  arv: number
  low: AuctionScenario
  high: AuctionScenario
  worst: AuctionScenario
  /** Range string like "$95,000 – $130,000" for headline use. */
  netRangeLabel: string
  /** % of retail at which auction net would tie the realistic wholesaler net.
   *  Below this, wholesaler beats auction. Above, auction wins. Useful for
   *  the "even at X%, you still beat the wholesaler" callout. */
  breakevenPct: number | null
  /** True if the worst-case auction scenario STILL nets more than the
   *  realistic wholesaler offer. Strongest pitch when true. */
  worstStillBeatsWholesaler: boolean
}

export type MathOutput = {
  inputs: MathInputs
  trusteeNetToHomeowner: number  // = 0
  wholesaler: WholesalerBreakdown
  auction: AuctionBreakdown
  /** The headline number we feature most prominently. */
  spreadEstimate: {
    /** Auction midpoint - realistic wholesaler net. */
    midpointGain: number
    /** Auction high - realistic wholesaler net. */
    bestCaseGain: number
  }
}

/** "Floor of $5K" — wholesalers won't bother closing a deal that nets the
 *  homeowner less than this; they'd walk instead. Realistic threshold based
 *  on the friction cost of any closing (lawyer, title, etc.). */
const WHOLESALER_MIN_NET_TO_CLOSE = 5000

export function computeMath(inputs: MathInputs): MathOutput {
  const totalDeductions = inputs.repairs + inputs.assignmentFee + inputs.investorMargin

  // Standard 70% rule: max(0, MAO - all the deductions)
  const maoCeiling = inputs.arv * inputs.wholesalerMaoPct
  const cashOfferStandard = Math.max(0, maoCeiling - totalDeductions)
  const netStandard = cashOfferStandard - inputs.loanBalance

  // Stretched scenario: wholesaler accepts thinner margin (e.g. 78% MAO)
  // to close a deal that wouldn't pencil at the strict 70% rule. Their
  // own profit is smaller but they get a deal vs. nothing.
  const stretchedCeiling = inputs.arv * inputs.wholesalerStretchPct
  const cashOfferStretched = Math.max(0, stretchedCeiling - totalDeductions)
  const netStretched = cashOfferStretched - inputs.loanBalance

  // Determine which scenario actually plays out:
  // - If standard rule clears the floor → wholesaler offers it
  // - Else if stretched clears the floor → wholesaler stretches
  // - Else → wholesaler walks (no deal, homeowner faces trustee sale)
  let scenario: WholesalerScenario
  let realisticNet: number
  let scenarioLabel: string
  if (netStandard >= WHOLESALER_MIN_NET_TO_CLOSE) {
    scenario = "standard"
    realisticNet = netStandard
    scenarioLabel = "Standard 70% rule offer"
  } else if (netStretched >= WHOLESALER_MIN_NET_TO_CLOSE) {
    scenario = "stretched"
    realisticNet = netStretched
    scenarioLabel = "Stretched offer (wholesaler eats margin to close)"
  } else {
    scenario = "walks"
    realisticNet = 0
    scenarioLabel = "Wholesaler walks — no offer makes economic sense"
  }

  // Auction scenarios
  function scenarioCalc(retailPct: number): AuctionScenario {
    const winningBid = inputs.arv * retailPct
    const buyerPremium = winningBid * inputs.buyerPremiumPct
    const netToHomeowner = winningBid - inputs.loanBalance - inputs.closingCosts
    return {
      retailPct,
      winningBid,
      loanBalance: inputs.loanBalance,
      closingCosts: inputs.closingCosts,
      netToHomeowner,
      buyerPremium,
    }
  }
  const low = scenarioCalc(inputs.auctionMinPct)
  const high = scenarioCalc(inputs.auctionMaxPct)
  const worst = scenarioCalc(inputs.auctionWorstPct)
  const netRangeLabel = `${fmt(low.netToHomeowner)} – ${fmt(high.netToHomeowner)}`

  const auctionMidpointNet = (low.netToHomeowner + high.netToHomeowner) / 2

  // Breakeven: at what % of retail would the auction net match the
  // realistic wholesaler offer? Solve for retailPct given:
  //   bid - loanBalance - closingCosts = realisticNet
  //   arv * retailPct = realisticNet + loanBalance + closingCosts
  let breakevenPct: number | null = null
  if (inputs.arv > 0) {
    const requiredBid = realisticNet + inputs.loanBalance + inputs.closingCosts
    const pct = requiredBid / inputs.arv
    breakevenPct = pct > 0 && pct < 1.5 ? pct : null
  }
  const worstStillBeatsWholesaler = worst.netToHomeowner > realisticNet

  return {
    inputs,
    trusteeNetToHomeowner: 0,
    wholesaler: {
      arv: inputs.arv,
      maoCeiling,
      repairs: inputs.repairs,
      assignmentFee: inputs.assignmentFee,
      investorMargin: inputs.investorMargin,
      cashOfferStandard,
      netStandard,
      cashOfferStretched,
      netStretched,
      loanBalance: inputs.loanBalance,
      scenario,
      realisticNet,
      scenarioLabel,
    },
    auction: {
      arv: inputs.arv,
      low,
      high,
      worst,
      netRangeLabel,
      breakevenPct,
      worstStillBeatsWholesaler,
    },
    spreadEstimate: {
      midpointGain: auctionMidpointNet - realisticNet,
      bestCaseGain: high.netToHomeowner - realisticNet,
    },
  }
}

/** Currency format. */
export function fmt(n: number): string {
  if (!Number.isFinite(n)) return "—"
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  })
}

/** Currency with sign for line items (negative numbers shown as "− $X,XXX"). */
export function fmtSigned(n: number): string {
  if (!Number.isFinite(n)) return "—"
  if (n < 0) return `− ${fmt(Math.abs(n))}`
  return fmt(n)
}
