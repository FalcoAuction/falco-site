"use client"

import { useEffect } from "react"

const SCROLL_KEY = "dialer:queue:scroll"
const LAST_SLUG_KEY = "dialer:queue:last-slug"
export const QUEUE_SEARCH_KEY = "dialer:queue:search"

/**
 * Preserves the dialer-queue scroll position across navigation.
 *
 * Two-layer restoration so the list always lands at the right spot:
 *   1. SLUG ANCHOR: when the user clicks a lead row, the slug is
 *      saved. On return, we scroll the element with
 *      `data-lead-slug="<slug>"` into view (block: center). This
 *      survives list re-renders, filter changes that keep the lead in
 *      view, and the dialer's progressive hydration — the element
 *      simply has to exist in the DOM.
 *   2. PIXEL FALLBACK: if no slug match (e.g. user changed the filter,
 *      or navigated to the queue directly), fall back to the last
 *      scrollY captured by the scroll listener.
 *
 * Both restoration paths poll with rAF up to ~600ms to handle the case
 * where the lead list renders progressively and isn't tall enough at
 * mount time to support the scroll position.
 *
 * Also saves the queue's filter query string so child routes (lead
 * detail) can construct accurate "Back to queue" hrefs.
 */
export function ScrollRestorer() {
  useEffect(() => {
    // Save the queue's current filter query string. Children read
    // sessionStorage[QUEUE_SEARCH_KEY] when constructing back-links
    // so the caller lands on the same filter set they left.
    try {
      sessionStorage.setItem(QUEUE_SEARCH_KEY, window.location.search)
    } catch {
      // sessionStorage may throw in privacy modes — non-fatal.
    }

    // Delegated click listener — captures the slug of whichever lead
    // the user clicks before navigation fires. Runs in capture phase
    // so it fires before Next.js intercepts the Link click.
    const onClick = (e: Event) => {
      const target = e.target as HTMLElement | null
      if (!target) return
      const a = target.closest("a[href^='/dialer/']") as HTMLAnchorElement | null
      if (!a) return
      const m = /^\/dialer\/([^/?#]+)/.exec(a.getAttribute("href") || "")
      if (m && m[1]) {
        try {
          sessionStorage.setItem(LAST_SLUG_KEY, m[1])
        } catch {
          // ignore
        }
      }
    }
    document.addEventListener("click", onClick, true)

    // Restoration — try slug anchor first, fall back to pixel.
    let lastSlug: string | null = null
    let savedY: number | null = null
    try {
      lastSlug = sessionStorage.getItem(LAST_SLUG_KEY)
      const s = sessionStorage.getItem(SCROLL_KEY)
      if (s) {
        const y = parseInt(s, 10)
        if (!Number.isNaN(y) && y > 0) savedY = y
      }
    } catch {
      // ignore
    }

    let raf = 0
    let attempts = 0
    const maxAttempts = 40 // ~660ms at 60fps
    const restore = () => {
      attempts += 1

      if (lastSlug) {
        const el = document.querySelector(
          `[data-lead-slug="${CSS.escape(lastSlug)}"]`
        ) as HTMLElement | null
        if (el) {
          el.scrollIntoView({ block: "center", behavior: "auto" })
          // Clear so a fresh queue visit (without clicking a lead) doesn't
          // keep snapping to the same row.
          try { sessionStorage.removeItem(LAST_SLUG_KEY) } catch {}
          return
        }
      }

      // No slug match — try pixel fallback when the page is tall enough.
      if (savedY !== null) {
        const reachable =
          document.documentElement.scrollHeight >=
          savedY + window.innerHeight * 0.5
        if (reachable) {
          window.scrollTo(0, savedY)
          return
        }
      }

      // Not ready yet — try again next frame, up to ~660ms.
      if (attempts < maxAttempts) {
        raf = requestAnimationFrame(restore)
      } else if (savedY !== null) {
        // Give up and best-effort scroll to the saved Y.
        window.scrollTo(0, savedY)
      }
    }
    raf = requestAnimationFrame(restore)

    // Save scrollY on scroll so a fresh visit can use the pixel fallback.
    let scrollRaf = 0
    const onScroll = () => {
      if (scrollRaf) return
      scrollRaf = requestAnimationFrame(() => {
        scrollRaf = 0
        try {
          sessionStorage.setItem(SCROLL_KEY, String(window.scrollY))
        } catch {
          // ignore
        }
      })
    }
    window.addEventListener("scroll", onScroll, { passive: true })

    return () => {
      document.removeEventListener("click", onClick, true)
      window.removeEventListener("scroll", onScroll)
      if (raf) cancelAnimationFrame(raf)
      if (scrollRaf) cancelAnimationFrame(scrollRaf)
    }
  }, [])
  return null
}
