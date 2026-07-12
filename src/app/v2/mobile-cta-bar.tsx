import Link from "next/link"

// Sticky bottom action bar, mobile only. A distressed homeowner on a
// phone should never have to scroll to find "call" or "get started."
// Hidden on md+ (desktop keeps the in-page CTAs). Uses a real tel:
// link so a tap dials; the button routes to the homeowner intake.
const FALCO_PHONE = "601-213-8868"

export function MobileCtaBar() {
  return (
    <div className="md:hidden fixed bottom-0 inset-x-0 z-40 border-t border-white/10 bg-[#060606]/95 backdrop-blur-xl">
      <div className="flex items-stretch gap-2 px-3 py-2.5">
        <a
          href={`tel:${FALCO_PHONE.replace(/\D/g, "")}`}
          className="flex-1 inline-flex items-center justify-center gap-2 rounded-md border border-white/15 text-white/85 text-[14px] font-medium py-2.5 active:bg-white/10 transition-colors"
        >
          <span aria-hidden="true">📞</span> Call
        </a>
        <Link
          href="/homeowners"
          className="flex-[1.6] inline-flex items-center justify-center rounded-md bg-emerald-400 text-black font-semibold text-[14px] py-2.5 active:bg-emerald-300 transition-colors"
        >
          Free 15-min call →
        </Link>
      </div>
    </div>
  )
}
