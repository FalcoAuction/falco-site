import MathDeck from "./math-deck"

// The equity story as a stepped scroll narrative. Fully static — no
// server data. All beat copy is in the server-rendered DOM (the client
// rig only toggles visibility), so this indexes like a normal page.
export const metadata = {
  title: "Foreclosure Math: Trustee Sale vs Cash Offer vs Auction | FALCO",
  description:
    "One number at a time: what a Tennessee homeowner actually keeps at the trustee sale, from a cash buyer, and through a licensed marketed auction run before the sale date.",
  alternates: { canonical: "/math" },
}

export default function MathPage() {
  return <MathDeck />
}
