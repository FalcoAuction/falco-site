import Link from "next/link"
import BuyerSignupForm from "./buyer-signup-form"

export const dynamic = "force-dynamic"

export const metadata = {
  title: "Tennessee Distressed Inventory · FALCO Buyer Access",
  description:
    "Cash buyers and active investors — get first look at Tennessee distressed properties hitting marketed auction. Registered buyers get notified the moment new inventory lists.",
  openGraph: {
    title: "Tennessee Distressed Inventory · FALCO Buyer Access",
    description:
      "First look at TN distressed auction inventory. Equity-rich homes sourced from courthouse records, listed through our auction partner — notified to registered buyers first.",
    url: "https://falco.llc/buyers",
    images: [{ url: "/opengraph-image", width: 1200, height: 630 }],
    type: "website",
  },
}

export default function BuyersLandingPage() {
  return (
    <main className="min-h-screen bg-[#060606] text-white relative overflow-hidden">
      {/* Background layers — match homepage aesthetic */}
      <div className="absolute inset-0 -z-30 bg-[#060606]" />
      <div className="absolute inset-0 -z-20 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.08),transparent_32%)]" />
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle,rgba(255,255,255,0.06)_1px,transparent_1px)] bg-[size:32px_32px] opacity-[0.35]" />

      <header className="sticky top-0 z-40 border-b border-dashed border-white/[0.08] bg-[#060606]/80 backdrop-blur-2xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4 md:px-10">
          <Link href="/" className="group flex items-center gap-2.5 transition-opacity hover:opacity-90">
            <span className="text-[13px] font-semibold tracking-[0.32em] text-white">FALCO</span>
            <span className="text-[11px] uppercase tracking-[0.18em] text-emerald-400/80">· Buyers</span>
          </Link>
          <nav className="flex items-center gap-4 text-sm">
            <Link href="/" className="text-white/55 hover:text-white text-xs uppercase tracking-wider">
              Home
            </Link>
          </nav>
        </div>
      </header>

      <section className="mx-auto max-w-5xl px-6 pt-10 md:px-10 md:pt-16">
        <div className="rounded-2xl border border-dashed border-white/[0.08] px-8 py-12 md:px-14 md:py-16">
          <div className="mx-auto max-w-3xl text-center">
            <div className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] text-emerald-300/70">
              <span className="inline-block h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.9)]" />
              First-look access · Tennessee
            </div>
            <h1 className="mt-6 text-4xl md:text-6xl font-bold leading-[0.95] tracking-[-0.03em]">
              Equity-rich TN distressed homes.
              <br />
              <span className="text-white/35">Before they hit the MLS.</span>
            </h1>
            <p className="mt-8 max-w-2xl mx-auto text-[14px] uppercase leading-7 tracking-[0.12em] text-white/45">
              We source distressed properties directly from Tennessee courthouses, work with homeowners on an
              auction-first disposition path, and list through our auction partner. Registered buyers get
              notified the moment new inventory goes live.
            </p>
          </div>

          <div className="mt-12 grid gap-4 sm:grid-cols-3 max-w-3xl mx-auto">
            <ValueCard
              label="The inventory"
              value="Pre-foreclosure, lis pendens, tax distress"
              detail="Equity-positive homes, sourced before the cash-buyer market saturates them."
            />
            <ValueCard
              label="Your timing"
              value="First notice, every time"
              detail="Email + text the moment we list. Before Zillow. Before Auction.com."
            />
            <ValueCard
              label="Your deal"
              value="8% buyer's premium"
              detail="Standard auction BP. No hidden fees. Clean title, pre-verified."
            />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-6 py-12 md:px-10">
        <div className="rounded-2xl border border-dashed border-emerald-400/20 bg-[linear-gradient(180deg,rgba(16,185,129,0.04),rgba(16,185,129,0.01))] px-6 py-10 md:px-12 md:py-14">
          <div className="mx-auto max-w-2xl">
            <div className="text-center mb-8">
              <div className="text-[11px] uppercase tracking-[0.22em] text-emerald-300/80">Register for early access</div>
              <h2 className="mt-3 text-2xl md:text-3xl font-semibold tracking-[-0.02em]">
                Tell us your buy box — we'll send matching inventory as it lists.
              </h2>
              <p className="mt-3 text-sm text-white/55">
                Takes 90 seconds. No spam. Unsubscribe anytime. We only email when inventory matches your criteria.
              </p>
            </div>
            <BuyerSignupForm />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-6 pb-20 md:px-10">
        <div className="rounded-2xl border border-dashed border-white/[0.06] p-6 md:p-10">
          <div className="text-[11px] uppercase tracking-[0.22em] text-white/45 text-center mb-6">
            How it works
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <StepCard
              num="01"
              title="You register"
              body="Tell us price range, counties, property types, how fast you can close. We store it, we don't spam it."
            />
            <StepCard
              num="02"
              title="We source + vet"
              body="Our team sources Tennessee distressed properties at the courthouse level, works with the homeowner directly, and runs them through our auction partner."
            />
            <StepCard
              num="03"
              title="You bid first"
              body="Registered buyers get notified before any public listing. Standard 8% buyer's premium, clean title, auction-day close."
            />
          </div>
        </div>
      </section>

      <footer className="border-t border-dashed border-white/[0.06] px-6 py-8 md:px-10">
        <div className="mx-auto flex max-w-5xl items-center justify-between text-[11px] tracking-[0.18em] text-white/30">
          <div>FALCO</div>
          <div className="flex items-center gap-5">
            <Link href="/" className="hover:text-white/60">Home</Link>
            <span className="text-white/12">falco.llc</span>
          </div>
        </div>
      </footer>
    </main>
  )
}

function ValueCard({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
      <div className="text-[10px] uppercase tracking-[0.22em] text-white/35">{label}</div>
      <div className="mt-2 text-sm font-semibold text-white leading-snug">{value}</div>
      <div className="mt-2 text-xs leading-5 text-white/50">{detail}</div>
    </div>
  )
}

function StepCard({ num, title, body }: { num: string; title: string; body: string }) {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
      <div className="flex h-8 w-8 items-center justify-center rounded-md border border-emerald-400/25 bg-emerald-400/10 text-[11px] font-semibold text-emerald-300">
        {num}
      </div>
      <div className="mt-3 text-sm font-semibold text-white">{title}</div>
      <div className="mt-2 text-xs leading-5 text-white/55">{body}</div>
    </div>
  )
}
