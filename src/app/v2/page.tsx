import Link from "next/link"
import FaqSection from "./faq-section"

export const dynamic = "force-dynamic"

export const metadata = {
  title: "FALCO · Tennessee Distressed Real Estate",
  description:
    "FALCO routes distressed Tennessee homes to marketed auction — not to wholesalers. Homeowners keep their equity. Buyers get first look.",
}

export default function V2HomePage() {
  return (
    <main className="min-h-screen bg-[#060606] text-white selection:bg-emerald-400/20 selection:text-white">
      {/* Single subtle dot grid background — no animation, no orbiting canvas */}
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[size:36px_36px]" />

      {/* === HEADER === */}
      <header className="sticky top-0 z-30 border-b border-white/[0.06] bg-[#060606]/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4 md:px-10">
          <Link
            href="/"
            className="text-[13px] font-semibold tracking-[0.28em] text-white hover:text-emerald-300 transition-colors"
          >
            FALCO
          </Link>
          <nav className="flex items-center gap-5 text-[12px] tracking-wide text-white/60">
            <a href="#homeowners" className="hover:text-white transition-colors hidden md:inline">
              Homeowners
            </a>
            <a href="#buyers" className="hover:text-white transition-colors hidden md:inline">
              Buyers
            </a>
            <a href="#how" className="hover:text-white transition-colors hidden md:inline">
              How it works
            </a>
            <Link
              href="/partner-login"
              className="rounded-md border border-white/12 bg-white/[0.04] hover:bg-white/[0.08] px-3 py-1.5 text-[11px] uppercase tracking-wider text-white transition-colors"
            >
              Partner Login
            </Link>
          </nav>
        </div>
      </header>

      {/* === HERO === */}
      <section className="mx-auto max-w-5xl px-6 pt-24 pb-28 md:px-10 md:pt-32 md:pb-40">
        <div className="max-w-3xl">
          <div className="mb-8 inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] text-emerald-300/70">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400" />
            Tennessee · Distressed Real Estate
          </div>

          <h1 className="text-[44px] md:text-[72px] leading-[0.96] tracking-[-0.035em] font-semibold text-white">
            We route distressed Tennessee homes{" "}
            <span className="text-emerald-400">to auction</span>
            <span className="text-white/40"> — not to wholesalers.</span>
          </h1>

          <p className="mt-8 max-w-2xl text-[16px] md:text-[17px] leading-[1.65] text-white/55">
            FALCO sources homeowners facing foreclosure across all 95 Tennessee counties,
            works with them directly, and lists their property through our auction partner.
            The seller keeps the equity. The buyer gets first look. The wholesaler gets cut out.
          </p>

          <div className="mt-10 flex flex-wrap items-center gap-3">
            <a
              href="#homeowners"
              className="inline-flex items-center justify-center rounded-md bg-emerald-400 hover:bg-emerald-300 text-black font-semibold text-[13px] tracking-wide px-5 py-2.5 transition-colors"
            >
              For Homeowners
            </a>
            <a
              href="#buyers"
              className="inline-flex items-center justify-center rounded-md border border-white/15 bg-white/[0.04] hover:bg-white/[0.08] text-white font-semibold text-[13px] tracking-wide px-5 py-2.5 transition-colors"
            >
              For Buyers
            </a>
          </div>

          {/* Inline stat line instead of metric cards */}
          <div className="mt-14 pt-6 border-t border-white/[0.08] text-[13px] text-white/45 tracking-wide">
            <span className="text-white/75 font-medium">95</span> Tennessee counties monitored
            <span className="mx-3 text-white/20">·</span>
            <span className="text-white/75 font-medium">91</span> active files
            <span className="mx-3 text-white/20">·</span>
            <span className="text-white/75 font-medium">45</span> ready to call today
            <span className="mx-3 text-white/20">·</span>
            <span className="text-white/75 font-medium">42</span> packeted in vault
          </div>
        </div>
      </section>

      {/* === THESIS === */}
      <section className="mx-auto max-w-5xl px-6 py-20 md:px-10">
        <div className="grid md:grid-cols-[200px_1fr] gap-8 md:gap-16">
          <div>
            <div className="text-[11px] uppercase tracking-[0.22em] text-emerald-300/70">
              Our thesis
            </div>
          </div>
          <div className="max-w-2xl">
            <p className="text-[18px] md:text-[22px] leading-[1.55] text-white/85 font-light tracking-tight">
              Tennessee homeowners lose{" "}
              <span className="text-white font-medium">$200,000 of equity</span> to
              wholesalers every week, because no one told them there was a third option.
              Most sign a cash contract in their kitchen with the first investor who knocked.
            </p>
            <p className="mt-6 text-[15px] leading-[1.75] text-white/55">
              We source those homeowners before the wholesalers descend, show them the math
              on what a marketed auction would yield, and — when it makes sense — list the
              property with our Tennessee auction partner. $0 in seller commission. 8%
              buyer's premium. Sale price set by the market, not by a flipper's margin.
            </p>
            <p className="mt-6 text-[15px] leading-[1.75] text-white/55">
              We're not buying your house. We're not a bank. We're not a wholesaler
              wearing a different logo. We're a pipeline that ends with the homeowner
              keeping what they actually built, and the buyer getting first look at what's
              coming.
            </p>
          </div>
        </div>
      </section>

      <Divider />

      {/* === HOW IT WORKS === */}
      <section id="how" className="mx-auto max-w-5xl px-6 py-20 md:px-10">
        <div className="mb-14 max-w-2xl">
          <div className="text-[11px] uppercase tracking-[0.22em] text-emerald-300/70 mb-3">
            How it works
          </div>
          <h2 className="text-[32px] md:text-[44px] leading-[1.05] tracking-[-0.02em] font-semibold">
            Three steps. No middlemen.
          </h2>
        </div>

        <div className="grid gap-10 md:grid-cols-3">
          <Step
            num="01"
            title="We source"
            body="Daily scrapes of trustee notices, lis pendens filings, tax records, and probate courts across all 95 Tennessee counties. Every actionable distressed property gets a full dossier — owner contact, valuation, mortgage history, sale timing."
          />
          <Step
            num="02"
            title="We call"
            body="Our team reaches the homeowner directly — not with a lowball cash offer, but with the actual math on what they could keep through a marketed sale. Most don't know the option exists. We're the one call that gives them real numbers."
          />
          <Step
            num="03"
            title="We list"
            body="Property goes to marketed auction with our Tennessee auction partner. Buyers compete. Property sells at market value. Homeowner pays zero fees. Buyer pays a standard 8% premium. Everyone knows the terms up front."
          />
        </div>
      </section>

      <Divider />

      {/* === FOR HOMEOWNERS === */}
      <section id="homeowners" className="mx-auto max-w-5xl px-6 py-20 md:px-10">
        <div className="grid md:grid-cols-[220px_1fr] gap-8 md:gap-16">
          <div>
            <div className="text-[11px] uppercase tracking-[0.22em] text-emerald-300/70">
              For homeowners
            </div>
          </div>
          <div className="max-w-2xl">
            <h2 className="text-[32px] md:text-[44px] leading-[1.05] tracking-[-0.02em] font-semibold">
              If you're facing foreclosure in Tennessee — read this.
            </h2>

            <div className="mt-8 space-y-6 text-[15px] leading-[1.75] text-white/60">
              <p>
                You're going to get a lot of calls in the next few weeks. Wholesalers
                offering 60–70% of your home's value, cash, fast. Most homeowners take
                those offers because they don't know there's a third option besides
                letting the trustee sale happen.
              </p>
              <p className="text-white/80">
                There is. And it's built for you, not for the person buying your house.
              </p>
            </div>

            {/* Three-paths table */}
            <div className="mt-10 rounded-lg border border-white/[0.08] overflow-hidden">
              <div className="grid grid-cols-[1fr_auto] gap-4 px-5 py-3 bg-white/[0.03] text-[11px] uppercase tracking-wider text-white/45">
                <div>What you do</div>
                <div>What you walk away with</div>
              </div>
              <div className="grid grid-cols-[1fr_auto] gap-4 px-5 py-4 border-t border-white/[0.06]">
                <div className="text-[14px] text-white/70">Do nothing → trustee sale</div>
                <div className="text-[14px] text-red-300 font-medium tabular-nums">$0</div>
              </div>
              <div className="grid grid-cols-[1fr_auto] gap-4 px-5 py-4 border-t border-white/[0.06]">
                <div className="text-[14px] text-white/70">Sell to a wholesaler at 60–70%</div>
                <div className="text-[14px] text-amber-200 font-medium tabular-nums">$25K – $50K</div>
              </div>
              <div className="grid grid-cols-[1fr_auto] gap-4 px-5 py-4 border-t border-white/[0.06] bg-emerald-400/[0.04]">
                <div className="text-[14px] text-emerald-100 font-medium">List with us → marketed auction</div>
                <div className="text-[14px] text-emerald-300 font-semibold tabular-nums">$100K+</div>
              </div>
            </div>

            <div className="mt-8 space-y-4 text-[15px] leading-[1.75] text-white/60">
              <p>
                We don't buy your house. Our Tennessee auction partner sells it on your
                behalf for what it's actually worth. You pay zero in commission. We get
                paid out of the standard auction premium the buyer pays on top of their
                bid. You keep what's left after your mortgage is paid off.
              </p>
              <p className="text-white/80">
                Most homeowners we work with walk with between $100,000 and $250,000 they
                would have otherwise lost.
              </p>
            </div>

            <div className="mt-10 flex flex-wrap gap-3">
              <a
                href="mailto:falcoauction@gmail.com?subject=Tennessee%20foreclosure%20help&body=Hi%20FALCO%20--%20I'm%20facing%20a%20trustee%20sale%20and%20would%20like%20to%20hear%20how%20your%20auction%20option%20works.%0A%0AProperty%20address%3A%0AApprox.%20sale%20date%3A%0AMortgage%20balance%3A%0ABest%20phone%20to%20reach%20me%3A"
                className="inline-flex items-center rounded-md bg-emerald-400 hover:bg-emerald-300 text-black font-semibold text-[13px] tracking-wide px-5 py-2.5 transition-colors"
              >
                Get a free 15-min call
              </a>
              <div className="text-[12px] text-white/40 self-center">
                No sales pitch. Real math. We either can help you or we can't.
              </div>
            </div>
          </div>
        </div>
      </section>

      <Divider />

      {/* === FOR BUYERS === */}
      <section id="buyers" className="mx-auto max-w-5xl px-6 py-20 md:px-10">
        <div className="grid md:grid-cols-[220px_1fr] gap-8 md:gap-16">
          <div>
            <div className="text-[11px] uppercase tracking-[0.22em] text-emerald-300/70">
              For buyers
            </div>
          </div>
          <div className="max-w-2xl">
            <h2 className="text-[32px] md:text-[44px] leading-[1.05] tracking-[-0.02em] font-semibold">
              If you buy distressed Tennessee real estate — read this.
            </h2>

            <div className="mt-8 space-y-6 text-[15px] leading-[1.75] text-white/60">
              <p>
                We source equity-rich Tennessee distressed properties before they hit MLS,
                before they propagate to PropStream and BatchLeads, before the wholesaler
                swarm descends. Then we list them through our Tennessee auction partner —
                clean title, pre-verified, standard 8% buyer's premium.
              </p>
              <p>
                No underwater junk. No title surprises. No hidden fees stacked on closing.
                You bid the number you want to pay. If you win, you close. That's it.
              </p>
            </div>

            <ul className="mt-8 space-y-3 text-[14px] text-white/70">
              <BuyerBullet text="First-look notifications on Tennessee inventory before any public listing" />
              <BuyerBullet text="Equity-positive deals only — we filter out the properties that don't have room" />
              <BuyerBullet text="Standard 8% buyer's premium, no buried surprises, no junk fees" />
              <BuyerBullet text="Clean title delivered at close by the auction partner" />
              <BuyerBullet text="Pre-registered buyers get priority on properties matching their buy box" />
            </ul>

            <div className="mt-10 flex flex-wrap gap-3">
              <Link
                href="/buyers"
                className="inline-flex items-center rounded-md bg-emerald-400 hover:bg-emerald-300 text-black font-semibold text-[13px] tracking-wide px-5 py-2.5 transition-colors"
              >
                Register for buyer access →
              </Link>
              <div className="text-[12px] text-white/40 self-center">
                90-second form. No spam. Unsubscribe anytime.
              </div>
            </div>
          </div>
        </div>
      </section>

      <Divider />

      {/* === WHY WE'RE DIFFERENT === */}
      <section className="mx-auto max-w-5xl px-6 py-20 md:px-10">
        <div className="mb-14 max-w-2xl">
          <div className="text-[11px] uppercase tracking-[0.22em] text-emerald-300/70 mb-3">
            What makes us different
          </div>
          <h2 className="text-[32px] md:text-[44px] leading-[1.05] tracking-[-0.02em] font-semibold">
            Not wholesalers. Not MLS. Not Auction.com.
          </h2>
        </div>

        <div className="grid gap-8 md:grid-cols-3">
          <Diff
            label="vs. wholesalers"
            body="They profit when you sell at a discount. We profit when you sell at market. Our incentives point the same direction as yours; theirs point against."
          />
          <Diff
            label="vs. traditional MLS"
            body="90 days on market, 6% commission to a broker, staging, showings, inspection surprises. We run 45–75 days, seller pays zero, auction day is the close."
          />
          <Diff
            label="vs. national auction platforms"
            body="Auction.com is for REOs after the bank already foreclosed. Hubzu is bank-side. We work with the homeowner before the foreclosure — so they keep the equity, not the lender."
          />
        </div>
      </section>

      <Divider />

      {/* === FAQ === */}
      <section className="mx-auto max-w-5xl px-6 py-20 md:px-10">
        <div className="mb-14 max-w-2xl">
          <div className="text-[11px] uppercase tracking-[0.22em] text-emerald-300/70 mb-3">
            Common questions
          </div>
          <h2 className="text-[32px] md:text-[44px] leading-[1.05] tracking-[-0.02em] font-semibold">
            Straight answers.
          </h2>
        </div>

        <FaqSection />
      </section>

      {/* === FOOTER === */}
      <footer className="mx-auto max-w-5xl px-6 py-10 md:px-10 border-t border-white/[0.06]">
        <div className="flex items-center justify-between flex-wrap gap-4 text-[11px] tracking-[0.18em] text-white/35">
          <div>FALCO · Tennessee</div>
          <div className="flex items-center gap-5">
            <Link href="/buyers" className="hover:text-white/70 transition-colors">
              Buyers
            </Link>
            <Link href="/partner-login" className="hover:text-white/70 transition-colors">
              Partner login
            </Link>
            <span className="text-white/15">falco.llc</span>
          </div>
        </div>
      </footer>
    </main>
  )
}

function Divider() {
  return (
    <div className="mx-auto max-w-5xl px-6 md:px-10">
      <div className="h-px bg-white/[0.06]" />
    </div>
  )
}

function Step({ num, title, body }: { num: string; title: string; body: string }) {
  return (
    <div>
      <div className="text-[11px] text-emerald-400/80 font-medium tracking-[0.18em] tabular-nums">
        {num}
      </div>
      <div className="mt-3 text-[18px] font-semibold text-white">{title}</div>
      <p className="mt-3 text-[14px] leading-[1.7] text-white/55">{body}</p>
    </div>
  )
}

function Diff({ label, body }: { label: string; body: string }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-[0.18em] text-white/40 font-medium">
        {label}
      </div>
      <p className="mt-3 text-[14px] leading-[1.7] text-white/75">{body}</p>
    </div>
  )
}

function BuyerBullet({ text }: { text: string }) {
  return (
    <li className="flex items-start gap-3">
      <span className="mt-2 inline-block h-1 w-1 rounded-full bg-emerald-400 shrink-0" />
      <span>{text}</span>
    </li>
  )
}
