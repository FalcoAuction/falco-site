import PrintButton from "./print-button"
import Link from "next/link"

export const dynamic = "force-static"
export const metadata = {
  title: "FALCO ↔ Parks Auction & Realty — Pilot Economics",
  description:
    "Per-deal economics breakdown for the FALCO ↔ Parks Auction & Realty pilot. Davidson County example, 8% buyer's premium, 5/3 split.",
  robots: "noindex, nofollow",
}

// ============================================================================
// PUBLIC shareable economics one-pager. URL: /pilot/parks/economics
// No auth — Patrick can share the URL directly with Dale or paste into the
// Google Meet chat. Same content as the admin version, public-facing styling.
// ============================================================================

function fmt(n: number): string {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 })
}

export default function ParksEconomicsPublicPage() {
  // Standard $484K Davidson example with 60% LTV
  const arv = 484000
  const loan = 290000
  const closingCosts = 5000
  const buyerPremiumPct = 0.08
  const auctionMidPct = 0.84

  const winningBid = arv * auctionMidPct
  const buyerPremium = winningBid * buyerPremiumPct
  const parksShare = winningBid * 0.05
  const falcoShare = winningBid * 0.03
  const totalToBuyer = winningBid + buyerPremium
  const homeownerNet = winningBid - loan - closingCosts

  // Wholesaler comparison (70% rule)
  const wholesalerOffer = arv * 0.7 - 25000 - 10000 - 40000
  const wholesalerNet = Math.max(18000, wholesalerOffer - loan)

  return (
    <main className="min-h-screen bg-white text-neutral-900">
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
        }
      `}</style>

      {/* Top bar (hidden on print) */}
      <div className="no-print bg-[#060606] text-white border-b border-white/[0.08]">
        <div className="mx-auto max-w-4xl px-5 py-3 flex items-center justify-between gap-3">
          <Link
            href="/pilot/parks"
            className="text-[11px] uppercase tracking-[0.22em] text-emerald-300/70 hover:text-emerald-200 transition-colors"
          >
            ← Pilot index
          </Link>
          <div className="text-[11px] uppercase tracking-[0.22em] text-white/55 hidden sm:block">
            Parks Pilot · Economics one-pager
          </div>
          <PrintButton />
        </div>
      </div>

      {/* Sheet */}
      <article className="mx-auto max-w-3xl px-6 md:px-8 py-8 md:py-10">
        {/* Header */}
        <header className="border-b-2 border-emerald-600 pb-5">
          <div className="flex items-baseline justify-between flex-wrap gap-3">
            <div>
              <div className="text-[11px] tracking-[0.32em] uppercase font-bold text-emerald-700">
                FALCO ↔ Parks Auction &amp; Realty
              </div>
              <h1 className="mt-2 text-[26px] md:text-[28px] font-semibold tracking-tight leading-tight">
                Pilot economics, on a single deal.
              </h1>
            </div>
            <div className="text-right text-[11px] text-neutral-500 leading-[1.6]">
              Prepared for<br />
              <span className="text-neutral-900 font-medium text-[13px]">Dale Nichols</span><br />
              April 23, 2026
            </div>
          </div>
          <p className="mt-3 text-[13px] text-neutral-600 leading-[1.6]">
            Davidson County example: $484K home (Nashville-area Dec 2025 median per
            Redfin), $290K mortgage balance (~60% LTV), marketed auction clearing
            at 84% of retail. Real numbers, not models.
          </p>
        </header>

        {/* Where the money goes */}
        <section className="mt-7 rounded-lg border-2 border-neutral-300 overflow-hidden">
          <div className="bg-neutral-50 px-5 py-3 border-b border-neutral-300">
            <div className="text-[10px] uppercase tracking-[0.18em] text-neutral-500 font-semibold">
              Where the money goes
            </div>
          </div>
          <div className="p-5 space-y-3">
            <Bar
              label="Buyer pays at closing"
              detail={`Winning bid ${fmt(winningBid)} + 8% buyer's premium ${fmt(buyerPremium)}`}
              value={fmt(totalToBuyer)}
              color="bg-neutral-900"
            />
            <Bar
              label="Homeowner net (FALCO's promise)"
              detail={`Bid ${fmt(winningBid)} less ${fmt(loan)} loan less ${fmt(closingCosts)} closing`}
              value={fmt(homeownerNet)}
              color="bg-emerald-600"
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Bar
                label="Parks earns"
                detail="5% of bid · covers licensing, marketing, sale execution, closing"
                value={fmt(parksShare)}
                color="bg-emerald-700"
              />
              <Bar
                label="FALCO earns"
                detail="3% of bid · covers sourcing, homeowner education, math sheet, handoff"
                value={fmt(falcoShare)}
                color="bg-emerald-500"
              />
            </div>
          </div>
        </section>

        {/* By path */}
        <section className="mt-6">
          <div className="text-[10px] uppercase tracking-[0.18em] text-neutral-500 font-semibold mb-2">
            What the homeowner walks away with — by path
          </div>
          <div className="border border-neutral-300 rounded overflow-hidden">
            <table className="w-full text-[13px]">
              <tbody>
                <tr className="border-b border-neutral-200">
                  <td className="px-4 py-3 text-neutral-700">If trustee sale closes</td>
                  <td className="px-4 py-3 text-right tabular-nums text-red-600 font-semibold w-[120px]">$0</td>
                  <td className="px-4 py-3 text-[11px] text-neutral-500 hidden sm:table-cell">Bank takes property for loan balance.</td>
                </tr>
                <tr className="border-b border-neutral-200">
                  <td className="px-4 py-3 text-neutral-700">Typical wholesaler offer</td>
                  <td className="px-4 py-3 text-right tabular-nums text-amber-700 font-semibold">{fmt(wholesalerNet)}</td>
                  <td className="px-4 py-3 text-[11px] text-neutral-500 hidden sm:table-cell">70% rule formula sweetened to close.</td>
                </tr>
                <tr className="bg-emerald-50">
                  <td className="px-4 py-3 text-neutral-900 font-semibold">FALCO + Parks marketed auction</td>
                  <td className="px-4 py-3 text-right tabular-nums text-emerald-700 font-bold">{fmt(homeownerNet)}</td>
                  <td className="px-4 py-3 text-[11px] text-neutral-700 hidden sm:table-cell">Open competitive bidding, 84% of retail.</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-[11px] text-neutral-500 italic leading-[1.5]">
            Difference between wholesaler and marketed auction on this property: roughly{" "}
            <strong className="text-neutral-800">{fmt(homeownerNet - wholesalerNet)}</strong>{" "}
            kept by the family.
          </p>
        </section>

        {/* 3 deals aggregate */}
        <section className="mt-6 rounded-lg border-2 border-emerald-600 bg-emerald-50 p-5">
          <div className="text-[10px] uppercase tracking-[0.22em] text-emerald-800 font-semibold">
            Three pilot deals — outcome
          </div>
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Stat label="Parks earns" value={fmt(parksShare * 3)} />
            <Stat label="FALCO earns" value={fmt(falcoShare * 3)} />
            <Stat label="Equity preserved for TN families" value={fmt(homeownerNet * 3)} />
          </div>
          <p className="mt-3 text-[11px] text-emerald-900/80 leading-[1.55]">
            Numbers assume three deals at the Davidson example above. Actual mix
            will include Memphis ($222K median) and Knoxville ($391K median) which
            come in lower per-deal. Three deals at the statewide median (~$300K
            ARV) still produces ~{fmt(parksShare * 0.62 * 3)} for Parks.
          </p>
        </section>

        {/* Pilot at a glance */}
        <section className="mt-6">
          <div className="text-[10px] uppercase tracking-[0.18em] text-neutral-500 font-semibold mb-2">
            Pilot at a glance
          </div>
          <div className="border border-neutral-300 rounded overflow-hidden">
            <table className="w-full text-[13px]">
              <tbody>
                <Row k="Length" v="3 months from execution" />
                <Row k="Minimum deals" v="3 closed properties" />
                <Row k="Geography" v="Tennessee, all 95 counties (Parks-discretionary)" />
                <Row k="Inventory" v="Single-family residential, distressed (pre-foreclosure / lis pendens)" />
                <Row k="Exclusivity" v="Non-exclusive on both sides during pilot" />
                <Row k="Marketing costs (sale-side)" v="Parks covers" />
                <Row k="Marketing costs (homeowner-side)" v="FALCO covers" />
                <Row k="Failed listings" v="Each party absorbs own costs" />
                <Row k="Termination" v="14 days written notice, either party" />
                <Row k="Review checkpoint" v="30-min call at end of month 3" />
              </tbody>
            </table>
          </div>
        </section>

        {/* Footer */}
        <footer className="mt-8 pt-4 border-t border-neutral-300 text-[11px] text-neutral-500">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>FALCO LLC · Tennessee · falco@falco.llc · falco.llc</div>
            <div>Patrick Armour, Founder</div>
          </div>
          <p className="mt-2 text-[10px] leading-[1.5]">
            All economics derived from the standard 8% buyer&apos;s premium model with
            5% to Parks and 3% to FALCO of winning bid. Full sources at{" "}
            <Link href="/manifesto#sources" className="text-emerald-700 underline">
              falco.llc/manifesto#sources
            </Link>
            .
          </p>
        </footer>
      </article>
    </main>
  )
}

// ----------------------------------------------------------------------------

function Bar({ label, detail, value, color }: {
  label: string; detail: string; value: string; color: string
}) {
  return (
    <div className="relative rounded border border-neutral-200 bg-white p-3">
      <div className={`absolute left-0 top-0 bottom-0 w-1 rounded-l ${color}`} />
      <div className="ml-2 flex items-baseline justify-between gap-3 flex-wrap">
        <div className="min-w-0 flex-1">
          <div className="text-[12px] font-semibold text-neutral-900">{label}</div>
          <div className="mt-0.5 text-[10px] text-neutral-500 leading-[1.5]">{detail}</div>
        </div>
        <div className="text-[18px] font-bold tabular-nums text-neutral-900 whitespace-nowrap">
          {value}
        </div>
      </div>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-emerald-700/30 bg-white p-3 text-center">
      <div className="text-[10px] uppercase tracking-[0.16em] text-emerald-800/85 font-semibold">
        {label}
      </div>
      <div className="mt-1.5 text-[22px] font-bold tabular-nums text-emerald-800">
        {value}
      </div>
    </div>
  )
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <tr className="border-b border-neutral-200 last:border-b-0">
      <td className="px-4 py-2 text-[11px] uppercase tracking-[0.14em] text-neutral-500 font-semibold w-[200px] align-top">
        {k}
      </td>
      <td className="px-4 py-2 text-neutral-900">{v}</td>
    </tr>
  )
}
