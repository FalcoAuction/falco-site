import HubContent from "./v2/hub-content"
import { HUB_FAQ } from "./v2/situations"

// Fully static: no server-side data on this page. force-dynamic was
// costing every crawler hit a cold render (1.1s+ TTFB, cache MISS).

// Title/description lead with what distressed owners actually type
// into Google ("facing foreclosure Tennessee", "keep equity", "sell
// before auction") — nobody searches the brand name. Brand goes last.
export const metadata = {
  title: "Sell Distressed Property and Estate Assets at Auction in Tennessee | FALCO",
  description:
    "Estate, business closing, foreclosure, bankruptcy or lien sale? FALCO routes every asset to the licensed Tennessee auctioneer who sells it best. No FALCO fee to sellers.",
  alternates: { canonical: "/" },
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
  logo: "https://falco.llc/falco-logo.png",
  image: "https://falco.llc/opengraph-image",
  description:
    "FALCO finds Tennessee property and assets that have to be sold after a death, a debt, a closing or a court case, and routes each one to the licensed auctioneer who sells it best. No FALCO fee to sellers.",
  areaServed: {
    "@type": "State",
    name: "Tennessee",
  },
  email: "falco@falco.llc",
  founder: {
    "@type": "Person",
    name: "Patrick Yuri Armour",
    jobTitle: "Licensed Tennessee Auctioneer",
  },
  priceRange: "No FALCO fee to sellers",
}

// FAQPage schema mirrors the on-page FAQ accordion verbatim — Google
// requires schema content to match visible content.
const FAQ_JSON_LD = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: HUB_FAQ.map((item) => ({
    "@type": "Question",
    name: item.q,
    acceptedAnswer: { "@type": "Answer", text: item.a },
  })),
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
      <HubContent />
    </>
  )
}
