"use client"

export default function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="rounded-md bg-emerald-400 hover:bg-emerald-300 text-black font-semibold text-[12px] px-3.5 py-1.5 transition-colors"
    >
      Print / Save PDF
    </button>
  )
}
