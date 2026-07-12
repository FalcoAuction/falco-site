import Link from "next/link"

// Shared chrome + prose primitives for /guides/* pages. Reuses the
// manifesto/privacy design system verbatim (dark #060606, emerald
// accent, same type scale) so guides feel native, not bolted on.
// Server-component only — no client JS.

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
    <main className="min-h-screen bg-[#060606] text-white selection:bg-emerald-400/20 selection:text-white">
      <div className="absolute inset-0 -z-30 bg-[#060606]" />
      <div className="absolute inset-0 -z-20 bg-[radial-gradient(circle_at_top,rgba(16,185,129,0.06),transparent_45%)]" />
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:32px_32px] opacity-[0.4]" />

      <header className="sticky top-0 z-30 border-b border-white/[0.06] bg-[#060606]/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4 md:px-10">
          <Link
            href="/"
            className="text-[13px] font-semibold tracking-[0.28em] text-white hover:text-emerald-300 transition-colors"
          >
            FALCO
          </Link>
          <Link
            href="/guides"
            className="text-[12px] tracking-wide text-white/55 hover:text-white transition-colors"
          >
            ← Guides
          </Link>
        </div>
      </header>

      {/* Breadcrumb (also emitted as BreadcrumbList JSON-LD on each page) */}
      <nav
        aria-label="Breadcrumb"
        className="mx-auto max-w-3xl px-6 pt-6 md:px-10 text-[11px] tracking-[0.14em] text-white/40"
      >
        <Link href="/" className="hover:text-white/70">
          Home
        </Link>
        <span className="mx-2 text-white/20">/</span>
        <Link href="/guides" className="hover:text-white/70">
          Guides
        </Link>
      </nav>

      <section className="mx-auto max-w-3xl px-6 pt-8 pb-10 md:px-10 md:pt-12 md:pb-14">
        <div className="text-[11px] uppercase tracking-[0.28em] text-emerald-300/85 font-semibold">
          {eyebrow}
        </div>
        <h1 className="mt-5 text-[36px] md:text-[56px] leading-[1.03] tracking-[-0.03em] font-semibold">
          {title}
        </h1>
        <p className="mt-7 text-[16px] md:text-[20px] leading-[1.6] text-white/65">
          {standfirst}
        </p>
        <div className="mt-6 flex items-center gap-3 text-[12px] text-white/40">
          <span>By Patrick Yuri Armour, Licensed Tennessee Auctioneer</span>
          <span className="text-white/20">·</span>
          <span>Updated {updated}</span>
        </div>
      </section>

      <article className="mx-auto max-w-3xl px-6 pb-4 md:px-10 space-y-10 md:space-y-14 text-[15px] md:text-[16px] leading-[1.72] text-white/75">
        {children}
      </article>

      <GuideCta />
      <GuideDisclaimer />
      <GuideFooter />
    </main>
  )
}

// A titled content section within a guide.
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
      <h2 className="text-[22px] md:text-[28px] leading-[1.2] tracking-[-0.01em] font-semibold text-white">
        {title}
      </h2>
      <div className="mt-4 space-y-4">{children}</div>
    </section>
  )
}

// Emerald callout for the key takeaway of a section.
export function GuideKey({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-emerald-400/25 bg-emerald-400/[0.05] px-5 py-4 text-[14px] md:text-[15px] leading-[1.65] text-emerald-50/90">
      {children}
    </div>
  )
}

// Neutral fact/definition box.
export function GuideNote({
  label,
  children,
}: {
  label?: string
  children: React.ReactNode
}) {
  return (
    <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] px-5 py-4">
      {label && (
        <div className="text-[11px] uppercase tracking-[0.16em] text-white/45 font-semibold mb-1.5">
          {label}
        </div>
      )}
      <div className="text-[14px] leading-[1.65] text-white/65">{children}</div>
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
      className="align-super text-[10px] text-emerald-300/70 hover:text-emerald-200 ml-0.5"
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
      <div className="text-[11px] uppercase tracking-[0.2em] text-white/40 font-semibold mb-3">
        Keep reading
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        {links.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className="rounded-xl border border-white/[0.08] bg-white/[0.02] px-4 py-3 text-[14px] text-white/75 hover:border-emerald-400/30 hover:text-white transition-colors"
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
      <div className="rounded-2xl border border-emerald-400/30 bg-emerald-400/[0.05] p-8 md:p-10">
        <div className="text-[11px] uppercase tracking-[0.22em] text-emerald-300 mb-3 font-semibold">
          Talk to us
        </div>
        <h3 className="text-[24px] md:text-[32px] leading-tight tracking-tight font-semibold">
          Free 15-minute call. Real numbers for your situation.
        </h3>
        <p className="mt-3 text-[14px] md:text-[16px] text-white/65 leading-[1.65]">
          Within one business day we&apos;ll show you what your home would
          likely clear at a marketed auction versus what happens at the
          trustee sale. No cost, no pressure, no obligation to sell.
        </p>
        <div className="mt-7 flex flex-wrap gap-3 items-center">
          <Link
            href="/homeowners"
            className="inline-flex items-center justify-center rounded-md bg-emerald-400 hover:bg-emerald-300 text-black font-semibold text-[14px] tracking-wide px-6 py-3 transition-colors"
          >
            Get your numbers →
          </Link>
          <span className="text-[12px] text-white/45">
            Or email{" "}
            <a
              href="mailto:falco@falco.llc"
              className="text-emerald-300 hover:text-emerald-200"
            >
              falco@falco.llc
            </a>
          </span>
        </div>
      </div>
    </section>
  )
}

// YMYL disclaimer — foreclosure content is legally sensitive. Present
// on every guide, near the CTA, so no reader mistakes this for legal
// advice or a promise.
function GuideDisclaimer() {
  return (
    <section className="mx-auto max-w-3xl px-6 md:px-10 mt-8">
      <p className="text-[12px] leading-[1.65] text-white/35">
        This page is general information about Tennessee foreclosure, not
        legal, tax, or financial advice, and not a promise about any
        outcome. Every situation is different. For advice specific to your
        circumstances, consult a licensed Tennessee attorney, a HUD-approved
        housing counselor, or a licensed professional. FALCO is not a
        government agency and is not affiliated with, or approved by, any
        government program or your mortgage lender. FALCO does not buy your
        home, does not charge homeowners or take upfront fees, and does not
        promise to stop, delay, or cure any foreclosure. FALCO helps
        homeowners sell through a marketed auction run by a licensed
        Tennessee auction firm.
      </p>
    </section>
  )
}

function GuideFooter() {
  return (
    <footer className="mx-auto max-w-3xl px-6 py-10 md:px-10 mt-10 border-t border-white/[0.06]">
      <div className="flex items-center justify-between flex-wrap gap-4 text-[11px] tracking-[0.18em] text-white/35">
        <div>FALCO · Tennessee</div>
        <div className="flex items-center gap-5">
          <Link href="/" className="hover:text-white/70 transition-colors">
            Home
          </Link>
          <Link href="/guides" className="hover:text-white/70 transition-colors">
            Guides
          </Link>
          <Link href="/homeowners" className="hover:text-white/70 transition-colors">
            Homeowners
          </Link>
          <Link href="/inquiry" className="hover:text-white/70 transition-colors">
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
