"use client"

import { useEffect } from "react"

const SCROLL_KEY = "dialer:queue:scroll"
export const QUEUE_SEARCH_KEY = "dialer:queue:search"

/**
 * Preserves the dialer-queue scroll position AND the current filter
 * query string across navigation. The scroll part runs on every
 * scroll event; the search-params snapshot is taken on mount of the
 * queue page so child routes (e.g. /dialer/[slug]) can read the
 * caller's last filter set when rendering "Back to queue."
 *
 * Drop into the queue page server component as the first child.
 */
export function ScrollRestorer() {
  useEffect(() => {
    // Save the queue's current filter query string. Children read
    // sessionStorage[QUEUE_SEARCH_KEY] when constructing back-links
    // so the caller lands on the same filter set they left.
    sessionStorage.setItem(QUEUE_SEARCH_KEY, window.location.search)

    // Restore scroll position from previous queue visit.
    const saved = sessionStorage.getItem(SCROLL_KEY)
    if (saved) {
      const y = parseInt(saved, 10)
      if (!Number.isNaN(y) && y > 0) {
        // Defer one tick so the DOM is laid out before we scroll.
        requestAnimationFrame(() => window.scrollTo(0, y))
      }
    }

    let raf = 0
    const onScroll = () => {
      if (raf) return
      raf = requestAnimationFrame(() => {
        raf = 0
        sessionStorage.setItem(SCROLL_KEY, String(window.scrollY))
      })
    }
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => {
      window.removeEventListener("scroll", onScroll)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [])
  return null
}
