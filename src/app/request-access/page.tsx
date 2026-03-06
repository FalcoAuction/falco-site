import Link from "next/link"

const accessTypes = [
  "Investor access",
  "Auction partner access",
  "Brokerage / operator access",
  "Strategic partnership inquiry",
]

export default function RequestAccessPage() {
  return (
    <main className="min-h-screen bg-black text-white">
      <div className="absolute inset-0 -z-20 bg-black" />
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.14),transparent_26%),linear-gradient(to_bottom,rgba(255,255,255,0.03),transparent_18%,transparent_80%,rgba(255,255,255,0.02))]" />

      <header className="border-b border-white/10 bg-black/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 md:px-10">
          <Link href="/" className="text-sm font-semibold tracking-[0.28em] text-white">
            FALCO
          </Link>

          <Link
            href="/"
            className="text-sm text-white/65 transition hover:text-white"
          >
            ← Back to Home
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-6 pb-20 pt-16 md:px-10 md:pb-28 md:pt-24">
        <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <div className="inline-flex rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs uppercase tracking-[0.22em] text-white/55">
              Request Access
            </div>

            <h1 className="mt-6 text-4xl font-semibold leading-tight tracking-[-0.04em] md:text-6xl">
              Enter the FALCO pipeline.
            </h1>

            <p className="mt-6 max-w-xl text-base leading-7 text-white/68 md:text-lg">
              Access is limited to qualified capital, execution partners, and
              aligned operators seeking structured exposure to upstream distress
              opportunity flow.
            </p>

            <div className="mt-10 space-y-3">
              {accessTypes.map((item) => (
                <div
                  key={item}
                  className="rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-4 text-sm text-white/78"
                >
                  {item}
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[28px] border border-white/10 bg-white/[0.045] p-6 shadow-[0_35px_120px_rgba(0,0,0,0.65)] md:p-8">
            <div className="rounded-[24px] border border-white/10 bg-black/70 p-6 md:p-8">
              <div className="text-xs uppercase tracking-[0.24em] text-white/45">
                Contact Path
              </div>

              <h2 className="mt-4 text-2xl font-semibold tracking-[-0.03em] text-white md:text-3xl">
                Request access directly.
              </h2>

              <p className="mt-4 max-w-lg text-sm leading-7 text-white/68">
                Until the full intake form is live, use the direct contact path
                below. Include your name, firm, role, market focus, and the type
                of access you are requesting.
              </p>

              <div className="mt-8 space-y-4">
                <a
                  href="mailto:access@falco.llc?subject=Falco%20Access%20Request"
                  className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-4 text-sm text-white/82 transition hover:border-white/25 hover:bg-white/[0.06]"
                >
                  <span>Email Access Request</span>
                  <span className="text-white/40">→</span>
                </a>

                <a
                  href="mailto:access@falco.llc?subject=Falco%20Partner%20Inquiry"
                  className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-4 text-sm text-white/82 transition hover:border-white/25 hover:bg-white/[0.06]"
                >
                  <span>Partner Inquiry</span>
                  <span className="text-white/40">→</span>
                </a>
              </div>

              <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.035] p-5">
                <div className="text-xs uppercase tracking-[0.22em] text-white/45">
                  What to Include
                </div>

                <div className="mt-4 space-y-2 text-sm text-white/68">
                  <div>Name and company</div>
                  <div>Role / operator type</div>
                  <div>Target geography or market</div>
                  <div>Type of access requested</div>
                  <div>Relevant execution capacity</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}