import Link from "next/link"
import { Foot, Nav } from "../../../v2/v2-content"
import { AUTHOR_HREF } from "../../guide-chrome"
import { GUIDE_GROUPS } from "../../guide-index"
import GuideReveals from "../../guide-reveals"
import "../../guides.css"
import { ogMeta } from "@/lib/og"

const META_TITLE = "Patrick Yuri Armour, Licensed Tennessee Auctioneer | FALCO Guides"
const META_DESCRIPTION =
  "Who writes FALCO's Tennessee guides, his license, and how every guide is researched, cited and kept current."

export const metadata = {
  title: META_TITLE,
  description: META_DESCRIPTION,
  alternates: { canonical: AUTHOR_HREF },
  ...ogMeta({
    key: "guides",
    title: META_TITLE,
    description: META_DESCRIPTION,
    path: AUTHOR_HREF,
  }),
}

const COMMISSION_HREF = "https://www.tn.gov/commerce/regboards/auctioneers/support.html"

const CREDS = [
  { k: "Tennessee auctioneer", v: "Licensed, #7622" },
  { k: "Tennessee real estate license", v: "In progress" },
  { k: "Based in", v: "Nashville, Tennessee" },
  { k: "Role", v: "Founder, FALCO" },
]

const METHOD = [
  "Every legal statement is checked against the Tennessee Code, federal law or an official agency page, and cited on the page.",
  "Points that cannot be confirmed from an official source are left out, not guessed.",
  "Each guide shows the month it was last updated. Laws change, and guides are reviewed when they do.",
  "Guides explain how the law works. They are not legal, tax or financial advice, and they say when you need an attorney.",
  "FALCO does not buy, list, broker or sell anything. Where a guide describes FALCO's role, it says so plainly.",
]

export default function AuthorPage() {
  const url = `https://falco.llc${AUTHOR_HREF}`
  const ld = {
    "@context": "https://schema.org",
    "@type": "ProfilePage",
    url,
    mainEntity: {
      "@type": "Person",
      name: "Patrick Yuri Armour",
      alternateName: "Patrick Armour",
      jobTitle: "Licensed Tennessee Auctioneer",
      image: "https://falco.llc/media/patrick.jpg",
      url,
      email: "mailto:pat@falco.llc",
      address: {
        "@type": "PostalAddress",
        addressLocality: "Nashville",
        addressRegion: "TN",
        addressCountry: "US",
      },
      hasCredential: {
        "@type": "EducationalOccupationalCredential",
        credentialCategory: "license",
        name: "Tennessee Auctioneer License #7622",
        recognizedBy: {
          "@type": "GovernmentOrganization",
          name: "Tennessee Auctioneer Commission",
        },
      },
      worksFor: { "@type": "Organization", name: "FALCO", url: "https://falco.llc" },
      knowsAbout: [
        "Tennessee auctions",
        "Estate and probate sales",
        "Foreclosure",
        "Lien sales",
        "Tax sales",
        "Business liquidation",
      ],
    },
  }
  const guides = GUIDE_GROUPS.flatMap((g) => g.guides)
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }}
      />
      <GuideReveals />
      <Nav />
      <main id="main" className="gd">
        <section className="gd-top">
          <div className="gd-in" data-stagger="80">
            <nav aria-label="Breadcrumb" className="lbl gd-crumb r">
              <Link href="/">Home</Link>
              <span aria-hidden>/</span>
              <Link href="/guides">Guides</Link>
              <span aria-hidden>/</span>
              <span>Author</span>
            </nav>
            <h1 className="d1 r">Patrick Yuri Armour</h1>
            <p className="lede r">
              Licensed Tennessee auctioneer and founder of FALCO. I write these
              guides so that people facing a death, a debt or a deadline can see
              how Tennessee law actually works before they sell anything.
            </p>
          </div>
        </section>

        <section className="gd-sec">
          <div className="gd-in">
            <p className="lbl r">Credentials</p>
            <h2 className="d2 r">Licensed in Tennessee.</h2>
            <div className="gd-rows r">
              {CREDS.map((c) => (
                <div key={c.k} className="gd-row sm">
                  <span>{c.k}</span>
                  <span className="arr">{c.v}</span>
                </div>
              ))}
            </div>
            <p className="gd-src-note r">
              You can confirm an auctioneer license through the{" "}
              <a href={COMMISSION_HREF} target="_blank" rel="noopener noreferrer nofollow" className="gd-more" style={{ marginTop: 0 }}>
                Tennessee Auctioneer Commission
              </a>
              .
            </p>
          </div>
        </section>

        <section className="gd-sec">
          <div className="gd-in">
            <p className="lbl r">How the guides are made</p>
            <h2 className="d2 r">Cited, checked, and plain.</h2>
            <div className="gd-body r">
              <ul>
                {METHOD.map((m) => (
                  <li key={m}>{m}</li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <section className="gd-sec">
          <div className="gd-in">
            <p className="lbl r">Guides</p>
            <h2 className="d2 r">Everything I have written so far.</h2>
            <div className="gd-rows r">
              {guides.map((g) => (
                <Link key={g.href} href={g.href} className="gd-row sm">
                  <span>{g.title}</span>
                  <span className="arr" aria-hidden>→</span>
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section className="gd-sec gd-end">
          <div className="gd-in" data-stagger="80">
            <h2 className="d2 r">Write to me directly.</h2>
            <p className="lede r">
              Questions about a guide, a correction, or a situation that is not
              covered yet.
            </p>
            <div className="pills r">
              <a className="pill dark" href="mailto:pat@falco.llc">
                pat@falco.llc <sub>→</sub>
              </a>
              <Link className="pill line" href="/#ask">
                Ask FALCO
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Foot />
    </>
  )
}
