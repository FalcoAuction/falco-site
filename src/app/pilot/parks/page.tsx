import Link from "next/link"

export const dynamic = "force-static"
export const metadata = {
  title: "FALCO ↔ Parks Auction & Realty — Pilot Materials",
  description:
    "Pilot partnership materials for the FALCO ↔ Parks Auction & Realty meeting on April 23, 2026.",
  robots: "noindex, nofollow",
}

// ============================================================================
// Index page for the Parks Pilot meeting materials. Patrick shares this URL
// with Dale before/during the Google Meet; Dale clicks through to the
// individual artifacts in his own browser.
// ============================================================================

export default function ParksPilotIndex() {
  return (
    <main className="min-h-screen bg-[#060606] text-white">
      <div className="absolute inset-0 -z-30 bg-[#060606]" />
      <div className="absolute inset-0 -z-20 bg-[radial-gradient(circle_at_top,rgba(16,185,129,0.06),transparent_45%)]" />
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[size:32px_32px] opacity-[0.4]" />

      {/* Header */}
      <header className="border-b border-white/[0.06] bg-[#060606]/80 backdrop-blur-xl">
        <div className="mx-auto max-w-3xl px-6 py-4 md:px-10 flex items-center justify-between">
          <Link
            href="/"
            className="text-[13px] font-semibold tracking-[0.28em] text-white hover:text-emerald-300 transition-colors"
          >
            FALCO
          </Link>
          <div className="text-[11px] uppercase tracking-[0.22em] text-emerald-300/70 hidden sm:block">
            Parks Pilot · Meeting Materials
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-3xl px-6 md:px-10 pt-16 md:pt-24 pb-10">
        <div className="text-[11px] uppercase tracking-[0.28em] text-emerald-300/85 font-semibold">
          Pilot Materials
        </div>
        <h1 className="mt-5 text-[32px] md:text-[44px] leading-[1.05] tracking-[-0.025em] font-semibold">
          FALCO ↔ Parks Auction &amp; Realty
        </h1>
        <p className="mt-4 text-[15px] md:text-[17px] leading-[1.65] text-white/65">
          Materials prepared for the April 23, 2026 partnership meeting between
          Patrick Armour (FALCO) and Dale Nichols (Parks Auction &amp; Realty).
        </p>
      </section>

      {/* Documents */}
      <section className="mx-auto max-w-3xl px-6 md:px-10 pb-16 space-y-4">
        <DocCard
          href="/pilot/parks/term-sheet"
          eyebrow="Document 1"
          title="Pilot Term Sheet"
          desc="The proposed pilot structure: 3 months, 3 deals, non-exclusive on both sides, 8% buyer's premium split 5/3 between Parks and FALCO. Non-binding outline for discussion."
          cta="Open term sheet →"
        />
        <DocCard
          href="/pilot/parks/economics"
          eyebrow="Document 2"
          title="Per-Deal Economics"
          desc="A single-deal walkthrough on a $484K Davidson County property. Shows where the buyer's payment goes, what each party earns, and what the homeowner walks away with vs. the wholesaler/trustee alternatives."
          cta="Open economics →"
        />

        <div className="rounded-lg border border-white/[0.08] bg-white/[0.02] p-5 md:p-6">
          <div className="text-[11px] uppercase tracking-[0.22em] text-emerald-300/70 font-semibold">
            Live demo (during meeting)
          </div>
          <h2 className="mt-2 text-[18px] md:text-[20px] font-semibold tracking-tight">
            Sample math sheet
          </h2>
          <p className="mt-2 text-[14px] text-white/65 leading-[1.6]">
            The 3-path comparison FALCO sends to every distressed homeowner before
            any listing decision. Generated per-property from{" "}
            <span className="text-emerald-300">/admin/math-sheet/[id]</span>.
            Patrick will screen-share a real example during the meeting.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="mx-auto max-w-3xl px-6 md:px-10 py-10 border-t border-white/[0.06]">
        <div className="flex items-center justify-between flex-wrap gap-4 text-[11px] tracking-[0.18em] text-white/35">
          <div>FALCO · Tennessee · falco@falco.llc</div>
          <div>April 22, 2026</div>
        </div>
      </footer>
    </main>
  )
}

function DocCard({
  href,
  eyebrow,
  title,
  desc,
  cta,
}: {
  href: string
  eyebrow: string
  title: string
  desc: string
  cta: string
}) {
  return (
    <Link
      href={href}
      className="block rounded-lg border border-emerald-400/25 bg-emerald-400/[0.04] hover:bg-emerald-400/[0.08] hover:border-emerald-400/45 transition-colors p-5 md:p-6"
    >
      <div className="text-[11px] uppercase tracking-[0.22em] text-emerald-300/85 font-semibold">
        {eyebrow}
      </div>
      <h2 className="mt-2 text-[20px] md:text-[24px] font-semibold tracking-tight text-white">
        {title}
      </h2>
      <p className="mt-2 text-[14px] text-white/70 leading-[1.6]">{desc}</p>
      <div className="mt-4 text-[13px] text-emerald-300 font-medium">{cta}</div>
    </Link>
  )
}
