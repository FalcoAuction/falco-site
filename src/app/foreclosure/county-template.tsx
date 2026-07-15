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
    title: `Foreclosure in ${d.county} County, TN: Trustee Sales & Your Options | FALCO`,
    description: `How foreclosure and trustee sales work in ${d.county} County (${d.seat}), Tennessee: where the sale is held, where notices are published, who to contact about surplus funds, and how to sell before the sale to keep your equity.`,
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
  return (
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

      <nav aria-label="Breadcrumb" className="mx-auto max-w-3xl px-6 pt-6 md:px-10 text-[11px] tracking-[0.14em] text-white/40">
        <Link href="/" className="hover:text-white/70">Home</Link>
        <span className="mx-2 text-white/20">/</span>
        <Link href="/foreclosure" className="hover:text-white/70">Foreclosure by county</Link>
      </nav>

      <section className="mx-auto max-w-3xl px-6 pt-8 pb-10 md:px-10 md:pt-12 md:pb-14">
        <div className="text-[11px] uppercase tracking-[0.28em] text-emerald-300/85 font-semibold">
          {d.county} County, Tennessee
        </div>
        <h1 className="mt-5 text-[34px] md:text-[54px] leading-[1.04] tracking-[-0.03em] font-semibold">
          Facing foreclosure in {d.county} County?{" "}
          <span className="text-emerald-400">Keep your equity.</span>
        </h1>
        <p className="mt-7 text-[16px] md:text-[20px] leading-[1.6] text-white/65">
          If your home in {d.seat} or elsewhere in {d.county} County is headed
          toward a trustee sale, here is exactly how the process works locally,
          and the option most homeowners never hear about: selling before the
          sale to protect the equity that the courthouse auction would erase.
        </p>
        <div className="mt-6 flex items-center gap-3 text-[12px] text-white/55">
          <span>By Patrick Yuri Armour, Licensed Tennessee Auctioneer</span>
          <span className="text-white/30">·</span>
          <span>Updated July 2026</span>
        </div>
      </section>

      <article className="mx-auto max-w-3xl px-6 pb-4 md:px-10 space-y-10 md:space-y-14 text-[15px] md:text-[16px] leading-[1.72] text-white/75">
        <GuideSection title={`Where a trustee sale happens in ${d.county} County`}>
          <p>
            A Tennessee trustee sale is a public auction, and in {d.county}{" "}
            County it is held at {d.saleLocation}
            {d.saleTime ? `, typically ${d.saleTime}` : ""}.
            <Cite href={d.saleLocationCite || "#"} n={1} />
          </p>
          <GuideNote label="Sale location">
            {d.courthouseName}
            <br />
            {d.courthouseAddress}
          </GuideNote>
          <p className="text-white/55 text-[14px]">
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
                <a href={d.clerkAndMasterUrl} target="_blank" rel="noopener noreferrer nofollow" className="text-emerald-300 hover:text-emerald-200">
                  {d.clerkAndMaster}
                </a>
              ) : (
                d.clerkAndMaster
              )}
            </GuideNote>
            <GuideNote label="Property records">
              {d.registerOfDeedsUrl ? (
                <a href={d.registerOfDeedsUrl} target="_blank" rel="noopener noreferrer nofollow" className="text-emerald-300 hover:text-emerald-200">
                  {d.registerOfDeeds}
                </a>
              ) : (
                d.registerOfDeeds
              )}
            </GuideNote>
          </div>
          {d.officesCite && (
            <p className="text-white/55 text-[12px]">
              Office details verified from the county government website.
              <Cite href={d.officesCite} n={3} />
            </p>
          )}
        </GuideSection>

        <GuideSection title={`Why this matters in ${d.county} County`}>
          <p>
            {d.medianValue ? (
              <>
                The median home in {d.county} County is worth around{" "}
                <strong className="text-white/90">{d.medianValue}</strong>.
                <Cite href={d.medianValueCite || "#"} n={4} /> For a homeowner
                with equity, that is real money, and at a trustee sale it can
                vanish for the loan balance in about sixty seconds.
              </>
            ) : (
              <>
                For a {d.county} County homeowner with equity, a trustee sale
                can erase it for the loan balance in about sixty seconds.
              </>
            )}
          </p>
          <GuideKey>
            If you have equity and any time before the sale, selling on your own
            terms, through a marketed auction that still beats the deadline,
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

      {/* CTA */}
      <section className="mx-auto max-w-3xl px-6 md:px-10 mt-14">
        <div className="rounded-2xl border border-emerald-400/30 bg-emerald-400/[0.05] p-8 md:p-10">
          <div className="text-[11px] uppercase tracking-[0.22em] text-emerald-300 mb-3 font-semibold">
            {d.county} County homeowners
          </div>
          <h3 className="text-[24px] md:text-[32px] leading-tight tracking-tight font-semibold">
            Free 15-minute call. Real numbers for your home.
          </h3>
          <p className="mt-3 text-[14px] md:text-[16px] text-white/65 leading-[1.65]">
            Within one business day we&apos;ll show you what your {d.seat}-area
            home would likely clear at a marketed auction versus what happens at
            the trustee sale. No cost, no pressure, no obligation to sell.
          </p>
          <div className="mt-7 flex flex-wrap gap-3 items-center">
            <Link href="/homeowners" className="inline-flex items-center justify-center rounded-md bg-emerald-400 hover:bg-emerald-300 text-black font-semibold text-[14px] tracking-wide px-6 py-3 transition-colors">
              Get your numbers →
            </Link>
            <span className="text-[12px] text-white/55">
              Or email{" "}
              <a href="mailto:falco@falco.llc" className="text-emerald-300 hover:text-emerald-200">
                falco@falco.llc
              </a>
            </span>
          </div>
        </div>
      </section>

      {/* YMYL disclaimer — same guardrails as the guides. */}
      <section className="mx-auto max-w-3xl px-6 md:px-10 mt-8">
        <p className="text-[12px] leading-[1.65] text-white/55">
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
        <div className="text-[11px] uppercase tracking-[0.2em] text-white/50 font-semibold mb-3">
          Keep reading
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          {[
            { href: "/guides/tennessee-foreclosure-process", label: "How the Tennessee foreclosure process works" },
            { href: "/guides/cash-offer-vs-auction", label: "Cash offer vs. auction: the math" },
            { href: "/foreclosure", label: "Foreclosure help in other TN counties" },
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
  )
}

function formatList(items: string[]): string {
  if (items.length === 0) return "the county's legal-notice publications"
  if (items.length === 1) return items[0]
  if (items.length === 2) return `${items[0]} and ${items[1]}`
  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`
}
