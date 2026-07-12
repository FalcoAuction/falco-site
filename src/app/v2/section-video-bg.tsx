"use client"

import { useEffect, useRef, useState } from "react"

/** Shared connection check — mobile width or 2g/3g/save-data should skip
 *  any of the heavy video backgrounds and fall back to the still poster. */
function shouldSkipVideo(): boolean {
  if (typeof window === "undefined") return false
  const isNarrow = window.matchMedia("(max-width: 767px)").matches
  type ConnectionLike = { saveData?: boolean; effectiveType?: string }
  type NavWithConnection = Navigator & { connection?: ConnectionLike }
  const conn = (navigator as NavWithConnection).connection
  const saveData = conn?.saveData === true
  const slowEffective = conn?.effectiveType
    ? ["slow-2g", "2g", "3g"].includes(conn.effectiveType)
    : false
  return isNarrow || saveData || slowEffective
}

/**
 * Hero video background. Loads eagerly on capable devices (preload=metadata
 * so we don't pre-buffer the whole 4.7MB blob — the browser starts streaming
 * once it begins playing). On mobile or slow connections we render the poster
 * JPG only, no video element at all.
 */
export function HeroVideoBg({
  src,
  poster,
  opacity = 0.62,
}: {
  src: string
  poster: string
  opacity?: number
}) {
  // Mount-after-check, not render-then-remove: the old version rendered
  // the <video> in SSR HTML (skipVideo started false), so mobile began
  // downloading the 4.6MB loop before the capability effect could flip
  // it — measured as an 18.7s mobile LCP. Now SSR and first paint are
  // the poster everywhere; the video mounts a tick later only on
  // capable devices. Poster matches the video's first frame, so the
  // swap is invisible on desktop.
  const [showVideo, setShowVideo] = useState(false)

  useEffect(() => {
    if (!shouldSkipVideo()) setShowVideo(true)
  }, [])

  if (!showVideo) {
    return (
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-30 pointer-events-none bg-cover bg-center"
        style={{ backgroundImage: `url(${poster})`, opacity }}
      />
    )
  }

  return (
    <video
      className="absolute inset-0 -z-30 h-full w-full object-cover"
      autoPlay
      muted
      loop
      playsInline
      preload="metadata"
      poster={poster}
      aria-hidden="true"
      style={{ opacity }}
    >
      <source src={src} type="video/mp4" />
    </video>
  )
}

/**
 * Lazy-loaded looping B&W drone-footage background for a section.
 *
 * Strategy:
 * - Desktop with good connection: poster paints immediately, video lazy-loads
 *   as the section nears the viewport and fades in over the poster.
 * - Mobile, save-data, or slow connection (2g/3g/slow-2g): video is skipped
 *   entirely. Just the poster image. Saves several MB on cell networks.
 */
export function SectionVideoBg({
  src,
  poster,
  opacity = 0.32,
}: {
  src: string
  poster: string
  opacity?: number
}) {
  const ref = useRef<HTMLVideoElement>(null)
  const [shouldLoad, setShouldLoad] = useState(false)
  const [skipVideo, setSkipVideo] = useState(false)

  // Detect mobile / slow connection / save-data once on mount.
  useEffect(() => {
    if (shouldSkipVideo()) setSkipVideo(true)
  }, [])

  // IntersectionObserver only matters when video isn't skipped.
  useEffect(() => {
    if (skipVideo) return
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setShouldLoad(true)
          observer.disconnect()
        }
      },
      { rootMargin: "400px 0px" }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [skipVideo])

  // On mobile/slow: just paint the poster. No video element at all.
  // Rendered as a lazy <img>, not a CSS background — CSS backgrounds
  // can't lazy-load, and these below-the-fold section posters were
  // pulling ~750KB eagerly on mobile, starving the hero LCP.
  if (skipVideo) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={poster}
        alt=""
        loading="lazy"
        decoding="async"
        aria-hidden="true"
        className="absolute inset-0 -z-30 h-full w-full object-cover pointer-events-none"
        style={{ opacity, filter: "grayscale(100%)" }}
      />
    )
  }

  return (
    <video
      ref={ref}
      className="absolute inset-0 -z-30 h-full w-full object-cover pointer-events-none"
      autoPlay
      muted
      loop
      playsInline
      preload="none"
      poster={poster}
      aria-hidden="true"
      style={{ opacity }}
    >
      {shouldLoad && <source src={src} type="video/mp4" />}
    </video>
  )
}
