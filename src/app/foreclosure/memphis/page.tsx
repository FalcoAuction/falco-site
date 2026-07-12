import Link from "next/link"
import {
  GuideSection,
  GuideKey,
  GuideNote,
  Cite,
} from "../../guides/guide-chrome"

export const metadata = {
  title: "Facing Foreclosure in Memphis? Sell Before the Sale, Keep Your Equity | FALCO",
  description:
    "Memphis homeowners get more lowball cash offers than anywhere in Tennessee. If you're facing foreclosure, here's why those offers underpay you and how a marketed auction protects your equity before the trustee sale.",
  alternates: { canonical: "/foreclosure/memphis" },
}

const JSON_LD = {
  "@context": "https://schema.org",
  "@type": "Article",
  headline: "Facing Foreclosure in Memphis? How to Keep Your Equity",
  description:
    "Why Memphis homeowners in foreclosure get lowballed, and how selling before the trustee sale protects equity.",
  datePublished: "2026-07-12",
  dateModified: "2026-07-12",
  author: {
    "@type": "Person",
    name: "Patrick Yuri Armour",
    jobTitle: "Licensed Tennessee Auctioneer",
  },
  publisher: {
    "@type": "Organization",
    name: "FALCO",
    logo: { "@type": "ImageObject", url: "https://falco.llc/falco-logo.png" },
  },
  about: { "@type": "City", name: "Memphis, Tennessee" },
  mainEntityOfPage: { "@type": "WebPage", "@id": "https://falco.llc/foreclosure/memphis" },
  url: "https://falco.llc/foreclosure/memphis",
}

const BREADCRUMB = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Home", item: "https://falco.llc/" },
    { "@type": "ListItem", position: 2, name: "Foreclosure by County", item: "https://falco.llc/foreclosure" },
    { "@type": "ListItem", position: 3, name: "Memphis", item: "https://falco.llc/foreclosure/memphis" },
  ],
}

export default function MemphisForeclosurePage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(BREADCRUMB) }} />

      <main className="min-h-screen bg-[#060606] text-white selection:bg-emerald-400/20 selection:text-white">
        <div className="absolute inset-0 -z-30 bg-[#060606]" />
        <div className="absolute inset-0 -z-20 bg-[radial-gradient(circle_at_top,rgba(16,185,129,0.06),transparent_45%)]" />
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:32px_32px] opacity-[0.4]" />

        <header className="sticky top-0 z-30 border-b border-white/[0.06] bg-[#060606]/80 backdrop-blur-xl">
          <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4 md:px-10">
            <Link href="/" className="text-[13px] font-semibold tracking-[0.28em] text-white hover:text-emerald-300 transition-colors">
              FALCO
            </Link>
            <Link href="/foreclosure" className="text-[12px] tracking-wide text-white/55 hover:text-white transition-colors">
              ← All counties
            </Link>
          </div>
        </header>

        <nav aria-label="Breadcrumb" className="mx-auto max-w-3xl px-6 pt-6 md:px-10 text-[11px] tracking-[0.14em] text-white/50">
          <Link href="/" className="hover:text-white/70">Home</Link>
          <span className="mx-2 text-white/25">/</span>
          <Link href="/foreclosure" className="hover:text-white/70">Foreclosure by county</Link>
        </nav>

        <section className="mx-auto max-w-3xl px-6 pt-8 pb-10 md:px-10 md:pt-12 md:pb-14">
          <div className="text-[11px] uppercase tracking-[0.28em] text-emerald-300/85 font-semibold">
            Memphis, Tennessee
          </div>
          <h1 className="mt-5 text-[34px] md:text-[54px] leading-[1.04] tracking-[-0.03em] font-semibold">
            Facing foreclosure in Memphis?{" "}
            <span className="text-emerald-400">Don&apos;t give your equity away.</span>
          </h1>
          <p className="mt-7 text-[16px] md:text-[20px] leading-[1.6] text-white/65">
            If you&apos;re behind on your mortgage in Memphis, your phone is
            probably full of cash-offer calls already. Memphis has one of the
            heaviest concentrations of investors and &quot;we buy houses&quot;
            operators in the country. Here is why those offers underpay you, and
            what actually protects your equity before the trustee sale.
          </p>
          <div className="mt-6 flex items-center gap-3 text-[12px] text-white/55">
            <span>By Patrick Yuri Armour, Licensed Tennessee Auctioneer</span>
            <span className="text-white/30">·</span>
            <span>Updated July 2026</span>
          </div>
        </section>

        <article className="mx-auto max-w-3xl px-6 pb-4 md:px-10 space-y-10 md:space-y-14 text-[15px] md:text-[16px] leading-[1.72] text-white/75">
          <GuideSection title="Why Memphis homeowners get lowballed the hardest">
            <p>
              Two things make Memphis different from the rest of Tennessee for a
              homeowner in trouble. First, the cash-buyer market here is enormous,
              so if you are behind, you are a target for a lot of offers at once.
              Second, Memphis home values are lower than the state&apos;s big
              suburban counties, which means every dollar of equity you have
              matters more, and losing it hurts more.
            </p>
            <GuideNote label="The number that frames it">
              The median Memphis home sells for roughly{" "}
              <strong className="text-white/85">$210,000</strong>.
              <Cite href="https://www.redfin.com/city/12260/TN/Memphis/housing-market" n={1} /> A
              cash buyer working the standard formula would offer well under that.
              If you have real equity in the home, that gap is money that should
              be yours.
            </GuideNote>
            <p>
              A cash offer is not a rescue. It is a wholesale price, priced to
              leave the buyer a margin, and in a market as investor-heavy as
              Memphis, the lowest offer you will accept is exactly what they aim
              for. That is the business. It is not a scam. But it is not the most
              your home is worth, either.
            </p>
          </GuideSection>

          <GuideSection title="The math is the same everywhere: the auction keeps more">
            <p>
              A marketed auction puts your Memphis home in front of competing
              buyers and lets the highest bid set the price, on a timeline fast
              enough to beat the trustee sale. The loan gets paid from the
              proceeds and the rest is yours. We break the full comparison down in
              the{" "}
              <Link href="/guides/cash-offer-vs-auction" className="text-emerald-300 hover:text-emerald-200 underline underline-offset-4">
                cash offer vs. auction guide
              </Link>{" "}
              and the{" "}
              <Link href="/guides/wholesaler-economics" className="text-emerald-300 hover:text-emerald-200 underline underline-offset-4">
                70% formula explainer
              </Link>
              .
            </p>
            <GuideKey>
              Lower home values do not change the logic, they sharpen it. When
              there is less equity to begin with, handing a chunk of it to a cash
              buyer costs you a bigger share of what you have. The auction is how
              you keep it.
            </GuideKey>
          </GuideSection>

          <GuideSection title="The Memphis trustee sale: where and when">
            <p>
              A Shelby County trustee sale is held at the southwest door of the
              Shelby County Courthouse, 140 Adams Avenue in downtown Memphis,
              typically at or about 10:00 a.m. The full local details, including
              where notices are published and who to contact about surplus funds,
              are on the{" "}
              <Link href="/foreclosure/shelby-county" className="text-emerald-300 hover:text-emerald-200 underline underline-offset-4">
                Shelby County foreclosure page
              </Link>
              . Always confirm the exact date and time against your property&apos;s
              published notice.
            </p>
          </GuideSection>

          <GuideSection title="If you have time and equity, get your number first">
            <GuideKey>
              Before you take any cash offer, find out what your Memphis home
              would actually clear at a marketed sale. That one number tells you
              whether the offer on your phone is fair or a fraction. We will run
              it with you for free, and if selling does not beat your other
              options, we will tell you that plainly.
            </GuideKey>
          </GuideSection>
        </article>

        {/* CTA */}
        <section className="mx-auto max-w-3xl px-6 md:px-10 mt-14">
          <div className="rounded-2xl border border-emerald-400/30 bg-emerald-400/[0.05] p-8 md:p-10">
            <div className="text-[11px] uppercase tracking-[0.22em] text-emerald-300 mb-3 font-semibold">
              Memphis homeowners
            </div>
            <h3 className="text-[24px] md:text-[32px] leading-tight tracking-tight font-semibold">
              Free 15-minute call. Real numbers for your home.
            </h3>
            <p className="mt-3 text-[14px] md:text-[16px] text-white/65 leading-[1.65]">
              Within one business day we&apos;ll show you what your Memphis home
              would likely clear at a marketed auction versus what a cash buyer
              is offering. No cost, no pressure, no obligation to sell.
            </p>
            <div className="mt-7 flex flex-wrap gap-3 items-center">
              <Link href="/homeowners" className="inline-flex items-center justify-center rounded-md bg-emerald-400 hover:bg-emerald-300 text-black font-semibold text-[14px] tracking-wide px-6 py-3 transition-colors">
                Get your numbers →
              </Link>
              <span className="text-[12px] text-white/55">
                Or call{" "}
                <a href="tel:6012138868" className="text-emerald-300 hover:text-emerald-200">
                  601-213-8868
                </a>
              </span>
            </div>
          </div>
        </section>

        {/* Disclaimer */}
        <section className="mx-auto max-w-3xl px-6 md:px-10 mt-8">
          <p className="text-[12px] leading-[1.65] text-white/55">
            This page is general information about foreclosure in Memphis and
            Shelby County, Tennessee, not legal, tax, or financial advice, and
            not a promise about any outcome. Sale locations, times, and
            publications are set in each property&apos;s official notice and can
            change; always confirm against the current notice. FALCO is not a
            government agency and is not affiliated with, or approved by, any
            government program or your mortgage lender. FALCO does not buy your
            home, does not charge homeowners or take upfront fees, and does not
            promise to stop, delay, or cure any foreclosure.
          </p>
        </section>

        {/* Related */}
        <section className="mx-auto max-w-3xl px-6 md:px-10 mt-8">
          <div className="text-[11px] uppercase tracking-[0.2em] text-white/50 font-semibold mb-3">
            Keep reading
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            {[
              { href: "/foreclosure/shelby-county", label: "Shelby County trustee sale details" },
              { href: "/guides/cash-offer-vs-auction", label: "Cash offer vs. auction: the math" },
              { href: "/guides/tennessee-foreclosure-process", label: "How Tennessee foreclosure works" },
              { href: "/homeowners", label: "Get your numbers: free 15-min call" },
            ].map((l) => (
              <Link key={l.href} href={l.href} className="rounded-xl border border-white/[0.08] bg-white/[0.02] px-4 py-3 text-[14px] text-white/75 hover:border-emerald-400/30 hover:text-white transition-colors">
                {l.label} →
              </Link>
            ))}
          </div>
        </section>

        <footer className="mx-auto max-w-3xl px-6 py-10 md:px-10 mt-10 border-t border-white/[0.06]">
          <div className="flex items-center justify-between flex-wrap gap-4 text-[11px] tracking-[0.18em] text-white/50">
            <div>FALCO · Tennessee</div>
            <div className="flex items-center gap-5">
              <Link href="/" className="hover:text-white/70 transition-colors">Home</Link>
              <Link href="/foreclosure" className="hover:text-white/70 transition-colors">Counties</Link>
              <Link href="/guides" className="hover:text-white/70 transition-colors">Guides</Link>
              <Link href="/homeowners" className="hover:text-white/70 transition-colors">Homeowners</Link>
            </div>
          </div>
        </footer>
      </main>
    </>
  )
}
