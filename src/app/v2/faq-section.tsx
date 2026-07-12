"use client"

import { useState } from "react"
import { FAQ_ITEMS } from "./faq-items"


export default function FaqSection() {
  const [open, setOpen] = useState<number | null>(0)

  return (
    <div className="rounded-lg border border-white/[0.08] overflow-hidden">
      {FAQ_ITEMS.map((item, i) => {
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
            {/* Always in the DOM (hidden via CSS when closed) so every
                answer is server-rendered HTML crawlers can read — the old
                conditional render meant only the open answer existed. */}
            <div
              className={`px-5 pb-5 -mt-1 text-[14px] leading-[1.75] text-white/60 max-w-3xl ${
                isOpen ? "" : "hidden"
              }`}
            >
              {item.a}
            </div>
          </div>
        )
      })}
    </div>
  )
}
