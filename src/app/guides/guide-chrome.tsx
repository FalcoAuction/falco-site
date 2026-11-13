import Link from "next/link"
import { Foot, Nav } from "../v2/v2-content"
import { FORECLOSURE_GUIDES, SITUATION_GUIDES } from "./guide-index"
import GuideReveals from "./guide-reveals"
import "./guides.css"

// Shared chrome + prose primitives for /guides/* pages. GuideSection,
// GuideKey, GuideNote and Cite are also imported by the county
// foreclosure template, so their props stay stable and their styles do
// not depend on a .gd ancestor. Look and spacing follow the manifesto:
// shared Nav and Foot, sentence-case .lbl labels, big .d1/.d2 heads, one
// idea per section, lists as rule-separated rows. Styles in guides.css.

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
    <>
      <GuideReveals />
      <Nav />
      <main id="main" className="gd">
        <section className="gd-top">
          <div className="gd-in" data-stagger="80">
            {/* Breadcrumb (also emitted as BreadcrumbList JSON-LD) */}
            <nav aria-label="Breadcrumb" className="lbl gd-crumb r">
              <Link href="/">Home</Link>
              <span aria-hidden>/</span>
              <Link href="/guides">Guides</Link>
              <span aria-hidden>/</span>
              <span>{eyebrow}</span>
            </nav>
            <h1 className="d1 r">{title}</h1>
            <p className="lede r">{standfirst}</p>
            <p className="gd-by r">
              <strong>Patrick Yuri Armour</strong>
              <span>Licensed Tennessee auctioneer</span>
              <span>Updated {updated}</span>
            </p>
          </div>
        </section>

        <article>{children}</article>

        <GuideHubLinks variant={variant} />
        {variant === "situation" ? (
          <SituationCta situation={situation} note={ctaNote} />
        ) : (
          <GuideCta />
        )}
        {variant === "situation" ? <SituationDisclaimer /> : <GuideDisclaimer />}
      </main>
      <Foot />
    </>
  )
}

// One idea per section: a numbered label, a big head, then the body.
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
    <section id={id} className="gd-sec">
      <div className="gd-in">
        <p className="lbl gd-num r" aria-hidden />
        <h2 className="d2 r">{title}</h2>
        <div className="gd-body r">{children}</div>
      </div>
    </section>
  )
}

// The key takeaway of a section.
export function GuideKey({ children }: { children: React.ReactNode }) {
  return <div className="gd-key">{children}</div>
}

// A labelled fact row. Consecutive notes read as one ruled list.
export function GuideNote({
  label,
  children,
}: {
  label?: string
  children: React.ReactNode
}) {
  return (
    <div className="gd-note">
      {label && <span className="gd-note-l">{label}</span>}
      <div className="gd-note-b">{children}</div>
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
      className="gd-cite"
    >
      [{n}]
    </a>
  )
}

// Related-guide links block: internal linking between guides. Render it
// as the last child of GuideShell so it sits above the footer.
export function GuideRelated({
  links,
}: {
  links: Array<{ href: string; label: string }>
}) {
  return (
    <section className="gd-sec">
      <div className="gd-in">
        <p className="lbl r">Keep reading</p>
        <div className="gd-rows r">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="gd-row sm">
              <span>{l.label}</span>
              <span className="arr" aria-hidden>→</span>
            </Link>
          ))}
        </div>
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
  { href: "/foreclosure", label: "All 32 counties" },
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
      <p className="lbl">{heading}</p>
      <div className="gd-rows">
        {links.map((l) => (
          <Link key={l.href} href={l.href} className="gd-row sm">
            <span>{l.label}</span>
            <span className="arr" aria-hidden>→</span>
          </Link>
        ))}
      </div>
    </div>
  )
}

function GuideHubLinks({ variant }: { variant: "foreclosure" | "situation" }) {
  return (
    <section className="gd-sec">
      <div className="gd-in">
        <p className="lbl r">More guides</p>
        <h2 className="d2 r">Every situation, in plain language.</h2>
        <div className="gd-cols r">
          {variant === "situation" ? (
            <>
              <GuideLinkList heading="By situation" links={RELATED_SITUATIONS} />
              <GuideLinkList heading="Foreclosure" links={RELATED_GUIDES} />
            </>
          ) : (
            <>
              <GuideLinkList
                heading="Foreclosure"
                links={[...RELATED_GUIDES, { href: "/guides", label: "Estates, business closings and more" }]}
              />
              <GuideLinkList heading="Foreclosure by county" links={RELATED_COUNTIES} />
            </>
          )}
        </div>
      </div>
    </section>
  )
}

function GuideCta() {
  return (
    <section className="gd-sec gd-end">
      <div className="gd-in" data-stagger="80">
        <h2 className="d2 r">Free 15-minute call. Real numbers for your situation.</h2>
        <p className="lede r">
          Within one business day we&apos;ll show you what your home would
          likely clear at a marketed auction versus what happens at the
          trustee sale. No cost, no pressure, no obligation to sell.
        </p>
        <div className="pills r">
          <Link className="pill dark" href="/homeowners">
            Get your numbers <sub>→</sub>
          </Link>
          <Link className="pill line" href="/#ask">
            Ask FALCO
          </Link>
        </div>
        <p className="gd-mail r">
          Or email <a href="mailto:falco@falco.llc">falco@falco.llc</a>
        </p>
      </div>
    </section>
  )
}

// CTA for the situation guides: sends to the homepage chat, or to /start
// with the situation preselected.
function SituationCta({
  situation,
  note,
}: {
  situation?: string
  note?: React.ReactNode
}) {
  const href = situation ? `/start?s=${situation}` : "/start"
  return (
    <section className="gd-sec gd-end">
      <div className="gd-in" data-stagger="80">
        <h2 className="d2 r">Tell us what has to sell.</h2>
        <p className="lede r">
          Within one business day we come back with what is worth auctioning,
          which licensed Tennessee firm sells it best, and what it would
          likely clear.{" "}
          {note ?? (
            <>
              No cost to you. The buyer pays a 10% premium on top of the
              winning bid, and FALCO is paid from that premium.
            </>
          )}
        </p>
        <div className="pills r">
          <Link className="pill dark" href="/#ask">
            Ask FALCO <sub>→</sub>
          </Link>
          <Link className="pill line" href={href}>
            Use the form
          </Link>
        </div>
      </div>
    </section>
  )
}

// YMYL disclaimer for the foreclosure guides. Present on every guide,
// near the CTA, so no reader mistakes this for legal advice or a promise.
function GuideDisclaimer() {
  return (
    <section className="gd-disc">
      <div className="gd-in">
        <p>
          This page is general information about Tennessee foreclosure, not
          legal, tax, or financial advice, and not a promise about any
          outcome. Every situation is different. For advice specific to your
          circumstances, consult a licensed Tennessee attorney, a
          HUD-approved housing counselor, or a licensed professional. FALCO is
          not a government agency and is not affiliated with, or approved by,
          any government program or your mortgage lender. FALCO does not buy
          your home, does not charge homeowners or take upfront fees, and
          does not promise to stop, delay, or cure any foreclosure. FALCO
          helps homeowners sell through a marketed auction run by a licensed
          Tennessee auction firm.
        </p>
      </div>
    </section>
  )
}

function SituationDisclaimer() {
  return (
    <section className="gd-disc">
      <div className="gd-in">
        <p>
          This page is general information about Tennessee and federal law,
          not legal, tax, or financial advice, and not a promise about any
          outcome. Laws change and every situation is different. For advice
          about your circumstances, consult a licensed Tennessee attorney,
          CPA, or other licensed professional. FALCO is not a law firm, a
          government agency, or a court, and is not affiliated with any of
          them. FALCO does not buy, list, broker, or sell anything itself.
          Licensed Tennessee auction firms, and licensed real estate firms
          where real estate is involved, run every sale.
        </p>
      </div>
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
    <section id="faq" className="gd-sec gd-faq">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }}
      />
      <div className="gd-in">
        <p className="lbl r">Questions</p>
        <h2 className="d2 r">Common questions</h2>
        <div className="faq r">
          {items.map((item) => (
            <details key={item.q}>
              <summary>{item.q}</summary>
              <p>{item.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  )
}

// Numbered source list at the foot of a guide. Numbers match the inline
// Cite markers.
export function GuideSources({
  sources,
  note,
}: {
  sources: Array<{ n: number; label: string; href: string }>
  note?: React.ReactNode
}) {
  return (
    <section id="sources" className="gd-sec">
      <div className="gd-in">
        <p className="lbl r">Sources</p>
        <ol className="gd-src r">
          {sources.map((s) => (
            <li key={s.n} id={`source-${s.n}`}>
              <span className="n">[{s.n}]</span>
              <a href={s.href} target="_blank" rel="noopener noreferrer nofollow">
                {s.label}
              </a>
            </li>
          ))}
        </ol>
        {note && <p className="gd-src-note r">{note}</p>}
      </div>
    </section>
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
