import Link from "next/link"

const deals = [
  {
    slug: "sample-deal",
    title: "Davidson County Residential Foreclosure",
    market: "Nashville, TN",
    status: "Active",
    summary:
      "Auction-timed residential opportunity within the current FALCO pipeline. Full details are restricted to approved users who accept the NDA and non-circumvention terms.",
    timeline: "Auction window: 21–60 days",
  },
  {
    slug: "sample-deal",
    title: "Rutherford County Distress Opportunity",
    market: "Murfreesboro, TN",
    status: "Restricted",
    summary:
      "Structured acquisition brief available inside the vault. Address, packet, and contact path are hidden until agreement acceptance.",
    timeline: "Confidential listing",
  },
]

export default function VaultPage() {
  return (
    <main className="min-h-screen bg-black text-white">
      <div className="absolute inset-0 -z-20 bg-black" />
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.14),transparent_24%),linear-gradient(to_bottom,rgba(255,255,255,0.03),transparent_16%,transparent_82%,rgba(255,255,255,0.02))]" />

      <header className="border-b border-white/10 bg-black/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 md:px-10">
          <Link href="/" className="text-sm font-semibold tracking-[0.28em] text-white">
            FALCO
          </Link>

          <div className="flex items-center gap-6">
            <Link href="/" className="text-sm text-white/65 transition hover:text-white">
              Home
            </Link>
            <Link
              href="/request-access"
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/80 transition hover:border-white/25 hover:bg-white/10"
            >
              Request Access
            </Link>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-6 pb-16 pt-16 md:px-10 md:pb-24 md:pt-24">
        <div className="max-w-3xl">
          <div className="inline-flex rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs uppercase tracking-[0.22em] text-white/55">
            Closed Access Vault
          </div>

          <h1 className="mt-6 text-4xl font-semibold leading-tight tracking-[-0.04em] md:text-6xl">
            Restricted opportunity flow for approved FALCO partners.
          </h1>

          <p className="mt-6 max-w-2xl text-base leading-7 text-white/68 md:text-lg">
            The FALCO vault contains select active opportunities, acquisition briefs,
            and routing paths for approved users. Full listing details are gated behind
            NDA and non-circumvention acceptance.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 pb-28 md:px-10">
        <div className="grid gap-6 md:grid-cols-2">
          {deals.map((deal, index) => (
            <div
              key={`${deal.slug}-${index}`}
              className="rounded-[28px] border border-white/10 bg-white/[0.045] p-8 shadow-[0_35px_120px_rgba(0,0,0,0.6)]"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="text-xs uppercase tracking-[0.24em] text-white/45">
                  Vault Listing
                </div>

                <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/60">
                  {deal.status}
                </div>
              </div>

              <h2 className="mt-5 text-2xl font-semibold tracking-[-0.03em] text-white">
                {deal.title}
              </h2>

              <div className="mt-3 text-sm text-white/50">{deal.market}</div>

              <p className="mt-5 text-sm leading-7 text-white/68">
                {deal.summary}
              </p>

              <div className="mt-5 text-sm text-white/50">{deal.timeline}</div>

              <div className="mt-8">
                <Link
                  href={`/vault/${deal.slug}`}
                  className="inline-flex items-center justify-center rounded-xl bg-white px-5 py-3 text-sm font-semibold text-black transition hover:bg-white/90"
                >
                  View Listing
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  )
}