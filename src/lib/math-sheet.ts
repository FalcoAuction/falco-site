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
  /** Buyer's premium percentage paid by buyer on top of bid. Default 10% —
   *  FALCO's standard BP. The seller never sees this; it sits on top of
   *  the hammer price and covers the auction firm + FALCO. */
  buyerPremiumPct: number
  /** Marketed auction modeled clearance — low end. Default 0.80. */
  auctionMinPct: number
  /** Marketed auction modeled clearance — high end. Default 0.88. */
  auctionMaxPct: number
  /** Worst-case marketed auction clearance for the "even if it goes badly"
   *  comparison. Default 0.70 — substantially below the typical range,
   *  modeling a poorly-attended sale day or weak market. */
  auctionWorstPct: number
  /** Distressed cash-offer cap to the homeowner. Default 0.55. */
  wholesalerMaoPct: number
  /** Stretched cash-offer cap when a wholesaler reaches to close. Default 0.62. */
  wholesalerStretchPct: number
  /** Outstanding property-tax lien (back taxes + interest + costs). Paid
   *  at close out of proceeds on every sale path; deducted alongside loan
   *  payoff. 0 for non-tax-lien properties. */
  taxLienAmount: number
  /** Apply 11 USC § 326 statutory trustee compensation tier to all path
   *  gross proceeds. Used for the bankruptcy_363_sale scenario where a
   *  Chapter 7 / 11 trustee is selling and is compensated out of the
   *  estate before any net is computed. False elsewhere. */
  applyTrusteeFee: boolean
  /** MLS clearance — what an agent-listed property typically closes at as a
   *  fraction of asking. Default 0.95 (agents over-list ~5%). */
  mlsClearancePct: number
  /** Agent commission percentage on MLS gross sale price. Default 0.06
   *  (3% listing + 3% buy-side, the TN norm). Buyer-side commission is
   *  legally negotiable post-NAR settlement but most TN deals still end up
   *  ~6% total. */
  mlsCommissionPct: number
  /** Carrying cost per month while a property is on MLS — taxes,
   *  insurance, utilities, lawn care, and (for non-probate) mortgage
   *  payment. Default $1,500/mo. */
  mlsCarryingPerMonth: number
  /** Months a typical MLS listing sits before closing in TN. Default 3
   *  (60-120 day mid-point). */
  mlsCarryingMonths: number
  /** Monthly fine accrual rate in dollars — used by the code_violation
   *  scenario's self-remediate path. 0 elsewhere. */
  monthlyFineAccrual: number
  /** Months of self-remediation work modeled (permits + contractors +
   *  re-inspection). Used to compute fines accrued during the cure
   *  period. 0 elsewhere; default 3 for code_violation. */
  repairMonths: number
  /** Demolition / fire-rehab "stay the course" path inputs. All 0 by
   *  default; populated by the math sheet renderer when scenario is
   *  "demolition" (driven by extractDemolitionData). */
  demolitionCost: number
  /** New construction cost (teardown subtype) OR rehab cost (fire /
   *  storm subtype). For teardown, defaults to sqft × $200/sqft.
   *  For fire/storm, comes from the permit's Const_Cost directly. */
  constructionCost: number
  /** Modeled months of construction / rehab. */
  constructionMonths: number
  /** Per-month carrying cost during construction (taxes, insurance,
   *  mortgage if any, lawn). Default $1,500/mo same as MLS carry. */
  constructionCarryPerMonth: number
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
    buyerPremiumPct: 0.10,
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
    // Tax lien — most leads have $0 here. The TAX_LIEN scenario expects
    // the rep to override this on the input panel before printing.
    taxLienAmount: 0,
    // BK trustee compensation — only applied when scenario is § 363 sale
    // (post-petition). Default off.
    applyTrusteeFee: false,
    // MLS — what most homeowners (or executors) think is their default option.
    // 95% of asking is the typical clearance; 6% commission is TN norm;
    // ~$1,500/mo carrying for ~3 months exposure is a representative bleed.
    mlsClearancePct: 0.95,
    mlsCommissionPct: 0.06,
    mlsCarryingPerMonth: 1500,
    mlsCarryingMonths: 3,
    // Code-violation self-remediate path defaults to 0 fines / 0 months
    // (no-op for non-CV scenarios). The renderer seeds non-zero defaults
    // when scenarioCfg.scenario === "code_violation".
    monthlyFineAccrual: 0,
    repairMonths: 0,
    // Demolition route defaults to 0 (no-op for non-demo scenarios). The
    // renderer seeds non-zero defaults when scenarioCfg.scenario ===
    // "demolition" (using Const_Cost from the permit + sqft × $200/sqft).
    demolitionCost: 0,
    constructionCost: 0,
    constructionMonths: 0,
    constructionCarryPerMonth: 1500,
  }
}

/** Static defaults for callers that cannot seed from a specific property.
 *  Prefer defaultInputsFor() when ARV and payoff are known. */
export const DEFAULT_INPUTS: Omit<MathInputs, "arv" | "loanBalance"> = {
  repairs: 0,
  assignmentFee: 0,
  investorMargin: 0,
  closingCosts: 5000,
  buyerPremiumPct: 0.10,
  auctionMinPct: 0.80,
  auctionMaxPct: 0.88,
  auctionWorstPct: 0.70,
  wholesalerMaoPct: 0.55,
  wholesalerStretchPct: 0.62,
  taxLienAmount: 0,
  applyTrusteeFee: false,
  mlsClearancePct: 0.95,
  mlsCommissionPct: 0.06,
  mlsCarryingPerMonth: 1500,
  mlsCarryingMonths: 3,
  monthlyFineAccrual: 0,
  repairMonths: 0,
  demolitionCost: 0,
  constructionCost: 0,
  constructionMonths: 0,
  constructionCarryPerMonth: 1500,
}

/** Three possible wholesaler outcomes for a given property. */
export type WholesalerScenario =
  | "standard"   // base distressed-offer model works; this is what they'd offer
  | "stretched"  // base offer underwater; wholesaler stretches to close
  | "walks"      // even stretched is underwater; wholesaler doesn't make an offer

export type WholesalerBreakdown = {
  arv: number
  // Base distressed cash-offer chain
  maoCeiling: number          // ARV * wholesalerMaoPct
  repairs: number             // shown as deduction
  assignmentFee: number       // shown as deduction
  investorMargin: number      // shown as deduction
  cashOfferStandard: number   // = max(0, MAO - repairs - fee - margin)
  netStandard: number         // cashOfferStandard - loanBalance (may be negative)
  // Stretched scenario - wholesaler reaches to close a thinner deal
  cashOfferStretched: number  // = max(0, ARV * wholesalerStretchPct - repairs - fee - margin)
  netStretched: number        // cashOfferStretched - loanBalance
  // Loan + scenario summary
  loanBalance: number
  /** Property tax lien paid at close (only when taxLienAmount > 0). */
  taxLien: number
  /** Trustee fee under 11 USC § 326 on the realistic offer
   *  (only set when applyTrusteeFee is true). */
  trusteeFee: number
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
  /** Property tax lien paid at close (only when taxLienAmount > 0). */
  taxLien: number
  /** Trustee fee under 11 USC § 326 (only set when applyTrusteeFee is true). */
  trusteeFee: number
  netToHomeowner: number
  buyerPremium: number  // paid by buyer ON TOP of bid (does not affect seller)
}

/** Self-remediate-then-sell path — the highest-net option for a
 *  code-violation property IF the homeowner has the capital, capacity,
 *  and patience to actually pull it off (most don't). Math models a
 *  typical TN sequence: pay for repairs, eat fines for `repairMonths`,
 *  then list on MLS, pay agent commission, close. */
export type SelfRemediateScenario = {
  /** Closed price (≈ ARV for residential MLS at 95% clearance). */
  closedPrice: number
  /** Out-of-pocket repair budget. */
  repairCost: number
  /** Fines accrued during the cure window (monthly × months). */
  finesAccrued: number
  /** 6% MLS agent commission on closed price. */
  agentCommission: number
  /** Carrying costs during cure period (taxes, insurance, mortgage if
   *  any) — same monthly rate as the standard MLS carry. */
  carryingCost: number
  loanBalance: number
  taxLien: number
  closingCosts: number
  repairMonths: number
  /** What the homeowner walks with after everything resolves. */
  netToHomeowner: number
}

/** Demolition / fire-rehab "stay the course" path. Sums the permit's
 *  stated cost + (for teardown subtype) modeled new-build cost +
 *  carrying cost over the construction window. End-state value is NOT
 *  computed — depends on what's built and the market when work
 *  finishes; the headline is the out-of-pocket commitment. */
export type DemoRouteScenario = {
  /** Permit-stated demo cost. 0 for fire/storm rehab subtypes. */
  demolitionCost: number
  /** New construction cost (teardown subtype) OR rehab cost (fire /
   *  storm subtype). */
  constructionCost: number
  /** Months of construction / rehab modeled. */
  constructionMonths: number
  /** Per-month carrying cost during construction. */
  constructionCarryPerMonth: number
  /** Total carrying cost = months × per-month. */
  carryingCost: number
  /** Total commitment = demo + construction + carrying. */
  totalOutOfPocket: number
}

/** Tax sale path — what happens if the homeowner does nothing and the
 *  property goes to chancery court tax sale. TN-specific math. */
export type TaxSaleScenario = {
  /** Modeled winning bid: max(lien × 1.3, ARV × 0.20). The first term is
   *  what investors will pay just to clear back taxes + small overage on
   *  low-equity properties; the second is the typical investor ceiling
   *  (they need their own margin to flip). */
  winningBid: number
  taxLienPayoff: number
  /** Chancery court costs, sheriff's deed prep, statutory fees. */
  saleCosts: number
  /** What the original owner walks away with after lien + costs. */
  netToHomeowner: number
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

/** MLS / agent-listing path. Most homeowners and probate executors think
 *  this is their "real" alternative to FALCO; it's the comparison that
 *  closes them. */
export type MlsBreakdown = {
  /** What the agent realistically lists at, given ARV. */
  listPrice: number
  /** Hammer price after typical clearance haircut (default 95% of asking). */
  closedPrice: number
  /** 6% agent commission on closed price. */
  agentCommission: number
  /** Total carrying cost during exposure (taxes, insurance, mortgage if
   *  any, lawn, utilities). */
  carryingCost: number
  /** Loan payoff (same as the other paths). */
  loanBalance: number
  /** Standard closing costs (title, recording, attorney). */
  closingCosts: number
  /** Months of exposure modeled. */
  carryingMonths: number
  /** Property tax lien paid at close (only when taxLienAmount > 0). */
  taxLien: number
  /** Trustee fee under 11 USC § 326 (only set when applyTrusteeFee is true). */
  trusteeFee: number
  /** Net to seller (or estate, if applyTrusteeFee) after all of the above. */
  netToSeller: number
}

export type MathOutput = {
  inputs: MathInputs
  trusteeNetToHomeowner: number  // = 0
  wholesaler: WholesalerBreakdown
  auction: AuctionBreakdown
  /** Modeled chancery court tax sale outcome. Always computed (cheap)
   *  but only RENDERED in tax_lien scenario as Path 1. */
  taxSale: TaxSaleScenario
  /** Modeled self-remediate-then-sell outcome. Always computed but
   *  only RENDERED in code_violation scenario as Path 1. */
  selfRemediate: SelfRemediateScenario
  /** Demolition / fire-rehab "stay the course" outcome. Always computed
   *  but only RENDERED in demolition scenario as Path 1. */
  demoRoute: DemoRouteScenario
  /** MLS path — present in every output but only RENDERED on scenarios
   *  where the agent listing is the homeowner's real default option
   *  (probate, FSBO). */
  mls: MlsBreakdown
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

/** 11 USC § 326(a) — statutory trustee compensation cap.
 *  25% on first $5K, 10% on next $45K, 5% on next $950K, 3% above $1M.
 *  This is the CAP; actual fees are billed on Form 4 fee applications and
 *  may run lower, but the cap is the right number to model in homeowner-
 *  facing math (conservative ceiling on what creditors lose to trustee). */
export function computeTrusteeFee(grossProceeds: number): number {
  if (!Number.isFinite(grossProceeds) || grossProceeds <= 0) return 0
  let fee = 0
  let remaining = grossProceeds
  const t1 = Math.min(remaining, 5_000)
  fee += t1 * 0.25
  remaining -= t1
  if (remaining <= 0) return Math.round(fee)
  const t2 = Math.min(remaining, 45_000)
  fee += t2 * 0.10
  remaining -= t2
  if (remaining <= 0) return Math.round(fee)
  const t3 = Math.min(remaining, 950_000)
  fee += t3 * 0.05
  remaining -= t3
  if (remaining <= 0) return Math.round(fee)
  fee += remaining * 0.03
  return Math.round(fee)
}

export function computeMath(inputs: MathInputs): MathOutput {
  const totalDeductions = inputs.repairs + inputs.assignmentFee + inputs.investorMargin

  // Property tax lien gets paid at close on every sale path (it's a
  // superior lien — has to clear before the title transfers). Treated
  // alongside loan payoff. 0 for non-tax-lien properties.
  const taxLien = Math.max(0, inputs.taxLienAmount || 0)

  const baseOfferPct = Math.round(inputs.wholesalerMaoPct * 100)
  const stretchOfferPct = Math.round(inputs.wholesalerStretchPct * 100)

  // Base distressed-offer model: max(0, MAO - all deductions)
  const maoCeiling = inputs.arv * inputs.wholesalerMaoPct
  const cashOfferStandard = Math.max(0, maoCeiling - totalDeductions)
  const netStandard = cashOfferStandard - inputs.loanBalance - taxLien

  // Stretched scenario: wholesaler accepts thinner margin to close a deal
  // that would not pencil at the base distressed-offer model. Their
  // own profit is smaller but they get a deal vs. nothing.
  const stretchedCeiling = inputs.arv * inputs.wholesalerStretchPct
  const cashOfferStretched = Math.max(0, stretchedCeiling - totalDeductions)
  const netStretched = cashOfferStretched - inputs.loanBalance - taxLien

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
    scenarioLabel = `Base ${baseOfferPct}% distressed cash offer`
  } else if (netStretched >= WHOLESALER_MIN_NET_TO_CLOSE) {
    scenario = "stretched"
    realisticNet = netStretched
    scenarioLabel = `Stretched ${stretchOfferPct}% offer (wholesaler eats margin to close)`
  } else {
    scenario = "walks"
    realisticNet = 0
    scenarioLabel = "Wholesaler walks — no offer makes economic sense"
  }

  // Wholesaler trustee fee — only on the realistic offer (standard or
  // stretched cash offer if there's one; 0 if wholesaler walks).
  const wholesalerGross =
    scenario === "standard"
      ? cashOfferStandard
      : scenario === "stretched"
      ? cashOfferStretched
      : 0
  const wholesalerTrusteeFee = inputs.applyTrusteeFee
    ? computeTrusteeFee(wholesalerGross)
    : 0
  // When trustee fee applies, it comes out of net (between sale and
  // distribution to estate). We back it out of realisticNet here.
  const realisticNetAfterFee = inputs.applyTrusteeFee
    ? Math.max(0, realisticNet - wholesalerTrusteeFee)
    : realisticNet

  // Auction scenarios
  function scenarioCalc(retailPct: number): AuctionScenario {
    const winningBid = inputs.arv * retailPct
    const buyerPremium = winningBid * inputs.buyerPremiumPct
    const trusteeFee = inputs.applyTrusteeFee
      ? computeTrusteeFee(winningBid)
      : 0
    const netToHomeowner =
      winningBid -
      inputs.loanBalance -
      inputs.closingCosts -
      taxLien -
      trusteeFee
    return {
      retailPct,
      winningBid,
      loanBalance: inputs.loanBalance,
      closingCosts: inputs.closingCosts,
      taxLien,
      trusteeFee,
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

  // MLS path. Agent over-lists ~5%; typical TN clearance ~95% of asking
  // ≈ 0.95 × 1.05 ≈ retail. Net is closed price − commission − carrying −
  // loan − closing.
  const mlsListPrice = inputs.arv * (1 + (1 - inputs.mlsClearancePct))  // typical over-list
  const mlsClosedPrice = inputs.arv  // 95% of (105% of arv) ≈ arv
  const mlsAgentCommission = mlsClosedPrice * inputs.mlsCommissionPct
  const mlsCarryingCost = inputs.mlsCarryingPerMonth * inputs.mlsCarryingMonths
  const mlsTrusteeFee = inputs.applyTrusteeFee
    ? computeTrusteeFee(mlsClosedPrice)
    : 0
  const mlsNet =
    mlsClosedPrice -
    mlsAgentCommission -
    mlsCarryingCost -
    mlsTrusteeFee -
    taxLien -
    inputs.loanBalance -
    inputs.closingCosts

  // Tax sale path. Modeled bid: max(lien × 1.3, ARV × 0.20). Conservative
  // — actual bids vary widely. Owner walks away with whatever's left
  // after lien payoff and chancery court costs (~$5K).
  const taxSaleBid = Math.max(taxLien * 1.3, inputs.arv * 0.20)
  const taxSaleCosts = 5000
  const taxSaleNet = Math.max(0, taxSaleBid - taxLien - taxSaleCosts)

  // Self-remediate-then-sell path. Models: pay for repairs, eat fines
  // for `repairMonths`, list on MLS, pay agent commission, close.
  // ARV is post-repair value, so closed price ≈ ARV at 95% clearance.
  const srRepairCost = inputs.repairs
  const srFinesAccrued = inputs.monthlyFineAccrual * inputs.repairMonths
  const srClosedPrice = inputs.arv
  const srCommission = srClosedPrice * inputs.mlsCommissionPct
  const srCarryingCost = inputs.mlsCarryingPerMonth * inputs.repairMonths
  const srNet =
    srClosedPrice -
    srRepairCost -
    srFinesAccrued -
    srCommission -
    srCarryingCost -
    inputs.closingCosts -
    inputs.loanBalance -
    taxLien

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
      taxLien,
      trusteeFee: wholesalerTrusteeFee,
      scenario,
      realisticNet: realisticNetAfterFee,
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
    mls: {
      listPrice: mlsListPrice,
      closedPrice: mlsClosedPrice,
      agentCommission: mlsAgentCommission,
      carryingCost: mlsCarryingCost,
      loanBalance: inputs.loanBalance,
      closingCosts: inputs.closingCosts,
      carryingMonths: inputs.mlsCarryingMonths,
      taxLien,
      trusteeFee: mlsTrusteeFee,
      netToSeller: mlsNet,
    },
    taxSale: {
      winningBid: taxSaleBid,
      taxLienPayoff: taxLien,
      saleCosts: taxSaleCosts,
      netToHomeowner: taxSaleNet,
    },
    selfRemediate: {
      closedPrice: srClosedPrice,
      repairCost: srRepairCost,
      finesAccrued: srFinesAccrued,
      agentCommission: srCommission,
      carryingCost: srCarryingCost,
      loanBalance: inputs.loanBalance,
      taxLien,
      closingCosts: inputs.closingCosts,
      repairMonths: inputs.repairMonths,
      netToHomeowner: srNet,
    },
    demoRoute: ((): DemoRouteScenario => {
      const demolitionCost = Math.max(0, inputs.demolitionCost || 0)
      const constructionCost = Math.max(0, inputs.constructionCost || 0)
      const constructionMonths = Math.max(0, inputs.constructionMonths || 0)
      const carry = Math.max(0, inputs.constructionCarryPerMonth || 0)
      const carryingCost = constructionMonths * carry
      return {
        demolitionCost,
        constructionCost,
        constructionMonths,
        constructionCarryPerMonth: carry,
        carryingCost,
        totalOutOfPocket: demolitionCost + constructionCost + carryingCost,
      }
    })(),
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
