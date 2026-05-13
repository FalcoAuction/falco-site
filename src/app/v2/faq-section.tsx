"use client"

import { useState } from "react"

const ITEMS: Array<{ q: string; a: string }> = [
  {
    q: "Wait — is this the foreclosure auction at the courthouse?",
    a: "No. The trustee sale at the courthouse is exactly the thing we're trying to prevent. That's a 60-second formality on the courthouse steps where the bank takes the property for the loan balance and your equity disappears. What we run is a marketed public auction through a state-licensed Tennessee auction firm: photos, advertising, a 30-to-60-day campaign, a defined sale day, and buyers competing openly on price. Two completely different things — one takes your equity, the other captures it for you.",
  },
  {
    q: "Do I have to sell?",
    a: "No. We'll show you the math: what a marketed sale would yield, what a typical cash buyer would pay, and what happens if the trustee sale goes through. If the numbers don't make sense for your situation, we'll say so plainly and you decide.",
  },
  {
    q: "How is this different from a cash buyer / wholesaler?",
    a: "A cash buyer — wholesaler, iBuyer, 'we buy houses' operator, whatever flavor — purchases your house at a discount, fast, then resells at market. The speed-discount is the trade. We don't buy your house at all. We market it to the open buyer pool through a state-licensed Tennessee auction firm with a 30-to-60-day campaign and let the highest bidder set the price. Same urgency. Same finality of sale. The equity goes home with you instead of with the buyer.",
  },
  {
    q: "What if the auction doesn't sell for enough?",
    a: "Marketed auctions in Tennessee typically land between 85% and 95% of full retail when properly run. If a property clearly won't clear a number that makes sense for you, we won't list it. We'll tell you up front. Sometimes a cash offer or even letting the trustee sale happen is the right answer for the math. We'd rather tell you that than waste both our time.",
  },
  {
    q: "What does it cost me?",
    a: "Zero dollars out of pocket. No listing fee, no upfront cost, no commission from your side. The auction partner is compensated by a standard 10% buyer's premium paid on top of the winning bid by the buyer. If the property doesn't sell, you don't owe anyone anything.",
  },
  {
    q: "How long does this take?",
    a: "Typical timeline is 45 to 75 days from when you decide to list to when the sale closes. We can run shorter windows (21 to 30 days for online-only marketed auctions) if your trustee sale date is very close. Our partner will reach out to your lender about postponing the foreclosure so the auction has time to run. We can't guarantee the lender agrees, but most do when there's an active marketed sale on the property.",
  },
  {
    q: "Who are the buyers?",
    a: "Cash buyers and active investors who have pre-registered for Tennessee inventory access. We notify them first when a new property lists. Standard 10% buyer's premium, clean title, pre-verified. The same model professional auction houses have used for decades.",
  },
  {
    q: "How do I get started as a seller?",
    a: "Use the form on the homeowner page or email us at falco@falco.llc with your property address, your estimated mortgage balance, and your trustee sale date if there is one. We'll come back to you within one business day with the math for your specific situation. No pressure, no pitch, no 'come to our webinar.' Just real numbers.",
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
