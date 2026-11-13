import { ImageResponse } from "next/og"
import { readFileSync } from "node:fs"
import path from "node:path"
import { COUNTIES } from "../../foreclosure/county-list"
import { GUIDE_GROUPS } from "../../guides/guide-index"
import { SITUATION_BY_SLUG } from "../../v2/situations"

// Node runtime so the logo can be read off disk.
export const runtime = "nodejs"

type Card = { kicker: string; title: string; sub: string }

// Every preview the site can draw. Keys not listed here 404, so the route
// cannot be used to put arbitrary words on a FALCO-branded image.
const PAGES: Record<string, Card> = {
  home: {
    kicker: "FALCO",
    title: "Built to keep what's yours.",
    sub: "Any distressed asset in Tennessee, routed to the licensed auction firm that sells it best. No cost to you.",
  },
  manifesto: {
    kicker: "How it works",
    title: "When something has to sell fast, most people lose money they didn't have to.",
    sub: "The whole process in plain language. Any asset, any reason it has to sell.",
  },
  start: {
    kicker: "Start here",
    title: "Tell us what has to sell.",
    sub: "Two minutes. We come back within one business day with what it would likely clear.",
  },
  professionals: {
    kicker: "For attorneys, trustees and receivers",
    title: "One contact for every asset in the file.",
    sub: "Inventory, licensed routing by asset class, and a sale record for the court file.",
  },
  partners: {
    kicker: "For auction firms",
    title: "Sellers with real value, routed to your specialty.",
    sub: "Sellers who expect your call, matched by asset, county and track record.",
  },
  buyers: {
    kicker: "For buyers",
    title: "Hear about Tennessee auctions first.",
    sub: "Homes, land, vehicles, equipment and more, headed to open bidding.",
  },
  homeowners: {
    kicker: "For homeowners",
    title: "A free 15-minute call. Real math. No pitch.",
    sub: "What your home is worth, what a marketed auction would leave you, and whether it fits.",
  },
  inquiry: {
    kicker: "Contact",
    title: "Talk to FALCO.",
    sub: "Press, partnerships or anything else. We reply within one business day.",
  },
  "sms-consent": {
    kicker: "Text updates",
    title: "Opt in to texts from FALCO.",
    sub: "Case-specific messages only. No spam. Reply STOP any time.",
  },
  guides: {
    kicker: "Guides",
    title: "Selling in a hard moment, in plain English.",
    sub: "Estates, closings, liens, taxes and foreclosure, with the Tennessee statutes cited.",
  },
  foreclosure: {
    kicker: "Foreclosure in Tennessee",
    title: "How trustee sales work, county by county.",
    sub: "Where the sale is held, where notices run, and how to sell first and keep your equity.",
  },
  memphis: {
    kicker: "Foreclosure in Tennessee",
    title: "Foreclosure in Memphis.",
    sub: "Where the sale is held, where notices run, and how to sell first and keep your equity.",
  },
}

function card(key: string): Card | null {
  if (PAGES[key]) return PAGES[key]
  if (key.startsWith("situation-")) {
    const s = SITUATION_BY_SLUG[key.slice("situation-".length)]
    return s ? { kicker: s.label, title: s.h1, sub: s.short } : null
  }
  if (key.startsWith("county-")) {
    const c = COUNTIES.find((x) => x.slug === key.slice("county-".length))
    return c
      ? {
          kicker: "Foreclosure in Tennessee",
          title: `Foreclosure in ${c.county} County.`,
          sub: `Trustee sales in ${c.seat} and across ${c.county} County: where they happen, and how to sell first.`,
        }
      : null
  }
  if (key.startsWith("guide-")) {
    const href = `/guides/${key.slice("guide-".length)}`
    for (const g of GUIDE_GROUPS) {
      const hit = g.guides.find((x) => x.href === href)
      if (hit) return { kicker: `Guide · ${g.label}`, title: hit.title, sub: hit.blurb }
    }
    return null
  }
  return null
}

function loadBird(): string | null {
  try {
    const buf = readFileSync(path.join(process.cwd(), "public", "media", "falco-bird-ink.png"))
    return `data:image/png;base64,${buf.toString("base64")}`
  } catch {
    return null
  }
}
const BIRD = loadBird()

export async function GET(_req: Request, { params }: { params: Promise<{ key: string }> }) {
  const { key } = await params
  const c = card(key)
  if (!c) return new Response("Not found", { status: 404 })
  const long = c.title.length > 48
  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          width: "100%",
          height: "100%",
          background: "#f3f2f0",
          color: "#0c0c0b",
          padding: "60px 72px",
          fontFamily: "Inter, system-ui, sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          {BIRD ? <img src={BIRD} alt="" width={46} height={55} /> : null}
          <div style={{ display: "flex", fontSize: 26, fontWeight: 700, letterSpacing: -1 }}>FALCO</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", fontSize: 26, color: "#6d6c66", marginBottom: 18 }}>{c.kicker}</div>
          <div
            style={{
              display: "flex",
              fontSize: long ? 64 : 84,
              fontWeight: 600,
              letterSpacing: long ? -2.5 : -3.5,
              lineHeight: 1.04,
              maxWidth: 1040,
            }}
          >
            {c.title}
          </div>
          <div style={{ display: "flex", marginTop: 24, fontSize: 28, color: "#6d6c66", lineHeight: 1.35, maxWidth: 980 }}>
            {c.sub}
          </div>
        </div>
        <div style={{ display: "flex", fontSize: 22, color: "#6d6c66" }}>falco.llc</div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      headers: { "Cache-Control": "public, max-age=86400, s-maxage=604800" },
    }
  )
}
