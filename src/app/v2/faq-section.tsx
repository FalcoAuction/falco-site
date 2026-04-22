"use client"

import { useState } from "react"

const ITEMS: Array<{ q: string; a: string }> = [
  {
    q: "Is this legit?",
    a: "Yes. We're a Tennessee-based pipeline that sources distressed property signals from county courthouses, then lists qualifying homes for sale through a licensed Tennessee auction partner. We don't buy your home, we don't ask you for money up front, we don't take commission out of what you keep. Our revenue comes from the standard buyer's premium — paid by the buyer, not by you.",
  },
  {
    q: "Do I have to sell?",
    a: "No. We'll tell you what the math looks like — what you'd walk away with through a marketed sale versus a wholesaler offer versus letting the trustee sale happen. If the numbers don't make sense for your situation, we say that plainly and you make your own call.",
  },
  {
    q: "How is this different from a wholesaler?",
    a: "Wholesalers buy your house below market and resell at market. Their profit is the gap between what they pay you and what the home is actually worth. We don't buy your house at all. Our auction partner sells it to the highest bidder at market value. You keep the equity a wholesaler would have taken.",
  },
  {
    q: "What if the auction doesn't sell for enough?",
    a: "Marketed auctions in Tennessee typically land between 85–95% of market value when properly run. If a property clearly won't clear a threshold that makes sense for you, we won't list it — we'll tell you up front. Sometimes wholesale or even trustee sale is the right answer for the math. We'd rather tell you that than waste both our time.",
  },
  {
    q: "What does it cost me?",
    a: "Zero dollars out of pocket. No listing fee, no upfront cost, no commission from your side. The auction partner is compensated by a standard buyer's premium paid on top of the winning bid by the buyer. If the property doesn't sell, you don't owe anyone anything.",
  },
  {
    q: "How long does this take?",
    a: "Typical timeline is 45 to 75 days from when you decide to list to when the sale closes. We can run shorter windows (21–30 days for online-only marketed auctions) if your trustee sale date is very close. Our partner coordinates postponement of the foreclosure with your lender so the auction has time to run.",
  },
  {
    q: "Who are the buyers?",
    a: "Cash buyers and active investors who have pre-registered for Tennessee inventory access. We notify them first when a new property lists. Standard 8% buyer's premium, clean title, pre-verified — same model professional auction houses have used for decades.",
  },
  {
    q: "How do I get started as a seller?",
    a: "Use the form on the homeowner page or email us at falco@falco.llc with your property address, your estimated mortgage balance, and your trustee sale date if there is one. We'll come back to you within 24 hours with the math for your specific situation. No pressure, no pitch, no 'come to our webinar.' Just real numbers.",
  },
]

export default function FaqSection() {
  const [open, setOpen] = useState<number | null>(0)

  return (
    <div className="rounded-lg border border-white/[0.08] overflow-hidden">
      {ITEMS.map((item, i) => {
        const isOpen = open === i
        return (
          <div
            key={i}
            className={`border-t border-white/[0.06] ${i === 0 ? "border-t-0" : ""}`}
          >
            <button
              onClick={() => setOpen(isOpen ? null : i)}
              className="w-full flex items-start justify-between gap-6 px-5 py-5 text-left hover:bg-white/[0.02] transition-colors"
            >
              <span className="text-[15px] font-medium text-white/90">{item.q}</span>
              <span
                className={`text-emerald-400/80 text-xl leading-none shrink-0 mt-0.5 transition-transform ${
                  isOpen ? "rotate-45" : ""
                }`}
              >
                +
              </span>
            </button>
            {isOpen && (
              <div className="px-5 pb-5 -mt-1 text-[14px] leading-[1.75] text-white/60 max-w-3xl">
                {item.a}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
