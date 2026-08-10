import V2Content from "./v2/v2-content"
import { FAQ_ITEMS } from "./v2/faq-items"
import { MobileCtaBar } from "./v2/mobile-cta-bar"

// Fully static: no server-side data on this page. force-dynamic was
// costing every crawler hit a cold render (1.1s+ TTFB, cache MISS).

// Title/description lead with what distressed owners actually type
// into Google ("facing foreclosure Tennessee", "keep equity", "sell
// before auction") — nobody searches the brand name. Brand goes last.
export const metadata = {
  title: "Facing Foreclosure in Tennessee? Keep Your Equity | FALCO",
  description:
    "Sell your Tennessee home through a licensed marketed auction before the trustee sale takes it. No cost to you, the buyer pays the fee. You keep the equity.",
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
    "FALCO helps Tennessee homeowners facing foreclosure sell through licensed marketed auctions before the trustee sale, keeping the equity that would otherwise be lost. No cost to the homeowner.",
  areaServed: {
    "@type": "State",
    name: "Tennessee",
  },
  email: "falco@falco.llc",
  founder: {
    "@type": "Person",
    name: "Patrick Yuri Armour",
    jobTitle: "Licensed Tennessee Auctioneer",
    // A verifiable credential is the strongest E-E-A-T signal available
    // on a YMYL (foreclosure) page.
    hasCredential: {
      "@type": "EducationalOccupationalCredential",
      credentialCategory: "Professional License",
      name: "Tennessee Auctioneer License #7622",
      recognizedBy: {
        "@type": "Organization",
        name: "Tennessee Auctioneer Commission",
      },
    },
  },
  priceRange: "Free to homeowners (buyer pays premium)",
}

// FAQPage schema mirrors the on-page FAQ accordion verbatim — Google
// requires schema content to match visible content.
const FAQ_JSON_LD = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: FAQ_ITEMS.map((item) => ({
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
      <V2Content />
      <MobileCtaBar />
    </>
  )
}
