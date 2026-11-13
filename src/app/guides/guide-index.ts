// Every guide, grouped by the situation a reader arrives in. Read by the
// /guides hub and the cross-links at the foot of each guide. Keep in sync
// with the guide routes and sitemap.ts.

export type GuideLink = {
  href: string
  title: string
  short: string
  blurb: string
}

export type GuideGroup = {
  id: string
  label: string
  intro: string
  situationHref?: string
  guides: GuideLink[]
}

export const GUIDE_GROUPS: GuideGroup[] = [
  {
    id: "estates",
    label: "Estates and probate",
    intro:
      "Someone has passed and the house, vehicles, guns and collections need a buyer. What the executor can do, when the court has to sign off, and how each kind of asset gets sold.",
    situationHref: "/situations/estate",
    guides: [
      {
        href: "/guides/selling-estate-property-tennessee",
        title: "Selling Estate and Probate Property in Tennessee",
        short: "Selling estate property",
        blurb:
          "Executor authority, when court approval is needed, the creditor period, heirs who disagree, and selling the house alongside the vehicles, firearms and collections.",
      },
      {
        href: "/guides/estate-firearms-collections-tennessee",
        title: "Selling Firearms and Collections From a Tennessee Estate",
        short: "Estate firearms and collections",
        blurb:
          "What federal and Tennessee law allow an executor to do with inherited guns, why licensed auctioneers handle the transfers, and how coins, art and other collections are sold.",
      },
    ],
  },
  {
    id: "business",
    label: "A business is closing",
    intro:
      "Equipment, fleet, inventory and sometimes the building. Who has to be told, what the lender is owed, and how assets reach buyers who compete.",
    situationHref: "/situations/business-closing",
    guides: [
      {
        href: "/guides/business-liquidation-tennessee",
        title: "Liquidating a Closing Business in Tennessee",
        short: "Liquidating a closing business",
        blurb:
          "WARN and Tennessee layoff notices, secured lenders and UCC liens, sales tax clearance, final paychecks, and how equipment, fleet, inventory and real estate get sold.",
      },
      {
        href: "/guides/sell-vehicles-equipment-boats-aircraft-auction",
        title: "Selling Vehicles, Equipment, Boats and Aircraft at Auction",
        short: "Vehicles, equipment, boats, aircraft",
        blurb:
          "Titles, registrations, liens and paperwork for each kind of asset in Tennessee, and what a buyer needs from you to take it home.",
      },
    ],
  },
  {
    id: "foreclosure",
    label: "Foreclosure",
    intro:
      "A trustee sale is scheduled or the notices have started. How the process works, the real exits, and what each one is worth.",
    situationHref: "/situations/foreclosure",
    guides: [
      {
        href: "/guides/tennessee-foreclosure-process",
        title: "The Tennessee Foreclosure Process, Start to Finish",
        short: "The Tennessee foreclosure process",
        blurb:
          "How a non-judicial (trustee sale) foreclosure works in Tennessee: the notice, the timeline, sale day, and the exits available at each stage.",
      },
      {
        href: "/guides/postpone-trustee-sale-tennessee",
        title: "Can You Postpone a Trustee Sale in Tennessee?",
        short: "Postponing a trustee sale",
        blurb:
          "If your sale date is close: the real ways a Tennessee trustee sale gets pushed back or stopped, who controls each one, and how to use the time.",
      },
      {
        href: "/guides/cash-offer-vs-auction",
        title: "Cash Offer vs. Marketed Auction",
        short: "Cash offer vs. auction",
        blurb:
          "What a 'we buy houses' cash offer actually nets you versus a marketed auction, with the math distressed sellers rarely get to see.",
      },
      {
        href: "/guides/short-sale-vs-auction",
        title: "Short Sale vs. Selling Before the Sale",
        short: "Short sale vs. auction",
        blurb:
          "When a short sale makes sense, when it doesn't, and how it compares to selling your home outright before the trustee sale.",
      },
      {
        href: "/guides/wholesaler-economics",
        title: "How Wholesalers Price a Distressed House",
        short: "How wholesalers make money",
        blurb:
          "The 70% formula behind every cash offer, why the discount exists, and where your equity goes when you take one.",
      },
      {
        href: "/guides/tennessee-foreclosure-surplus-funds",
        title: "Foreclosure Surplus Funds: Is Money Owed to You?",
        short: "Claiming surplus funds",
        blurb:
          "If your home sold at foreclosure for more than you owed, the surplus may be yours. How to claim it for free, and the recovery-company traps to avoid.",
      },
    ],
  },
  {
    id: "bankruptcy",
    label: "Bankruptcy and receivership",
    intro:
      "A trustee, debtor in possession or court-appointed receiver has to turn assets into money under court supervision.",
    situationHref: "/situations/bankruptcy",
    guides: [
      {
        href: "/guides/bankruptcy-receivership-sales-tennessee",
        title: "Bankruptcy and Receivership Sales in Tennessee",
        short: "Bankruptcy and receivership sales",
        blurb:
          "Chapter 7 trustee sales, court approval of sales and auctioneers, what debtors keep, and how a Tennessee receiver sells under a court order.",
      },
    ],
  },
  {
    id: "liens",
    label: "Lien sales",
    intro:
      "A marina, storage facility, repair shop or tow yard is owed money and holding the property. The notice rules come first.",
    situationHref: "/situations/lien-sale",
    guides: [
      {
        href: "/guides/tennessee-lien-sales",
        title: "Lien Sales in Tennessee: Marinas, Storage, Repair Shops and Towing",
        short: "Tennessee lien sales",
        blurb:
          "Vessel liens, self-storage, mechanic's and towing liens: who can sell, the notice and publication rules, and how the buyer gets title afterward.",
      },
    ],
  },
  {
    id: "tax",
    label: "Delinquent property taxes",
    intro:
      "The taxes are behind and the county is heading toward a tax sale. The timeline, redemption, and why selling first usually keeps more of the equity.",
    guides: [
      {
        href: "/guides/tennessee-tax-sale-delinquent-property",
        title: "Selling Tax-Delinquent Property Before a Tennessee Tax Sale",
        short: "Before a Tennessee tax sale",
        blurb:
          "When Tennessee taxes go delinquent, how the county lawsuit and sale work, the redemption period, excess proceeds, and selling before the sale.",
      },
    ],
  },
  {
    id: "hard-to-sell",
    label: "Land and commercial property that won't sell",
    intro:
      "It has sat on the market, or too many people own a piece of it. When an auction beats another listing, and how co-owners get to a sale.",
    situationHref: "/situations/hard-to-sell",
    guides: [
      {
        href: "/guides/land-commercial-property-wont-sell",
        title: "Land or Commercial Property That Won't Sell in Tennessee",
        short: "Land and commercial that won't sell",
        blurb:
          "Auction versus another listing, heirs' property and multiple owners, partition, and how a licensed real estate auction actually runs.",
      },
    ],
  },
]

// The eight situation guides (everything outside the foreclosure group).
export const SITUATION_GUIDES: GuideLink[] = GUIDE_GROUPS.filter(
  (g) => g.id !== "foreclosure",
).flatMap((g) => g.guides)

export const FORECLOSURE_GUIDES: GuideLink[] =
  GUIDE_GROUPS.find((g) => g.id === "foreclosure")?.guides ?? []
