"use client"

import Link from "next/link"
import { useEffect, useRef, useState } from "react"

/** The sheet renders at this width (560px column + 20px gutters). */
const SHEET_WIDTH = 600

/**
 * A shrunken, page-shaped preview of the homeowner math sheet for the
 * lead record's left column. The sheet is rendered at full width and
 * scaled to fit, cropped to a letter-page shape so it reads like the
 * first page of the PDF. A link laid over the top opens the full sheet;
 * it is a sibling, not a parent, because the sheet has its own links.
 */
export function SheetThumb({ href, children }: { href: string; children: React.ReactNode }) {
  const box = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(0.45)

  useEffect(() => {
    const el = box.current
    if (!el) return
    const fit = () => setScale(el.clientWidth / SHEET_WIDTH)
    fit()
    const ro = new ResizeObserver(fit)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  return (
    <div ref={box} className="crm-sheet-thumb">
      <div
        className="crm-sheet-thumb-page"
        style={{ width: SHEET_WIDTH, transform: `scale(${scale})` }}
        aria-hidden
        inert
      >
        {children}
      </div>
      <Link href={href} className="crm-sheet-thumb-link" aria-label="Open the math sheet" title="Open the math sheet">
        <span className="crm-sheet-thumb-open">Open sheet</span>
      </Link>
    </div>
  )
}
