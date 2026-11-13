import Link from "next/link"
import { FORECLOSURE_GUIDES, SITUATION_GUIDES } from "./guide-index"

// Shared chrome + prose primitives for /guides/* pages, also imported by
// the county foreclosure pages. La Masion editorial direction: warm ivory
// ground (--paper), near-black ink, an earthy mocha accent (--mocha).
// Cormorant Garamond display serif (via the global h1/h2 rule) over DM
// Sans body. Server-component only, no client JS. Palette lives in
// globals.css tokens so the whole system moves from one place.

// variant "situation" swaps the foreclosure CTA and disclaimer for the
// any-asset versions; `situation` is the /start?s= slug to preselect.
export function GuideShell({
  eyebrow,
  title,
  standfirst,
  updated,
  children,
  variant = "foreclosure",
  situation,
  ctaNote,
}: {
  eyebrow: string
  title: React.ReactNode
  standfirst: React.ReactNode
  updated: string
  children: React.ReactNode
  variant?: "foreclosure" | "situation"
  situation?: string
  ctaNote?: React.ReactNode
}) {
  return (
    <main className="min-h-screen bg-[var(--paper)] text-[var(--ink)] selection:bg-[var(--mocha-wash)]">
      <header className="sticky top-0 z-30 border-b border-[var(--rule)] bg-[color-mix(in_oklab,var(--paper)_86%,transparent)] backdrop-blur-md">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4 md:px-10">
          <Link
            href="/"
            className="text-[14px] font-semibold tracking-[0.3em] text-[var(--ink)] hover:text-[var(--mocha)] transition-colors"
          >
            FALCO
          </Link>
          <Link
            href="/guides"
            className="text-[13px] tracking-wide text-[var(--ink-faint)] hover:text-[var(--mocha)] transition-colors"
          >
            All guides →
          </Link>
        </div>
      </header>

      {/* Breadcrumb (also emitted as BreadcrumbList JSON-LD on each page) */}
      <nav
        aria-label="Breadcrumb"
        className="mx-auto max-w-3xl px-6 pt-8 md:px-10 font-[family-name:var(--font-mono)] text-[12px] tracking-[0.04em] text-[var(--ink-faint)]"
      >
        <Link href="/" className="hover:text-[var(--mocha)]">
          Home
        </Link>
        <span className="mx-2 text-[var(--ink-faint)]">/</span>
        <Link href="/guides" className="hover:text-[var(--mocha)]">
          Guides
        </Link>
      </nav>

      <section className="mx-auto max-w-3xl px-6 pt-6 pb-10 md:px-10 md:pt-8 md:pb-14">
        <div className="flex items-center gap-3 text-[12px] uppercase tracking-[0.22em] text-[var(--mocha)] font-semibold">
          {eyebrow}
          <span className="h-px flex-1 bg-gradient-to-r from-[var(--rule-strong)] to-transparent" />
        </div>
        <h1 className="mt-6 text-[42px] md:text-[68px] leading-[1.04] font-semibold text-balance">
          {title}
        </h1>
        <p className="mt-6 text-[18px] md:text-[21px] leading-[1.55] text-[var(--ink-soft)] max-w-[60ch]">
          {standfirst}
        </p>
        <div className="mt-7 flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-[var(--rule)] pt-5 text-[13px] text-[var(--ink-faint)]">
          <span className="font-semibold text-[var(--ink-soft)]">
            Patrick Yuri Armour
          </span>
          <span>Licensed Tennessee Auctioneer</span>
          <span className="text-[var(--ink-faint)]">·</span>
          <span>Updated {updated}</span>
        </div>
      </section>

      <article className="mx-auto max-w-3xl px-6 pb-4 md:px-10 space-y-10 md:space-y-14 text-[16px] md:text-[17px] leading-[1.72] text-[var(--ink-soft)]">
        {children}
      </article>

      <GuideHubLinks variant={variant} />
      {variant === "situation" ? (
        <SituationCta situation={situation} note={ctaNote} />
      ) : (
        <GuideCta />
      )}
      {variant === "situation" ? <SituationDisclaimer /> : <GuideDisclaimer />}
      <GuideFooter />
    </main>
  )
}

// A titled content section within a guide. h2 inherits the Cormorant
// display serif from the global rule.
export function GuideSection({
  id,
  title,
  children,
}: {
  id?: string
  title: string
  children: React.ReactNode
}) {
  return (
    <section id={id} className="scroll-mt-24">
      <h2 className="text-[27px] md:text-[36px] leading-[1.12] font-semibold text-[var(--ink)] text-balance">
        {title}
      </h2>
      <div className="mt-4 space-y-4">{children}</div>
    </section>
  )
}

// Mocha callout for the key takeaway of a section.
export function GuideKey({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-r-lg border-l-[3px] border-[var(--mocha)] bg-[var(--mocha-wash)] px-6 py-5 text-[16px] md:text-[17px] leading-[1.6] text-[var(--ink)]">
      {children}
    </div>
  )
}

// Neutral fact/definition box — a white record card on the ivory ground.
export function GuideNote({
  label,
  children,
}: {
  label?: string
  children: React.ReactNode
}) {
  return (
    <div className="rounded-lg border border-[var(--rule-strong)] bg-[var(--paper-raised)] px-5 py-4 shadow-[0_1px_2px_rgba(17,17,17,0.04)]">
      {label && (
        <div className="mb-1.5 text-[11px] uppercase tracking-[0.16em] text-[var(--ink-faint)] font-semibold">
          {label}
        </div>
      )}
      <div className="text-[15px] leading-[1.6] text-[var(--ink-soft)]">
        {children}
      </div>
    </div>
  )
}

// Inline citation link with a superscript marker.
export function Cite({ href, n }: { href: string; n: number }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer nofollow"
      className="align-super text-[10px] font-semibold text-[var(--mocha)] hover:text-[var(--mocha-deep)] ml-0.5"
    >
      [{n}]
    </a>
  )
}

// Related-guide links block — internal linking between guides.
export function GuideRelated({
  links,
}: {
  links: Array<{ href: string; label: string }>
}) {
  return (
    <section className="mx-auto max-w-3xl px-6 md:px-10 mt-4">
      <div className="mb-3 text-[11px] uppercase tracking-[0.2em] text-[var(--ink-faint)] font-semibold">
        Keep reading
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        {links.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className="rounded-lg border border-[var(--rule-strong)] bg-[var(--paper-raised)] px-4 py-3 text-[14px] text-[var(--ink-soft)] hover:border-[var(--mocha)] hover:text-[var(--ink)] transition-colors"
          >
            {l.label} →
          </Link>
        ))}
      </div>
    </section>
  )
}

// Cross-links every guide to the rest of the hub and to the six county
// pages with the most search demand. Five of six guides were sitting in
// "crawled, currently not indexed" with almost no internal links in.
const RELATED_GUIDES = FORECLOSURE_GUIDES.map((g) => ({ href: g.href, label: g.short }))
const RELATED_SITUATIONS = SITUATION_GUIDES.map((g) => ({ href: g.href, label: g.short }))
const RELATED_COUNTIES = [
  { href: "/foreclosure/davidson-county", label: "Davidson (Nashville)" },
  { href: "/foreclosure/shelby-county", label: "Shelby (Memphis)" },
  { href: "/foreclosure/knox-county", label: "Knox (Knoxville)" },
  { href: "/foreclosure/hamilton-county", label: "Hamilton (Chattanooga)" },
  { href: "/foreclosure/rutherford-county", label: "Rutherford (Murfreesboro)" },
  { href: "/foreclosure/williamson-county", label: "Williamson (Franklin)" },
]
function GuideLinkList({
  heading,
  links,
}: {
  heading: string
  links: Array<{ href: string; label: string }>
}) {
  return (
    <div>
      <div className="mb-3 text-[11px] uppercase tracking-[0.2em] text-[var(--ink-faint)] font-semibold">{heading}</div>
      <ul className="space-y-2">
        {links.map((l) => (
          <li key={l.href}>
            <Link href={l.href} className="text-[15px] text-[var(--ink)] hover:text-[var(--mocha)] transition-colors">{l.label} →</Link>
          </li>
        ))}
      </ul>
    </div>
  )
}

function GuideHubLinks({ variant }: { variant: "foreclosure" | "situation" }) {
  if (variant === "situation") {
    return (
      <section className="mx-auto max-w-3xl px-6 md:px-10 mt-12">
        <div className="grid sm:grid-cols-2 gap-8">
          <GuideLinkList heading="Guides by situation" links={RELATED_SITUATIONS} />
          <GuideLinkList heading="Foreclosure guides" links={RELATED_GUIDES} />
        </div>
      </section>
    )
  }
  return (
    <section className="mx-auto max-w-3xl px-6 md:px-10 mt-12">
      <div className="grid sm:grid-cols-2 gap-8">
        <div>
          <GuideLinkList heading="More guides" links={RELATED_GUIDES} />
          <Link href="/guides" className="mt-2 inline-block text-[15px] text-[var(--ink-soft)] hover:text-[var(--mocha)] transition-colors">Estates, business closings and more →</Link>
        </div>
        <div>
          <div className="mb-3 text-[11px] uppercase tracking-[0.2em] text-[var(--ink-faint)] font-semibold">Foreclosure by county</div>
          <ul className="space-y-2">
            {RELATED_COUNTIES.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="text-[15px] text-[var(--ink)] hover:text-[var(--mocha)] transition-colors">{l.label} →</Link>
              </li>
            ))}
            <li>
              <Link href="/foreclosure" className="text-[15px] text-[var(--ink-soft)] hover:text-[var(--mocha)] transition-colors">All 32 counties →</Link>
            </li>
          </ul>
        </div>
      </div>
    </section>
  )
}

function GuideCta() {
  return (
    <section className="mx-auto max-w-3xl px-6 md:px-10 mt-14">
      <div className="rounded-2xl bg-[var(--ink)] p-8 md:p-11 text-[var(--paper)]">
        <div className="mb-3 text-[11px] uppercase tracking-[0.22em] text-[#c2b16a] font-semibold">
          Talk to us
        </div>
        <h3 className="font-[family-name:var(--font-display)] text-[28px] md:text-[38px] leading-[1.12] font-semibold text-[var(--paper)]">
          Free 15-minute call. Real numbers for your situation.
        </h3>
        <p className="mt-4 text-[15px] md:text-[16px] leading-[1.65] text-[color-mix(in_oklab,var(--paper)_74%,transparent)]">
          Within one business day we&apos;ll show you what your home would
          likely clear at a marketed auction versus what happens at the trustee
          sale. No cost, no pressure, no obligation to sell.
        </p>
        <div className="mt-7 flex flex-wrap items-center gap-4">
          <Link
            href="/homeowners"
            className="inline-flex items-center justify-center rounded-md bg-[var(--mocha)] hover:bg-[var(--mocha-deep)] text-white font-semibold text-[15px] px-6 py-3 transition-colors"
          >
            Get your numbers →
          </Link>
          <span className="text-[13px] text-[color-mix(in_oklab,var(--paper)_64%,transparent)]">
            Or email{" "}
            <a
              href="mailto:falco@falco.llc"
              className="text-[var(--paper)] underline underline-offset-4 decoration-[color-mix(in_oklab,var(--paper)_35%,transparent)]"
            >
              falco@falco.llc
            </a>
          </span>
        </div>
      </div>
    </section>
  )
}

// YMYL disclaimer — foreclosure content is legally sensitive. Present on
// every guide, near the CTA, so no reader mistakes this for legal advice
// or a promise.
function GuideDisclaimer() {
  return (
    <section className="mx-auto max-w-3xl px-6 md:px-10 mt-8">
      <p className="text-[12.5px] leading-[1.65] text-[var(--ink-faint)]">
        This page is general information about Tennessee foreclosure, not
        legal, tax, or financial advice, and not a promise about any outcome.
        Every situation is different. For advice specific to your
        circumstances, consult a licensed Tennessee attorney, a HUD-approved
        housing counselor, or a licensed professional. FALCO is not a
        government agency and is not affiliated with, or approved by, any
        government program or your mortgage lender. FALCO does not buy your
        home, does not charge homeowners or take upfront fees, and does not
        promise to stop, delay, or cure any foreclosure. FALCO helps
        homeowners sell through a marketed auction run by a licensed Tennessee
        auction firm.
      </p>
    </section>
  )
}

// CTA for the situation guides: estates, business closings, liens and
// the rest. Sends to /start with the situation preselected, or to the
// homepage chat.
function SituationCta({
  situation,
  note,
}: {
  situation?: string
  note?: React.ReactNode
}) {
  const href = situation ? `/start?s=${situation}` : "/start"
  return (
    <section className="mx-auto max-w-3xl px-6 md:px-10 mt-14">
      <div className="rounded-2xl bg-[var(--ink)] p-8 md:p-11 text-[var(--paper)]">
        <div className="mb-3 text-[11px] uppercase tracking-[0.22em] text-[#c2b16a] font-semibold">
          Talk to us
        </div>
        <h3 className="font-[family-name:var(--font-display)] text-[28px] md:text-[38px] leading-[1.12] font-semibold text-[var(--paper)]">
          Tell us what you are dealing with. We will tell you what it is worth at auction.
        </h3>
        <p className="mt-4 text-[15px] md:text-[16px] leading-[1.65] text-[color-mix(in_oklab,var(--paper)_74%,transparent)]">
          Two minutes to tell us what happened. Within one business day we
          come back with what is worth auctioning, which licensed Tennessee
          firm sells that kind of asset best, and what it would likely clear.{" "}
          {note ?? (
            <>
              No cost to you. The buyer pays a 10% premium on top of the
              winning bid, and FALCO is paid from that premium.
            </>
          )}
        </p>
        <div className="mt-7 flex flex-wrap items-center gap-4">
          <Link
            href={href}
            className="inline-flex items-center justify-center rounded-md bg-[var(--mocha)] hover:bg-[var(--mocha-deep)] text-white font-semibold text-[15px] px-6 py-3 transition-colors"
          >
            Tell us what happened →
          </Link>
          <Link
            href="/#ask"
            className="text-[14px] text-[var(--paper)] underline underline-offset-4 decoration-[color-mix(in_oklab,var(--paper)_35%,transparent)]"
          >
            Or ask a quick question
          </Link>
        </div>
      </div>
    </section>
  )
}

function SituationDisclaimer() {
  return (
    <section className="mx-auto max-w-3xl px-6 md:px-10 mt-8">
      <p className="text-[12.5px] leading-[1.65] text-[var(--ink-faint)]">
        This page is general information about Tennessee and federal law, not
        legal, tax, or financial advice, and not a promise about any outcome.
        Laws change and every situation is different. For advice about your
        circumstances, consult a licensed Tennessee attorney, CPA, or other
        licensed professional. FALCO is not a law firm, a government agency,
        or a court, and is not affiliated with any of them. FALCO does not
        buy, list, broker, or sell anything itself. Licensed Tennessee
        auction firms, and licensed real estate firms where real estate is
        involved, run every sale.
      </p>
    </section>
  )
}

// Visible FAQ plus matching FAQPage JSON-LD built from the same strings,
// so the schema always mirrors what is on the page.
export function GuideFaq({
  items,
}: {
  items: Array<{ q: string; a: string }>
}) {
  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: { "@type": "Answer", text: item.a },
    })),
  }
  return (
    <section id="faq" className="scroll-mt-24">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }}
      />
      <h2 className="text-[27px] md:text-[36px] leading-[1.12] font-semibold text-[var(--ink)] text-balance">
        Common questions
      </h2>
      <dl className="mt-5 divide-y divide-[var(--rule)] border-y border-[var(--rule)]">
        {items.map((item) => (
          <div key={item.q} className="py-5">
            <dt className="text-[17px] md:text-[18px] font-semibold leading-snug text-[var(--ink)]">
              {item.q}
            </dt>
            <dd className="mt-2">{item.a}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}

// Numbered source list at the foot of a guide. Numbers match the inline
// Cite markers.
export function GuideSources({
  sources,
}: {
  sources: Array<{ n: number; label: string; href: string }>
}) {
  return (
    <section id="sources" className="scroll-mt-24">
      <h2 className="text-[22px] md:text-[26px] leading-[1.15] font-semibold text-[var(--ink)]">
        Sources
      </h2>
      <ol className="mt-3 space-y-1.5 text-[13.5px] leading-[1.55] text-[var(--ink-faint)]">
        {sources.map((s) => (
          <li key={s.n} id={`source-${s.n}`}>
            <span className="font-semibold text-[var(--mocha)]">[{s.n}]</span>{" "}
            <a
              href={s.href}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="underline underline-offset-2 decoration-[var(--rule-strong)] hover:text-[var(--mocha)]"
            >
              {s.label}
            </a>
          </li>
        ))}
      </ol>
    </section>
  )
}

function GuideFooter() {
  return (
    <footer className="mx-auto max-w-3xl px-6 py-10 md:px-10 mt-10 border-t border-[var(--rule)]">
      <div className="flex items-center justify-between flex-wrap gap-4 font-[family-name:var(--font-mono)] text-[12px] tracking-[0.06em] text-[var(--ink-faint)]">
        <div>FALCO · Tennessee</div>
        <div className="flex items-center gap-5">
          <Link href="/" className="hover:text-[var(--mocha)] transition-colors">
            Home
          </Link>
          <Link href="/guides" className="hover:text-[var(--mocha)] transition-colors">
            Guides
          </Link>
          <Link href="/foreclosure" className="hover:text-[var(--mocha)] transition-colors">
            Counties
          </Link>
          <Link href="/inquiry" className="hover:text-[var(--mocha)] transition-colors">
            Contact
          </Link>
        </div>
      </div>
    </footer>
  )
}

// Article + BreadcrumbList JSON-LD, emitted once per guide page.
export function GuideJsonLd({
  slug,
  headline,
  description,
  datePublished,
  dateModified,
  breadcrumbName,
}: {
  slug: string
  headline: string
  description: string
  datePublished: string
  dateModified: string
  breadcrumbName: string
}) {
  const url = `https://falco.llc/guides/${slug}`
  const article = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline,
    description,
    datePublished,
    dateModified,
    author: {
      "@type": "Person",
      name: "Patrick Yuri Armour",
      jobTitle: "Licensed Tennessee Auctioneer",
    },
    publisher: {
      "@type": "Organization",
      name: "FALCO",
      logo: {
        "@type": "ImageObject",
        url: "https://falco.llc/falco-logo.png",
      },
    },
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
    url,
  }
  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: "https://falco.llc/" },
      { "@type": "ListItem", position: 2, name: "Guides", item: "https://falco.llc/guides" },
      { "@type": "ListItem", position: 3, name: breadcrumbName, item: url },
    ],
  }
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(article) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }}
      />
    </>
  )
}
