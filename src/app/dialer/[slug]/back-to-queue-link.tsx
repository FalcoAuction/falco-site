"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { QUEUE_SEARCH_KEY } from "../scroll-restorer"

/**
 * Back-link from a lead detail page to the queue. Reads the queue's
 * last-known filter query string from sessionStorage (saved by
 * ScrollRestorer when the queue mounted) and constructs an href that
 * preserves filter / county / distress params. Combined with the
 * scroll-restorer this returns the caller to the exact spot they
 * were in.
 *
 * Falls back to /dialer when sessionStorage is empty (direct visit
 * to a lead URL without going through the queue first).
 *
 * Renders an SSR-safe placeholder href on first paint to avoid a
 * hydration mismatch, then upgrades to the saved-search href once
 * the effect runs.
 */
export function BackToQueueLink({
  className,
  children,
}: {
  className?: string
  children: React.ReactNode
}) {
  const [href, setHref] = useState<string>("/dialer")

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(QUEUE_SEARCH_KEY) || ""
      setHref(`/dialer${saved}`)
    } catch {
      // sessionStorage may throw in some privacy modes — keep the
      // default href.
    }
  }, [])

  return (
    <Link href={href} className={className}>
      {children}
    </Link>
  )
}
