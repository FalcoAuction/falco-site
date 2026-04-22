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
  /** Estimated repairs the wholesaler will deduct. Default $25,000. */
  repairs: number
  /** Wholesaler assignment fee (their cut). Default $10,000. */
  assignmentFee: number
  /** Investor profit margin baked into the wholesaler's MAO. Default $40,000. */
  investorMargin: number
  /** Closing costs at marketed sale (title, recording, etc.). Default $5,000. */
  closingCosts: number
  /** Buyer's premium percentage paid by buyer on top of bid. Default 8%. */
  buyerPremiumPct: number
  /** Marketed auction modeled clearance — low end. Default 0.80. */
  auctionMinPct: number
  /** Marketed auction modeled clearance — high end. Default 0.88. */
  auctionMaxPct: number
  /** 70% rule MAO cap. Default 0.70. */
  wholesalerMaoPct: number
}

export const DEFAULT_INPUTS: Omit<MathInputs, "arv" | "loanBalance"> = {
  repairs: 25000,
  assignmentFee: 10000,
  investorMargin: 40000,
  closingCosts: 5000,
  buyerPremiumPct: 0.08,
  auctionMinPct: 0.80,
  auctionMaxPct: 0.88,
  wholesalerMaoPct: 0.70,
}

export type WholesalerBreakdown = {
  arv: number
  maoCeiling: number          // ARV × 0.70
  repairs: number             // negative
  assignmentFee: number       // negative
  investorMargin: number      // negative
  cashOfferToSeller: number   // result of the 70% rule chain
  loanBalance: number         // negative
  netToHomeowner: number      // cashOfferToSeller - loanBalance (may be negative)
  /** True if the pure 70% rule offer leaves the homeowner underwater. */
  isUnderwater: boolean
  /** What homeowner would realistically net if a wholesaler tweaks the offer
   *  upward enough to make the deal close — typically loan + $10-20K cushion.
   *  Capped at the actual cashOfferToSeller if that's already higher. */
  realisticNetEstimate: number
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
  /** Range string like "$95,000 – $130,000" for headline use. */
  netRangeLabel: string
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

export function computeMath(inputs: MathInputs): MathOutput {
  // Wholesaler chain (70% rule)
  const maoCeiling = inputs.arv * inputs.wholesalerMaoPct
  const cashOfferToSeller =
    maoCeiling - inputs.repairs - inputs.assignmentFee - inputs.investorMargin
  const wholesalerNet = cashOfferToSeller - inputs.loanBalance
  const isUnderwater = wholesalerNet < 0
  // If underwater, model what a wholesaler would ACTUALLY offer to close
  // the deal — typically loan + $10-25K cushion. Real-world the homeowner
  // would push back on the pure 70% rule and the wholesaler would either
  // walk or sweeten enough to net a "make-it-go-away" amount.
  const realisticNetEstimate = isUnderwater
    ? 18000 // typical "sweetened to close" wholesaler scenario
    : wholesalerNet

  // Auction scenarios
  function scenario(retailPct: number): AuctionScenario {
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
  const low = scenario(inputs.auctionMinPct)
  const high = scenario(inputs.auctionMaxPct)
  const netRangeLabel = `${fmt(low.netToHomeowner)} – ${fmt(high.netToHomeowner)}`

  const auctionMidpointNet = (low.netToHomeowner + high.netToHomeowner) / 2

  return {
    inputs,
    trusteeNetToHomeowner: 0,
    wholesaler: {
      arv: inputs.arv,
      maoCeiling,
      repairs: inputs.repairs,
      assignmentFee: inputs.assignmentFee,
      investorMargin: inputs.investorMargin,
      cashOfferToSeller,
      loanBalance: inputs.loanBalance,
      netToHomeowner: wholesalerNet,
      isUnderwater,
      realisticNetEstimate,
    },
    auction: {
      arv: inputs.arv,
      low,
      high,
      netRangeLabel,
    },
    spreadEstimate: {
      midpointGain: auctionMidpointNet - realisticNetEstimate,
      bestCaseGain: high.netToHomeowner - realisticNetEstimate,
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
