import Link from "next/link"
import {
  GuideSection,
  GuideKey,
  GuideNote,
  Cite,
} from "../guides/guide-chrome"

// Data shape for a Tennessee county foreclosure page. Every field that
// carries a claim (sale location, newspaper, offices) must come from a
// verified source with a citation — never written from memory. Fields
// marked optional render only when present, so an unverified fact is
// simply omitted rather than guessed.
export type CountyData = {
  slug: string
  county: string // "Davidson"
  seat: string // "Nashville"
  towns: string[] // ["Nashville", "Antioch", "Madison"]
  // Trustee sale logistics
  saleLocation: string // "the front door of the Historic Davidson County Courthouse"
  courthouseName: string
  courthouseAddress: string
  saleTime?: string // "between 10:00 a.m. and 4:00 p.m." — optional
  saleLocationCite?: string
  // Notice publication
  noticePublications: string[] // ["The Tennessean", "Nashville Ledger"]
  noticeCite?: string
  // Offices for surplus / redemption / records
  clerkAndMaster: string // office label
  clerkAndMasterUrl?: string
  registerOfDeeds: string
  registerOfDeedsUrl?: string
  officesCite?: string
  // Market framing
  medianValue?: string // "$430,000"
  medianValueCite?: string
  // Pipeline credibility (true fact: we monitor filings here)
  monitored?: boolean
}

export function countyMetadata(d: CountyData) {
  return {
    // Kept under ~60 chars so Google does not truncate it, with the
    // county first because that is what people actually search.
    // The old title ran 76 characters and was being cut mid-phrase.
    title: `${d.county} County, TN Foreclosure Help | FALCO`,
    // ~155 chars: the previous one ran past 220 and was clipped.
    description: `How trustee sales work in ${d.county} County (${d.seat}), TN: where the sale is held, where notices run, and how to sell first and keep your equity.`,
    alternates: { canonical: `/foreclosure/${d.slug}` },
  }
}

export function CountyJsonLd({ d }: { d: CountyData }) {
  const url = `https://falco.llc/foreclosure/${d.slug}`
  const article = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: `Foreclosure in ${d.county} County, Tennessee`,
    description: `Trustee sale logistics and homeowner options in ${d.county} County, TN.`,
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
    about: {
      "@type": "AdministrativeArea",
      name: `${d.county} County, Tennessee`,
    },
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
    url,
  }
  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: "https://falco.llc/" },
      { "@type": "ListItem", position: 2, name: "Foreclosure by County", item: "https://falco.llc/foreclosure" },
      { "@type": "ListItem", position: 3, name: `${d.county} County`, item: url },
    ],
  }
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(article) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
    </>
  )
}

export function CountyPage({ d }: { d: CountyData }) {
  // Defensive clean so no county's sale-time value double-prints "typically"
  // or a trailing period when shown in the fact box.
  const saleTime = d.saleTime
    ? d.saleTime.replace(/^typically\s+/i, "")
    : undefined
  return (
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
        <span className="mx-2 text-[var(--ink-faint)]">/</span>
        <Link href="/foreclosure" className="hover:text-[var(--mocha)]">Foreclosure by county</Link>
      </nav>

      <section className="mx-auto max-w-3xl px-6 pt-6 pb-10 md:px-10 md:pt-8 md:pb-14">
        <div className="flex items-center gap-3 text-[12px] uppercase tracking-[0.22em] text-[var(--mocha)] font-semibold">
          {d.county} County, Tennessee
          <span className="h-px flex-1 bg-gradient-to-r from-[var(--rule-strong)] to-transparent" />
        </div>
        <h1 className="mt-6 text-[40px] md:text-[64px] leading-[1.04] font-semibold text-balance">
          Facing foreclosure in {d.county} County?{" "}
          <span className="italic text-[var(--mocha)]">Keep your equity.</span>
        </h1>
        <p className="mt-6 text-[18px] md:text-[21px] leading-[1.55] text-[var(--ink-soft)] max-w-[60ch]">
          If your home in {d.seat} or elsewhere in {d.county} County is headed
          toward a trustee sale, here is exactly how the process works locally,
          and the option most homeowners never hear about: selling before the
          sale to protect the equity that the courthouse auction would erase.
        </p>
        <div className="mt-7 flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-[var(--rule)] pt-5 text-[13px] text-[var(--ink-faint)]">
          <span className="font-semibold text-[var(--ink-soft)]">Patrick Yuri Armour</span>
          <span>Licensed Tennessee Auctioneer</span>
          <span className="text-[var(--ink-faint)]">·</span>
          <span>Updated July 2026</span>
        </div>
      </section>

      <article className="mx-auto max-w-3xl px-6 pb-4 md:px-10 space-y-10 md:space-y-14 text-[16px] md:text-[17px] leading-[1.72] text-[var(--ink-soft)]">
        <GuideSection title={`Where a trustee sale happens in ${d.county} County`}>
          <p>
            A Tennessee trustee sale is a public auction. In {d.county} County it
            is held at {d.saleLocation}.
            <Cite href={d.saleLocationCite || "#"} n={1} />
          </p>
          <GuideNote label="Sale location">
            <span className="text-[var(--ink)] font-medium">{d.courthouseName}</span>
            <br />
            {d.courthouseAddress}
            {saleTime && (
              <div className="mt-2 text-[13px] text-[var(--ink-faint)]">
                Sale time: {saleTime} (set per notice)
              </div>
            )}
          </GuideNote>
          <p className="text-[var(--ink-faint)] text-[14px]">
            The exact date, time, and terms for any specific sale are set in
            that property&apos;s published notice, not by a fixed schedule.
            Always confirm against the current notice.
          </p>
        </GuideSection>

        <GuideSection title="Where foreclosure notices are published">
          <p>
            Tennessee law requires the sale to be advertised before it happens.
            In {d.county} County, foreclosure and trustee-sale notices run in{" "}
            {formatList(d.noticePublications)}.
            <Cite href={d.noticeCite || "#"} n={2} /> As of a 2025 change in the
            law, the notice must also be posted online for at least 20
            continuous days. If you think a sale may be scheduled on your home,
            these are where it would appear.
          </p>
        </GuideSection>

        <GuideSection title="Surplus funds, redemption, and records">
          <p>
            If a {d.county} County home sells for more than the debt, the extra
            (surplus funds) belongs to the junior lienholders and then the
            former owner. The office that handles disputed surplus and the
            related records:
          </p>
          <div className="grid sm:grid-cols-2 gap-3">
            <GuideNote label="Surplus / chancery">
              {d.clerkAndMasterUrl ? (
                <a href={d.clerkAndMasterUrl} target="_blank" rel="noopener noreferrer nofollow" className="text-[var(--mocha)] hover:text-[var(--mocha-deep)] underline underline-offset-2 decoration-[var(--mocha-wash)]">
                  {d.clerkAndMaster}
                </a>
              ) : (
                d.clerkAndMaster
              )}
            </GuideNote>
            <GuideNote label="Property records">
              {d.registerOfDeedsUrl ? (
                <a href={d.registerOfDeedsUrl} target="_blank" rel="noopener noreferrer nofollow" className="text-[var(--mocha)] hover:text-[var(--mocha-deep)] underline underline-offset-2 decoration-[var(--mocha-wash)]">
                  {d.registerOfDeeds}
                </a>
              ) : (
                d.registerOfDeeds
              )}
            </GuideNote>
          </div>
          {d.officesCite && (
            <p className="text-[var(--ink-faint)] text-[12.5px]">
              Office details verified from the county government website.
              <Cite href={d.officesCite} n={3} />
            </p>
          )}
        </GuideSection>

        <GuideSection title={`Why this matters in ${d.county} County`}>
          {d.medianValue ? (
            <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 rounded-lg border border-[var(--rule-strong)] bg-[var(--paper-raised)] px-5 py-4">
              <span className="font-[family-name:var(--font-display)] text-[34px] md:text-[42px] font-semibold leading-none text-[var(--ink)] tabular-nums">
                {d.medianValue}
              </span>
              <span className="text-[14px] text-[var(--ink-soft)] max-w-[36ch]">
                median home value. For an owner with equity that is real money,
                and at a trustee sale it can{" "}
                <span className="text-[var(--oxblood)] font-semibold">
                  vanish for the loan balance in about sixty seconds.
                </span>
                <Cite href={d.medianValueCite || "#"} n={4} />
              </span>
            </div>
          ) : (
            <p>
              For a {d.county} County homeowner with equity, a trustee sale can
              erase it for the loan balance in about sixty seconds.
            </p>
          )}
          <GuideKey>
            If you have equity and any time before the sale, selling on your own
            terms through a marketed auction that still beats the deadline
            usually keeps far more of your money than doing nothing or taking
            the first cash offer. That is what FALCO helps {d.county} County
            homeowners do, at no cost to you.
          </GuideKey>
        </GuideSection>

        <GuideSection title="How FALCO helps">
          <p>
            FALCO routes {d.county} County homes to licensed Tennessee auction
            firms that market the property to real competing buyers on a
            compressed timeline. The buyer pays the fee. You keep the equity.
            {d.monitored
              ? ` We monitor every foreclosure filing in ${d.county} County, so if a sale is scheduled, we can move fast.`
              : ""}
          </p>
        </GuideSection>
      </article>

      {/* CTA — deep ink card, mocha button (matches the guide CTA) */}
      <section className="mx-auto max-w-3xl px-6 md:px-10 mt-14">
        <div className="rounded-2xl bg-[var(--ink)] p-8 md:p-11 text-[var(--paper)]">
          <div className="mb-3 text-[11px] uppercase tracking-[0.22em] text-[#c2b16a] font-semibold">
            {d.county} County homeowners
          </div>
          <h3 className="font-[family-name:var(--font-display)] text-[28px] md:text-[38px] leading-[1.12] font-semibold text-[var(--paper)]">
            Free 15-minute call. Real numbers for your home.
          </h3>
          <p className="mt-4 text-[15px] md:text-[16px] leading-[1.65] text-[color-mix(in_oklab,var(--paper)_74%,transparent)]">
            Within one business day we&apos;ll show you what your {d.seat}-area
            home would likely clear at a marketed auction versus what happens at
            the trustee sale. No cost, no pressure, no obligation to sell.
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

      {/* YMYL disclaimer — same guardrails as the guides. */}
      <section className="mx-auto max-w-3xl px-6 md:px-10 mt-8">
        <p className="text-[12.5px] leading-[1.65] text-[var(--ink-faint)]">
          This page is general information about foreclosure in {d.county}{" "}
          County, Tennessee, not legal, tax, or financial advice, and not a
          promise about any outcome. Sale locations, times, and publications
          are set in each property&apos;s official notice and can change;
          always confirm against the current notice and the county. FALCO is
          not a government agency and is not affiliated with, or approved by,
          any government program or your mortgage lender. FALCO does not buy
          your home, does not charge homeowners or take upfront fees, and does
          not promise to stop, delay, or cure any foreclosure.
        </p>
      </section>

      {/* Related */}
      <section className="mx-auto max-w-3xl px-6 md:px-10 mt-8">
        <div className="mb-3 text-[11px] uppercase tracking-[0.2em] text-[var(--ink-faint)] font-semibold">
          Keep reading
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          {[
            { href: "/guides/tennessee-foreclosure-process", label: "How the Tennessee foreclosure process works" },
            { href: "/guides/cash-offer-vs-auction", label: "Cash offer vs. auction: the math" },
            { href: "/foreclosure", label: "Foreclosure help in other TN counties" },
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
  )
}

function formatList(items: string[]): string {
  if (items.length === 0) return "the county's legal-notice publications"
  if (items.length === 1) return items[0]
  if (items.length === 2) return `${items[0]} and ${items[1]}`
  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`
}
