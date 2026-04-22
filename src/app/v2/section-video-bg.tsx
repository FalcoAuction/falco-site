"use client"

import { useEffect, useRef, useState } from "react"

/**
 * Lazy-loaded looping B&W drone-footage background for a section.
 * Loads only when section is near viewport (saves bandwidth for below-fold sections).
 * No poster — section is hidden until scrolled to anyway, brief darkness while loading is fine.
 */
export function SectionVideoBg({
  src,
  opacity = 0.32,
}: {
  src: string
  opacity?: number
}) {
  const ref = useRef<HTMLVideoElement>(null)
  const [shouldLoad, setShouldLoad] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setShouldLoad(true)
          observer.disconnect()
        }
      },
      { rootMargin: "400px 0px" } // start loading 400px before it enters viewport
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <video
      ref={ref}
      className="absolute inset-0 -z-30 h-full w-full object-cover pointer-events-none"
      autoPlay
      muted
      loop
      playsInline
      preload="none"
      aria-hidden="true"
      style={{ opacity }}
    >
      {shouldLoad && <source src={src} type="video/mp4" />}
    </video>
  )
}
