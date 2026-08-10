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

      <main className="min-h-screen bg-[var(--paper)] text-[var(--ink)] selection:bg-[var(--mocha-wash)]">
        <header className="sticky top-0 z-30 border-b border-[var(--rule)] bg-[color-mix(in_oklab,var(--paper)_86%,transparent)] backdrop-blur-md">
          <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4 md:px-10">
            <Link href="/" className="text-[14px] font-semibold tracking-[0.3em] text-[var(--ink)] hover:text-[var(--mocha)] transition-colors">
              FALCO
            </Link>
            <Link href="/foreclosure" className="text-[13px] tracking-wide text-[var(--ink-faint)] hover:text-[var(--mocha)] transition-colors">
              All counties →
            </Link>
          </div>
        </header>

        <nav aria-label="Breadcrumb" className="mx-auto max-w-3xl px-6 pt-8 md:px-10 font-[family-name:var(--font-mono)] text-[12px] tracking-[0.04em] text-[var(--ink-faint)]">
          <Link href="/" className="hover:text-[var(--mocha)]">Home</Link>
          <span className="mx-2 text-[var(--rule-strong)]">/</span>
          <Link href="/foreclosure" className="hover:text-[var(--mocha)]">Foreclosure by county</Link>
        </nav>

        <section className="mx-auto max-w-3xl px-6 pt-6 pb-10 md:px-10 md:pt-8 md:pb-14">
          <div className="flex items-center gap-3 text-[12px] uppercase tracking-[0.22em] text-[var(--mocha)] font-semibold">
            Memphis, Tennessee
            <span className="h-px flex-1 bg-gradient-to-r from-[var(--rule-strong)] to-transparent" />
          </div>
          <h1 className="mt-6 text-[40px] md:text-[64px] leading-[1.04] font-semibold text-balance">
            Facing foreclosure in Memphis?{" "}
            <span className="italic text-[var(--mocha)]">Don&apos;t give your equity away.</span>
          </h1>
          <p className="mt-6 text-[18px] md:text-[21px] leading-[1.55] text-[var(--ink-soft)] max-w-[60ch]">
            If you&apos;re behind on your mortgage in Memphis, your phone is
            probably full of cash-offer calls already. Memphis has one of the
            heaviest concentrations of investors and &quot;we buy houses&quot;
            operators in the country. Here is why those offers underpay you, and
            what actually protects your equity before the trustee sale.
          </p>
          <div className="mt-7 flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-[var(--rule)] pt-5 text-[13px] text-[var(--ink-faint)]">
            <span className="font-semibold text-[var(--ink-soft)]">Patrick Yuri Armour</span>
            <span>Licensed Tennessee Auctioneer</span>
            <span className="text-[var(--rule-strong)]">·</span>
            <span>Updated July 2026</span>
          </div>
        </section>

        <article className="mx-auto max-w-3xl px-6 pb-4 md:px-10 space-y-10 md:space-y-14 text-[16px] md:text-[17px] leading-[1.72] text-[var(--ink-soft)]">
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
              <strong className="text-[var(--ink)] font-semibold">$210,000</strong>.
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
              <Link href="/guides/cash-offer-vs-auction" className="text-[var(--mocha)] hover:text-[var(--mocha-deep)] underline underline-offset-4">
                cash offer vs. auction guide
              </Link>{" "}
              and the{" "}
              <Link href="/guides/wholesaler-economics" className="text-[var(--mocha)] hover:text-[var(--mocha-deep)] underline underline-offset-4">
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
              <Link href="/foreclosure/shelby-county" className="text-[var(--mocha)] hover:text-[var(--mocha-deep)] underline underline-offset-4">
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

        {/* CTA — deep ink card, mocha button */}
        <section className="mx-auto max-w-3xl px-6 md:px-10 mt-14">
          <div className="rounded-2xl bg-[var(--ink)] p-8 md:p-11 text-[var(--paper)]">
            <div className="mb-3 text-[11px] uppercase tracking-[0.22em] text-[#c2b16a] font-semibold">
              Memphis homeowners
            </div>
            <h3 className="font-[family-name:var(--font-display)] text-[28px] md:text-[38px] leading-[1.12] font-semibold text-[var(--paper)]">
              Free 15-minute call. Real numbers for your home.
            </h3>
            <p className="mt-4 text-[15px] md:text-[16px] leading-[1.65] text-[color-mix(in_oklab,var(--paper)_74%,transparent)]">
              Within one business day we&apos;ll show you what your Memphis home
              would likely clear at a marketed auction versus what a cash buyer
              is offering. No cost, no pressure, no obligation to sell.
            </p>
            <div className="mt-7 flex flex-wrap gap-4 items-center">
              <Link href="/homeowners" className="inline-flex items-center justify-center rounded-md bg-[var(--mocha)] hover:bg-[var(--mocha-deep)] text-white font-semibold text-[15px] px-6 py-3 transition-colors">
                Get your numbers →
              </Link>
              <span className="text-[13px] text-[color-mix(in_oklab,var(--paper)_64%,transparent)]">
                Or email{" "}
                <a href="mailto:falco@falco.llc" className="text-[var(--paper)] underline underline-offset-4 decoration-[color-mix(in_oklab,var(--paper)_35%,transparent)]">
                  falco@falco.llc
                </a>
              </span>
            </div>
          </div>
        </section>

        {/* Disclaimer */}
        <section className="mx-auto max-w-3xl px-6 md:px-10 mt-8">
          <p className="text-[12.5px] leading-[1.65] text-[var(--ink-faint)]">
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
          <div className="mb-3 text-[11px] uppercase tracking-[0.2em] text-[var(--ink-faint)] font-semibold">
            Keep reading
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            {[
              { href: "/foreclosure/shelby-county", label: "Shelby County trustee sale details" },
              { href: "/guides/cash-offer-vs-auction", label: "Cash offer vs. auction: the math" },
              { href: "/guides/tennessee-foreclosure-process", label: "How Tennessee foreclosure works" },
              { href: "/homeowners", label: "Get your numbers: free 15-min call" },
            ].map((l) => (
              <Link key={l.href} href={l.href} className="rounded-lg border border-[var(--rule-strong)] bg-[var(--paper-raised)] px-4 py-3 text-[14px] text-[var(--ink-soft)] hover:border-[var(--mocha)] hover:text-[var(--ink)] transition-colors">
                {l.label} →
              </Link>
            ))}
          </div>
        </section>

        <footer className="mx-auto max-w-3xl px-6 py-10 md:px-10 mt-10 border-t border-[var(--rule)]">
          <div className="flex items-center justify-between flex-wrap gap-4 font-[family-name:var(--font-mono)] text-[12px] tracking-[0.06em] text-[var(--ink-faint)]">
            <div>FALCO · Tennessee</div>
            <div className="flex items-center gap-5">
              <Link href="/" className="hover:text-[var(--mocha)] transition-colors">Home</Link>
              <Link href="/foreclosure" className="hover:text-[var(--mocha)] transition-colors">Counties</Link>
              <Link href="/guides" className="hover:text-[var(--mocha)] transition-colors">Guides</Link>
              <Link href="/homeowners" className="hover:text-[var(--mocha)] transition-colors">Homeowners</Link>
            </div>
          </div>
        </footer>
      </main>
    </>
  )
}
