import HubContent from "./v2/hub-content"
import { HUB_FAQ } from "./v2/situations"
import { ogMeta } from "@/lib/og"

// Fully static: no server-side data on this page. force-dynamic was
// costing every crawler hit a cold render (1.1s+ TTFB, cache MISS).

// Title/description lead with what distressed owners actually type
// into Google ("facing foreclosure Tennessee", "keep equity", "sell
// before auction") — nobody searches the brand name. Brand goes last.
export const metadata = {
  title: "Sell Distressed Assets at Auction in Tennessee | FALCO",
  description:
    "A house, an estate, a business or anything else that has to sell. FALCO routes it to a licensed Tennessee auction firm so buyers compete. No cost to you, the buyer pays the premium.",
  alternates: { canonical: "/" },
  ...ogMeta({
    key: "home",
    title: "Sell Distressed Assets at Auction in Tennessee | FALCO",
    description: "A house, an estate, a business or anything else that has to sell. FALCO routes it to a licensed Tennessee auction firm so buyers compete. No cost to you, the buyer pays the premium.",
    path: "/",
  }),
}

// ProfessionalService structured data — the only entity markup on the
// site. Gives Google the business identity (TN service area, licensed
// auctioneer founder, contact) that a one-page brand site otherwise
// never establishes.
const JSON_LD = {
  "@context": "https://schema.org",
  "@type": "ProfessionalService",
  name: "FALCO",
  url: "https://falco.llc",
  logo: "https://falco.llc/falco-logo-square.png",
  image: "https://falco.llc/opengraph-image",
  description:
    "FALCO finds Tennessee property and assets that have to be sold after a death, a debt, a closing or a court case, and routes each one to the licensed auctioneer who sells it best. No cost to sellers; the buyer pays the premium.",
  areaServed: {
    "@type": "State",
    name: "Tennessee",
  },
  email: "help@falco.llc",
  founder: {
    "@type": "Person",
    name: "Patrick Yuri Armour",
    jobTitle: "Licensed Tennessee Auctioneer",
  },
  priceRange: "Free to sellers (buyer pays premium)",
}

// FAQPage schema mirrors the on-page FAQ accordion verbatim.
const FAQ_JSON_LD = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: HUB_FAQ.map((item) => ({
    "@type": "Question",
    name: item.q,
    acceptedAnswer: { "@type": "Answer", text: item.a },
  })),
}

// WebSite markup is what Google uses for the site name shown above the
// result, and it helps it build sitelinks from the nav and footer pages.
const SITE_JSON_LD = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "FALCO",
  alternateName: "FALCO Tennessee",
  url: "https://falco.llc/",
}

export default function HomePage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(FAQ_JSON_LD) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(SITE_JSON_LD) }}
      />
      <HubContent />
    </>
  )
}
