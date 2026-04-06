import Link from "next/link"
import { getHomeMetrics } from "@/lib/home-metrics"

export const dynamic = "force-dynamic"

export default async function InvestorPage() {
  const metrics = await getHomeMetrics()

  return (
    <main className="falco-mobile-calm min-h-screen bg-black text-white">
      <div className="absolute inset-0 -z-20 bg-black" />
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.14),transparent_24%),linear-gradient(to_bottom,rgba(255,255,255,0.03),transparent_16%,transparent_82%,rgba(255,255,255,0.02))]" />

      <header className="border-b border-white/10 bg-black/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 md:px-10">
          <Link href="/" className="text-sm font-semibold tracking-[0.28em] text-white">
            FALCO
          </Link>
          <Link href="/partner-login" className="text-sm text-white/65 transition hover:text-white">
            Vault Login
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-5xl px-6 pb-20 pt-16 md:px-10 md:pt-24">
        <div className="falco-reveal-1 text-xs uppercase tracking-[0.26em] text-emerald-300/80">
          Investor Overview
        </div>

        <h1 className="falco-reveal-1 mt-6 max-w-4xl text-4xl font-semibold leading-[0.93] tracking-[-0.04em] md:text-6xl">
          FALCO finds the file.
          <br />
          You control the deal.
        </h1>

        <p className="falco-reveal-2 mt-8 max-w-2xl text-lg leading-8 text-white/68">
          FALCO is a distress-asset sourcing engine that watches 56 Tennessee counties
          for foreclosure and pre-foreclosure opportunities. It enriches every lead with
          owner data, debt, valuation, and contact info, then surfaces the ones that are
          realistically controllable.
        </p>

        <p className="falco-reveal-2 mt-4 max-w-2xl text-lg leading-8 text-white/68">
          Your job is to pick the files that fit your model, make the calls, and gain
          control. If a deal needs a fast exit, we route it to an auction partner.
        </p>
      </section>

      {/* 3-player model */}
      <section className="mx-auto max-w-5xl px-6 pb-20 md:px-10">
        <div className="falco-reveal-2 rounded-[30px] border border-white/10 bg-white/[0.035] p-8 shadow-[0_35px_120px_rgba(0,0,0,0.55)] md:p-12">
          <div className="text-xs uppercase tracking-[0.26em] text-white/45">How It Works</div>
          <h2 className="mt-4 text-3xl font-semibold tracking-[-0.03em] md:text-4xl">
            Three players. One pipeline.
          </h2>

          <div className="mt-8 grid gap-6 lg:grid-cols-3">
            <div className="rounded-[24px] border border-emerald-400/14 bg-emerald-400/[0.04] p-6">
              <div className="text-[11px] uppercase tracking-[0.22em] text-emerald-300/80">01</div>
              <div className="mt-3 text-xl font-semibold text-white">FALCO</div>
              <div className="mt-1 text-sm font-medium text-emerald-200/70">Source + Screen + Route</div>
              <p className="mt-4 text-sm leading-7 text-white/60">
                Watches distress signals daily across 56 counties. Enriches with owner data, debt, valuation,
                contact info. Scores and packages the strongest files into the vault with a suggested execution lane.
              </p>
            </div>

            <div className="rounded-[24px] border border-white/10 bg-white/[0.06] p-6">
              <div className="text-[11px] uppercase tracking-[0.22em] text-white/45">02</div>
              <div className="mt-3 text-xl font-semibold text-white">Investor</div>
              <div className="mt-1 text-sm font-medium text-white/60">Control + Outreach + Decide</div>
              <p className="mt-4 text-sm leading-7 text-white/60">
                Reviews vault listings. Picks files that fit their model. Calls the owner. Negotiates
                sub-to, arrears cure, short sale, or direct purchase. Gains control of the asset.
              </p>
            </div>

            <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-6">
              <div className="text-[11px] uppercase tracking-[0.22em] text-white/45">03</div>
              <div className="mt-3 text-xl font-semibold text-white">Auction Co.</div>
              <div className="mt-1 text-sm font-medium text-white/60">Execute + Dispose + Exit</div>
              <p className="mt-4 text-sm leading-7 text-white/60">
                When the investor needs a fast exit, controlled assets route to an auction partner
                for disposition. Marketed sale, auction event, or direct buyer placement.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Live pipeline numbers */}
      <section className="mx-auto max-w-5xl px-6 pb-20 md:px-10">
        <div className="falco-reveal-3 rounded-[26px] border border-white/10 bg-white/[0.04] p-5 shadow-[0_30px_100px_rgba(0,0,0,0.45)]">
          <div className="mb-4 text-[11px] uppercase tracking-[0.22em] text-white/45">
            Live Pipeline
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: "Counties Sourced", value: String(metrics.activeCounties) },
              { label: "Leads Tracked", value: String(metrics.trackedLeads) },
              { label: "Vault Listings", value: String(metrics.packetsInVault) },
              { label: "Auction Ready", value: String(metrics.greenReady) },
            ].map((m) => (
              <div key={m.label} className="rounded-2xl border border-white/10 bg-black/38 px-5 py-5">
                <div className="text-[11px] uppercase tracking-[0.22em] text-white/40">{m.label}</div>
                <div className="falco-shimmer-text mt-3 text-2xl font-semibold">{m.value}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* What each listing contains */}
      <section className="mx-auto max-w-5xl px-6 pb-20 md:px-10">
        <div className="rounded-[30px] border border-white/10 bg-white/[0.035] p-8 shadow-[0_35px_120px_rgba(0,0,0,0.55)] md:p-12">
          <div className="text-xs uppercase tracking-[0.26em] text-white/45">What You Get</div>
          <h2 className="mt-4 text-3xl font-semibold tracking-[-0.03em] md:text-4xl">
            Every file in the vault includes:
          </h2>

          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {[
              { title: "Owner Contact", detail: "Name, mailing address, skip-traced phone numbers, DNC status" },
              { title: "Debt Record", detail: "Lender, original amount, mortgage date, notice holder, confidence level" },
              { title: "Valuation Range", detail: "AVM low/mid/high with spread and confidence classification" },
              { title: "Suggested Play", detail: "Execution lane (borrower side, auction, mixed) with confidence and reasoning" },
              { title: "Execution Assessment", detail: "Control party, owner agency, intervention window, lender control, workability" },
              { title: "Property Details", detail: "Beds, baths, sqft, year built, parcel ID, last transfer" },
              { title: "Timeline", detail: "Sale date, days to sale, recorded date, notice verification status" },
              { title: "PDF Packet", detail: "5-page review brief with everything assembled for a yes/no decision" },
            ].map((item) => (
              <div key={item.title} className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
                <div className="text-sm font-semibold text-white">{item.title}</div>
                <div className="mt-2 text-sm leading-6 text-white/55">{item.detail}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-5xl px-6 pb-32 md:px-10">
        <div className="rounded-[32px] border border-white/10 bg-[linear-gradient(180deg,rgba(16,185,129,0.06),rgba(255,255,255,0.02))] p-8 shadow-[0_35px_120px_rgba(0,0,0,0.55)] md:p-12">
          <h2 className="text-3xl font-semibold tracking-[-0.03em] md:text-4xl">
            See what the pipeline is surfacing right now.
          </h2>
          <p className="mt-5 max-w-2xl text-white/68 leading-7">
            The vault currently holds {metrics.packetsInVault} live listings across Tennessee.
            Every file has owner contact, debt data, valuation, and a suggested execution lane.
            Access is gated and controlled.
          </p>

          <div className="mt-8 flex flex-col gap-4 sm:flex-row">
            <Link
              href="/partner-login"
              className="falco-accent-button inline-flex items-center justify-center rounded-xl px-6 py-3.5 text-sm font-semibold transition"
            >
              Enter the Vault
            </Link>
            <Link
              href="/request-access"
              className="inline-flex items-center justify-center rounded-xl border border-white/15 px-6 py-3.5 text-sm font-semibold text-white transition hover:border-white/30 hover:bg-white/[0.06]"
            >
              Request Access
            </Link>
          </div>
        </div>
      </section>
    </main>
  )
}
