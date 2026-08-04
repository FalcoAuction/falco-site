import Link from "next/link"

// Shared chrome + prose primitives for /guides/* pages, also imported by
// the county foreclosure pages. La Masion editorial direction: warm ivory
// ground (--paper), near-black ink, an earthy mocha accent (--mocha).
// Cormorant Garamond display serif (via the global h1/h2 rule) over DM
// Sans body. Server-component only, no client JS. Palette lives in
// globals.css tokens so the whole system moves from one place.

export function GuideShell({
  eyebrow,
  title,
  standfirst,
  updated,
  children,
}: {
  eyebrow: string
  title: React.ReactNode
  standfirst: React.ReactNode
  updated: string
  children: React.ReactNode
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
        <span className="mx-2 text-[var(--rule-strong)]">/</span>
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
          <span className="text-[var(--rule-strong)]">·</span>
          <span>Updated {updated}</span>
        </div>
      </section>

      <article className="mx-auto max-w-3xl px-6 pb-4 md:px-10 space-y-10 md:space-y-14 text-[16px] md:text-[17px] leading-[1.72] text-[var(--ink-soft)]">
        {children}
      </article>

      <GuideCta />
      <GuideDisclaimer />
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

function GuideCta() {
  return (
    <section className="mx-auto max-w-3xl px-6 md:px-10 mt-14">
      <div className="rounded-2xl bg-[var(--ink)] p-8 md:p-11 text-[var(--paper)]">
        <div className="mb-3 text-[11px] uppercase tracking-[0.22em] text-[#c9a98a] font-semibold">
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
