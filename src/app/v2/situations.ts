// Content for the any-asset site: the situations a seller arrives in, the
// asset classes we route, and the homepage FAQ. Plain module (not "use
// client") so server pages can read it for metadata and FAQPage JSON-LD,
// which Google requires to match the visible copy verbatim.

import { FAQ_ITEMS } from "./faq-items"

export type Situation = {
  slug: string
  label: string
  short: string
  title: string
  description: string
  h1: string
  lede: string
  img: string
  who: string[]
  found: string[]
  assets: string[]
  steps: Array<{ h: string; p: string }>
  straight: Array<{ h: string; p: string }>
  faq: Array<{ q: string; a: string }>
  cta: { label: string; href: string }
  ledger?: boolean
}

export const SITUATIONS: Situation[] = [
  {
    slug: "estate",
    label: "A death in the family",
    short: "The house, the truck, the guns, the collections. Settled without giving them away.",
    title: "Selling Estate Property at Auction in Tennessee | FALCO",
    description:
      "Executor or heir in Tennessee? FALCO routes every estate asset, from the house to the vehicles, firearms and collections, to the licensed auctioneer who sells it best. No FALCO fee to the estate.",
    h1: "Settle the estate without giving it away.",
    lede: "When someone passes, the house, the truck, the guns and the collections all need a buyer, usually while the family is grieving and the bills keep coming. We sort out what is worth auctioning, send each piece to the Tennessee specialist who sells that kind of thing best, and keep the executor in the loop the whole way.",
    img: "/media/house-single.jpg",
    who: [
      "Executors and administrators",
      "Heirs deciding what to keep and what to sell",
      "Estate attorneys who want one contact for every asset",
    ],
    found: [
      "Probate filings and published notices to creditors",
      "Court-ordered sales",
      "A call from you or your attorney",
    ],
    assets: [
      "Homes and land",
      "Vehicles, trailers and equipment",
      "Firearms",
      "Coins, silver and collections",
      "Boats and aircraft",
    ],
    steps: [
      { h: "Walk us through it", p: "A free call. Tell us what is there and what the estate owes. We tell you what is worth auctioning and what is not." },
      { h: "We inventory and route", p: "Each asset worth selling is matched to a licensed Tennessee auctioneer who specializes in it. You see the plan in writing first." },
      { h: "Open bidding", p: "Every item sells in front of buyers who compete for it. Proceeds go to the estate, with a record of every sale." },
    ],
    straight: [
      { h: "Authority comes first", p: "If the will or the court gives the executor power to sell, we can start right away. If not, your estate attorney handles that step first and we work on their timeline." },
      { h: "Firearms stay licensed", p: "Guns only go to auctioneers who hold a federal firearms license and handle every transfer. FALCO never takes possession of anything." },
      { h: "No household contents", p: "Furniture and everyday items are not worth a specialist auction. We will point you to an estate-sale company instead." },
    ],
    faq: [
      { q: "Do all the heirs have to agree?", a: "The executor or administrator is the one with authority to sell. Families usually do better when everyone sees the same numbers, so we put them in writing for all of you." },
      { q: "The estate has property in more than one county. Is that a problem?", a: "No. We work across Tennessee and route each asset to a firm that covers where it sits." },
      { q: "What does it cost the estate?", a: "FALCO charges the estate nothing. Any auction fee comes out of the sale proceeds, never out of pocket, and it is in writing before anyone signs." },
    ],
    cta: { label: "Tell us about the estate", href: "/start?s=estate" },
  },
  {
    slug: "business-closing",
    label: "A business is closing",
    short: "Equipment, fleet, inventory and the building. Sold to buyers who compete, not hauled off.",
    title: "Business Liquidation Auctions in Tennessee | FALCO",
    description:
      "Closing a Tennessee business? FALCO routes equipment, vehicles, inventory and real estate to the licensed auctioneers who know each market. No FALCO fee to the seller.",
    h1: "Closing the doors shouldn't mean a fire sale.",
    lede: "Equipment, vehicles, inventory and the building itself are worth the most when buyers compete for them. We get every asset to the auctioneer who knows that market, so the business closes on the best numbers it can.",
    img: "/media/record.jpg",
    who: [
      "Owners and partners winding down",
      "Accountants and attorneys handling the close",
      "Lenders holding the collateral",
    ],
    found: [
      "WARN notices of closures and layoffs",
      "Dissolution and wind-down filings",
      "A call from you or your advisor",
    ],
    assets: [
      "Commercial buildings and land",
      "Shop and heavy equipment",
      "Trucks, trailers and fleets",
      "Inventory and raw materials",
    ],
    steps: [
      { h: "Tell us what's on the floor", p: "A walk-through by phone or on site. We separate what will draw bidders from what is not worth the effort." },
      { h: "Route by category", p: "Equipment goes to an equipment auctioneer, the fleet to a vehicle auction, the building to a licensed real estate auction firm." },
      { h: "Sell on a schedule", p: "Set sale dates you can plan the close around, with results reported asset by asset." },
    ],
    straight: [
      { h: "Lenders get a seat early", p: "Secured lenders usually have a say in how collateral is sold. We bring them in at the start, not at the end." },
      { h: "Small stuff gets bundled", p: "Office furniture and fixtures ride along with bigger lots, or we tell you plainly they are not worth selling." },
      { h: "We never buy", p: "We do not take a position in anything we route, so we have no reason to want a low price." },
    ],
    faq: [
      { q: "Can the building and the equipment sell separately?", a: "Yes, and they usually should. Each goes to the buyers who want it, on its own sale or in one coordinated event." },
      { q: "We still owe on some of the equipment. Can it be sold?", a: "Usually, with the lender's sign-off. The payoff comes out of the sale and the lien is released at closing." },
      { q: "What does it cost the business?", a: "FALCO charges the seller nothing. Auction fees come out of the proceeds and are in writing before you sign." },
    ],
    cta: { label: "Tell us about the business", href: "/start?s=business-closing" },
  },
  {
    slug: "foreclosure",
    label: "A sale date on the house",
    short: "Sell through a marketed auction before the trustee sale takes the equity.",
    title: "Facing Foreclosure in Tennessee? Keep Your Equity | FALCO",
    description:
      "Sell your Tennessee home through a licensed marketed auction before the trustee sale takes it. No cost to you, the buyer pays the fee. You keep the equity.",
    h1: "Built to keep your equity.",
    lede: "We find Tennessee homes headed for the courthouse and route them to a marketed auction, before the trustee sale takes what you've spent years building.",
    img: "/media/homeowner.jpg",
    who: [
      "Homeowners with a trustee sale date",
      "Families behind on a parent's mortgage",
      "Owners who want the numbers before deciding",
    ],
    found: [
      "Trustee sale notices published across Tennessee",
      "Lis pendens and notice of default filings",
      "A call from you",
    ],
    assets: ["Homes", "Land", "Small rental properties"],
    steps: [
      { h: "We read the filings", p: "Trustee notices are public record. We read them daily, so we reach you while there's still time." },
      { h: "You get all three numbers", p: "A free 15-minute call: what the trustee sale, a cash offer and an auction each leave you. In writing." },
      { h: "We sell before the date", p: "A state-licensed Tennessee firm runs the sale, timed to close ahead of your trustee date." },
    ],
    straight: [
      { h: "We don't buy your house", p: "If we did, every dollar we made on the spread would be a dollar out of your equity." },
      { h: "No cost to you", p: "The buyer pays the auction fee on top of the winning bid. If it doesn't sell, you owe nobody anything." },
      { h: "We'll tell you if it won't work", p: "If nothing clears the loan, we say so and point you to a short sale, a modification or counsel instead." },
    ],
    faq: FAQ_ITEMS.slice(0, 5),
    cta: { label: "Get your numbers", href: "/homeowners" },
    ledger: true,
  },
  {
    slug: "bankruptcy",
    label: "Bankruptcy or receivership",
    short: "Fast, transparent sales with a record that holds up in front of the court.",
    title: "Auction Services for Bankruptcy Trustees and Receivers in Tennessee | FALCO",
    description:
      "Tennessee bankruptcy trustees and receivers: FALCO matches each asset class to a licensed auctioneer and delivers a clean sale record for the court file.",
    h1: "Turn the estate into cash the court can see.",
    lede: "Trustees and receivers need assets sold quickly, in the open, and for a price that holds up to scrutiny. Public auction does all three. We line up the right licensed auctioneer for each asset class and hand you a clean record of how everything sold.",
    img: "/media/partner.jpg",
    who: [
      "Chapter 7 trustees",
      "Court-appointed receivers",
      "Debtor's counsel planning an orderly sale",
    ],
    found: [
      "Chapter 7 and Chapter 11 filings in Tennessee's federal courts",
      "Receivership orders",
      "A call from the trustee's office",
    ],
    assets: [
      "Real estate",
      "Vehicles and equipment",
      "Business inventory",
      "Boats and aircraft",
      "Collections",
    ],
    steps: [
      { h: "Send us the schedule", p: "We read the asset schedule and tell you which items will draw bidders and which will not." },
      { h: "Match the auctioneer", p: "Each class goes to a licensed firm that already works through the court's employment and approval process." },
      { h: "Sale record for the file", p: "Bidder counts, results and proceeds by asset, ready to attach to your report." },
    ],
    straight: [
      { h: "The court stays in charge", p: "The trustee employs the auctioneer with court approval. Nothing sells until the process says it can." },
      { h: "Every bid on the record", p: "Open, marketed bidding is the easiest price to defend. That is the point." },
      { h: "No side arrangements", p: "We don't pay referral fees and we don't ask for them." },
    ],
    faq: [
      { q: "Do your auction partners know bankruptcy sales?", a: "We route trustee work to firms that already handle court-approved employment and sales, so you are not training anyone." },
      { q: "Can you handle mixed estates?", a: "Yes. Real estate, rolling stock and personal property can each go to a specialist and still report back through one contact." },
    ],
    cta: { label: "Talk to us about a case", href: "/start?s=bankruptcy&r=trustee" },
  },
  {
    slug: "lien-sale",
    label: "A lien that has to be enforced",
    short: "Abandoned boats, vehicles and units. Sold by the book so the title holds up.",
    title: "Lien Sale Auctions for Marinas, Storage and Repair Shops in Tennessee | FALCO",
    description:
      "Marinas, storage operators, mechanics and towing companies in Tennessee: FALCO routes abandoned boats, vehicles and equipment to auctioneers who run lien sales by the book.",
    h1: "Abandoned boats, cars and units. Sold by the book.",
    lede: "Marinas, storage operators, mechanics and towing companies end up holding property nobody comes back for. Tennessee lets you sell it to cover what you are owed, but only when notice and sale are done right. We route it to an auctioneer who treats the paperwork as carefully as the bidding.",
    img: "/media/close.jpg",
    who: [
      "Marinas with unpaid slip and storage fees",
      "Self-storage operators",
      "Repair shops, towing and recovery",
    ],
    found: [
      "Published lien sale notices",
      "A call from you",
    ],
    assets: [
      "Boats and pontoons",
      "Cars, trucks and motorcycles",
      "Trailers and equipment",
      "Storage units holding real value",
    ],
    steps: [
      { h: "Tell us what you're holding", p: "What it is, what is owed, and how long it has been sitting." },
      { h: "Notice done right", p: "The auctioneer runs the statutory notice and publication on the timeline the law sets." },
      { h: "Sell and settle", p: "The sale covers what you are owed. Anything left over is handled the way Tennessee law requires." },
    ],
    straight: [
      { h: "The timeline is the law's", p: "Notice periods and newspaper publication are set by statute. We don't cut corners on timing." },
      { h: "Low-value units aren't worth it", p: "A unit of household goods doesn't need a specialist. We'll tell you so." },
      { h: "Title that holds up", p: "A clean lien sale is what lets the buyer register the boat or the vehicle. That is what brings real bids." },
    ],
    faq: [
      { q: "Can you sell a boat with no title?", a: "Often, through the lien sale process. The auctioneer will tell you up front what the state requires for that vessel." },
      { q: "What does it cost us?", a: "FALCO charges the lienholder nothing. Auction fees come out of the sale and are in writing before you sign." },
    ],
    cta: { label: "Tell us what you're holding", href: "/start?s=lien-sale&r=lienholder" },
  },
  {
    slug: "hard-to-sell",
    label: "Land or a building that won't sell",
    short: "Vacant land, commercial buildings and tax-delinquent parcels, in front of a room that wants them.",
    title: "Auction Land and Commercial Property in Tennessee | FALCO",
    description:
      "Vacant land, farms, commercial buildings or tax-delinquent property in Tennessee that won't sell? FALCO routes it to a licensed auction firm that sets a date and brings the buyers.",
    h1: "When it won't sell on the market, put it in front of a room.",
    lede: "Vacant land, commercial buildings, tax-delinquent parcels and property with too many owners can sit for years. A marketed auction sets a date, brings the buyers who want exactly that kind of property, and lets them set the price.",
    img: "/media/house-white.jpg",
    who: [
      "Owners carrying land or buildings they don't use",
      "Heirs who inherited a share of something",
      "Owners behind on property taxes",
    ],
    found: [
      "County tax delinquency lists",
      "Codes and condemnation filings",
      "County parcel and assessor records",
    ],
    assets: [
      "Vacant and farm land",
      "Commercial and industrial buildings",
      "Multi-parcel holdings",
    ],
    steps: [
      { h: "Tell us about the property", p: "Where it is, who owns it, what is owed on it. We pull the county records before we call back." },
      { h: "Licensed firm, real campaign", p: "A licensed Tennessee real estate auction firm markets it to the buyers who want that kind of property." },
      { h: "A date, not a someday", p: "The sale happens on a set day. Taxes and liens are paid at closing." },
    ],
    straight: [
      { h: "We are not a broker", p: "Real estate is listed and sold by licensed Tennessee real estate and auction firms. FALCO finds it and routes it." },
      { h: "Title before the sale", p: "If there is a title problem or a missing owner, it gets worked out before the sale date, not after." },
      { h: "We never buy", p: "We don't take a position in anything we route." },
    ],
    faq: [
      { q: "I'm behind on property taxes. Is it too late?", a: "Not until the tax sale. A marketed sale before then pays the taxes at closing and keeps the rest for you." },
      { q: "Several of us inherited it. Can it still sell?", a: "Yes, with everyone's signature or a court order. We'll explain which applies before anyone spends money." },
    ],
    cta: { label: "Tell us about the property", href: "/start?s=hard-to-sell" },
  },
]

export const SITUATION_BY_SLUG: Record<string, Situation> = Object.fromEntries(
  SITUATIONS.map((s) => [s.slug, s])
)

export const ASSET_CLASSES: Array<{ h: string; p: string }> = [
  { h: "Homes", p: "Single-family, rentals, inherited houses." },
  { h: "Land and farms", p: "Vacant lots, acreage, timber and farm ground." },
  { h: "Commercial buildings", p: "Retail, office, shop and industrial." },
  { h: "Vehicles and trailers", p: "Cars, trucks, fleets, motorcycles." },
  { h: "Heavy and farm equipment", p: "Tractors, machine tools, construction iron." },
  { h: "Boats and aircraft", p: "Bass boats to pontoons, pistons to jets." },
  { h: "Firearms", p: "Only through auctioneers who hold a federal firearms license." },
  { h: "Coins, silver and collections", p: "Numismatics, sports, militaria, art." },
  { h: "Business inventory", p: "Stock, raw material, restaurant and retail fixtures." },
]

export const NOT_US: string[] = [
  "Household furniture and everyday contents",
  "Items worth less than the cost of a specialist sale",
  "Property outside Tennessee, for now",
]

export const HUB_FAQ: Array<{ q: string; a: string }> = [
  {
    q: "What does FALCO actually do?",
    a: "We find property that has to be sold because of a death, a debt, a closing or a court case, figure out what is worth auctioning, and route each asset to the licensed Tennessee auctioneer who sells that kind of thing best. Then buyers compete for it in an open, marketed sale.",
  },
  {
    q: "Do you buy anything?",
    a: "No. We never take a position in what we route. If we bought it, every dollar we made would come out of your sale. Because we don't, the only way we do well is when your sale does.",
  },
  {
    q: "What does it cost me?",
    a: "FALCO charges sellers nothing. Any auction fee comes out of the sale proceeds, never out of pocket, and the terms are in writing before you sign anything. On home sales the buyer pays the fee on top of the winning bid.",
  },
  {
    q: "Who actually runs the sale?",
    a: "A licensed Tennessee auction firm that specializes in that asset. Real estate goes to licensed real estate auction firms. Firearms only go to auctioneers who hold a federal firearms license. FALCO is founded by a licensed Tennessee auctioneer and does not list or broker real estate itself.",
  },
  {
    q: "How did you find me?",
    a: "From public records: probate filings, trustee sale notices, court-ordered sales, closure notices and county tax lists. Everything we read is published by a court or a government office. If you would rather not hear from us, tell us once and we stop.",
  },
  {
    q: "What don't you handle?",
    a: "Household contents and everyday items, anything worth less than the cost of a specialist sale, and property outside Tennessee for now. When something isn't a fit we'll say so and point you somewhere better.",
  },
  {
    q: "I'm an attorney or a trustee. How do we work together?",
    a: "Send us the file. You get one contact for every asset, an inventory with a value range for each, routing to licensed specialists, and a sale record for the court file. We don't pay referral fees and we don't ask for them.",
  },
]
