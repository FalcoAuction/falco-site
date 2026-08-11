import Link from "next/link"
import BuyerSignupForm from "./buyer-signup-form"

export const metadata = {
  title: "Tennessee Distressed Inventory · FALCO Buyer Access",
  description:
    "Cash buyers and active investors — get first look at Tennessee distressed properties hitting marketed auction. Registered buyers get notified the moment new inventory lists.",
  alternates: { canonical: "/buyers" },
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
    <main className="min-h-screen bg-[var(--paper)] text-[var(--ink)] relative overflow-hidden">
      {/* Background layers — match homepage aesthetic */}
      
      
      

      <header className="sticky top-0 z-40 border-b border-[var(--rule)] bg-[color-mix(in_oklab,var(--paper)_88%,transparent)] backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4 md:px-10">
          <Link href="/" className="group flex items-center gap-2.5 transition-opacity hover:opacity-90">
            <span className="text-[13px] font-semibold tracking-[0.32em] text-[var(--ink)]">FALCO</span>
            <span className="text-[11px] uppercase tracking-[0.18em] text-[var(--mocha)]">· Buyers</span>
          </Link>
          <nav className="flex items-center gap-4 text-sm">
            <Link href="/" className="text-[var(--ink-faint)] hover:text-[var(--mocha)] text-xs uppercase tracking-wider">
              Home
            </Link>
          </nav>
        </div>
      </header>

      <section className="mx-auto max-w-5xl px-6 pt-10 md:px-10 md:pt-16">
        <div className="rounded-2xl border border-[var(--rule-strong)] px-8 py-12 md:px-14 md:py-16">
          <div className="mx-auto max-w-3xl text-center">
            <div className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] text-[var(--mocha)]">
              <span className="inline-block h-2 w-2 rounded-full bg-[var(--mocha)]" />
              First-look access · Tennessee
            </div>
            <h1 className="mt-6 font-[family-name:var(--font-display)] text-[42px] md:text-[64px] font-semibold leading-[1.02] text-balance">
              Equity-rich TN distressed homes.
              <br />
              <span className="italic text-[var(--mocha)]">Before they hit the MLS.</span>
            </h1>
            <p className="mt-8 max-w-2xl mx-auto text-[16px] leading-[1.65] text-[var(--ink-soft)]">
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
              value="10% buyer's premium"
              detail="Standard auction BP. No hidden fees. Clean title, pre-verified."
            />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-6 py-12 md:px-10">
        <div className="rounded-2xl border border-[var(--mocha)]/25 bg-[var(--mocha-wash)] px-6 py-10 md:px-12 md:py-14">
          <div className="mx-auto max-w-2xl">
            <div className="text-center mb-8">
              <div className="text-[11px] uppercase tracking-[0.22em] text-[var(--mocha)]">Register for early access</div>
              <h2 className="mt-3 font-[family-name:var(--font-display)] text-[28px] md:text-[36px] font-semibold leading-tight text-balance">
                Tell us your buy box — we'll send matching inventory as it lists.
              </h2>
              <p className="mt-3 text-sm text-[var(--ink-soft)]">
                Takes 90 seconds. No spam. Unsubscribe anytime. We only email when inventory matches your criteria.
              </p>
            </div>
            <BuyerSignupForm />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-6 pb-20 md:px-10">
        <div className="rounded-2xl border border-[var(--rule)] p-6 md:p-10">
          <div className="text-[11px] uppercase tracking-[0.22em] text-[var(--ink-faint)] text-center mb-6">
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
              body="Registered buyers get notified before any public listing. Standard 10% buyer's premium, clean title, auction-day close."
            />
          </div>
        </div>
      </section>

      <footer className="border-t border-[var(--rule)] px-6 py-8 md:px-10">
        <div className="mx-auto flex max-w-5xl items-center justify-between text-[11px] tracking-[0.18em] text-[var(--ink-faint)]">
          <div>FALCO</div>
          <div className="flex items-center gap-5">
            <Link href="/" className="hover:text-[var(--mocha)]">Home</Link>
            <span className="text-[var(--rule-strong)]">falco.llc</span>
          </div>
        </div>
      </footer>
    </main>
  )
}

function ValueCard({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="rounded-xl border border-[var(--rule-strong)] bg-[var(--paper-raised)] p-5">
      <div className="text-[10px] uppercase tracking-[0.22em] text-[var(--ink-faint)]">{label}</div>
      <div className="mt-2 text-sm font-semibold text-[var(--ink)] leading-snug">{value}</div>
      <div className="mt-2 text-xs leading-5 text-[var(--ink-faint)]">{detail}</div>
    </div>
  )
}

function StepCard({ num, title, body }: { num: string; title: string; body: string }) {
  return (
    <div className="rounded-xl border border-[var(--rule-strong)] bg-[var(--paper-raised)] p-5">
      <div className="flex h-8 w-8 items-center justify-center rounded-md border border-[var(--mocha)]/30 bg-[var(--mocha-wash)] text-[11px] font-semibold text-[var(--mocha)]">
        {num}
      </div>
      <div className="mt-3 text-sm font-semibold text-[var(--ink)]">{title}</div>
      <div className="mt-2 text-xs leading-5 text-[var(--ink-soft)]">{body}</div>
    </div>
  )
}
