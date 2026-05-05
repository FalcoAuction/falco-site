"use client"

import { useEffect } from "react"

const STORAGE_KEY = "dialer:queue:scroll"

/**
 * Preserves the dialer-queue scroll position across navigation.
 *
 * Saves window.scrollY to sessionStorage on every scroll. On mount,
 * restores scrollY if a saved value exists. Clearing happens
 * implicitly when the user navigates away from the dialer.
 *
 * Usage: drop into the queue page server component as the first child.
 */
export function ScrollRestorer() {
  useEffect(() => {
    // Restore — but only if user came back from a child route (e.g.,
    // /dialer/[slug]) rather than a fresh load. We always try to
    // restore; if scrollY > 0 was set, this puts the user back where
    // they were.
    const saved = sessionStorage.getItem(STORAGE_KEY)
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
        sessionStorage.setItem(STORAGE_KEY, String(window.scrollY))
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
