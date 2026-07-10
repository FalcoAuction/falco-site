import V2Content from "./v2/v2-content"

export const dynamic = "force-dynamic"

// Title/description lead with what distressed owners actually type
// into Google ("facing foreclosure Tennessee", "keep equity", "sell
// before auction") — nobody searches the brand name. Brand goes last.
export const metadata = {
  title: "Facing Foreclosure in Tennessee? Keep Your Equity | FALCO",
  description:
    "Sell your Tennessee home through a licensed marketed auction before the trustee sale takes it. No cost to you, the buyer pays the fee. You keep the equity.",
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
  telephone: "+1-601-213-8868",
  email: "falco@falco.llc",
  founder: {
    "@type": "Person",
    name: "Patrick Yuri Armour",
    jobTitle: "Licensed Tennessee Auctioneer",
  },
  priceRange: "Free to homeowners (buyer pays premium)",
}

export default function HomePage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }}
      />
      <V2Content />
    </>
  )
}
