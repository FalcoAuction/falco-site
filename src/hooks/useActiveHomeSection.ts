"use client"

import { useEffect, useRef, useState } from "react"
import {
  clamp,
  getViewportProfile,
  HOME_SECTION_ORDER,
  type HomeSectionId,
  type ViewportProfile,
} from "@/lib/home/falcon-paths"

type SectionSnapshot = {
  id: HomeSectionId
  top: number
  height: number
  center: number
}

type ActiveHomeSectionState = {
  activeId: HomeSectionId
  currentId: HomeSectionId
  nextId: HomeSectionId | null
  progress: number
  direction: 1 | -1
  profile: ViewportProfile
  viewportWidth: number
  viewportHeight: number
  sections: SectionSnapshot[]
}

const DEFAULT_STATE: ActiveHomeSectionState = {
  activeId: "hero",
  currentId: "hero",
  nextId: "snapshot",
  progress: 0,
  direction: 1,
  profile: "desktop",
  viewportWidth: 0,
  viewportHeight: 0,
  sections: [],
}

export function useActiveHomeSection() {
  const [state, setState] = useState<ActiveHomeSectionState>(DEFAULT_STATE)
  const ratiosRef = useRef<Record<HomeSectionId, number>>({} as Record<HomeSectionId, number>)
  const frameRef = useRef<number | null>(null)
  const lastScrollYRef = useRef(0)

  useEffect(() => {
    const sections = HOME_SECTION_ORDER.map((id) => ({
      id,
      element: document.querySelector<HTMLElement>(`[data-falcon-section="${id}"]`),
    })).filter(
      (entry): entry is { id: HomeSectionId; element: HTMLElement } =>
        entry.element !== null,
    )

    if (!sections.length) {
      return
    }

    const measure = () => {
      const viewportWidth = window.innerWidth
      const viewportHeight = window.innerHeight
      const profile = getViewportProfile(viewportWidth)
      const scrollY = window.scrollY
      const direction = scrollY >= lastScrollYRef.current ? 1 : -1
      lastScrollYRef.current = scrollY

      const snapshots = sections.map(({ id, element }) => {
        const rect = element.getBoundingClientRect()
        const top = scrollY + rect.top
        return {
          id,
          top,
          height: rect.height,
          center: top + rect.height / 2,
        }
      })

      const viewportCenter = scrollY + viewportHeight * 0.48
      let currentIndex = 0
      let nextIndex = snapshots.length > 1 ? 1 : 0
      let progress = 0

      if (snapshots.length > 1 && viewportCenter >= snapshots[snapshots.length - 1].center) {
        currentIndex = snapshots.length - 1
        nextIndex = currentIndex
        progress = 0
      } else if (snapshots.length > 1) {
        for (let index = 0; index < snapshots.length - 1; index += 1) {
          const start = snapshots[index]
          const end = snapshots[index + 1]

          if (viewportCenter >= start.center && viewportCenter < end.center) {
            currentIndex = index
            nextIndex = index + 1
            progress = clamp(
              (viewportCenter - start.center) / Math.max(end.center - start.center, 1),
              0,
              1,
            )
            break
          }
        }
      }

      const visible = snapshots
        .map((snapshot) => ({
          id: snapshot.id,
          ratio: ratiosRef.current[snapshot.id] ?? 0,
        }))
        .sort((a, b) => b.ratio - a.ratio)

      const activeId = visible[0]?.ratio ? visible[0].id : snapshots[currentIndex]?.id ?? "hero"
      const currentId = snapshots[currentIndex]?.id ?? activeId
      const nextId =
        snapshots[nextIndex]?.id && nextIndex !== currentIndex
          ? snapshots[nextIndex].id
          : null

      setState((previous) => {
        const unchanged =
          previous.activeId === activeId &&
          previous.currentId === currentId &&
          previous.nextId === nextId &&
          Math.abs(previous.progress - progress) < 0.003 &&
          previous.direction === direction &&
          previous.profile === profile &&
          previous.viewportWidth === viewportWidth &&
          previous.viewportHeight === viewportHeight

        if (unchanged) {
          return previous
        }

        return {
          activeId,
          currentId,
          nextId,
          progress,
          direction,
          profile,
          viewportWidth,
          viewportHeight,
          sections: snapshots,
        }
      })
    }

    const scheduleMeasure = () => {
      if (frameRef.current !== null) {
        return
      }

      frameRef.current = window.requestAnimationFrame(() => {
        frameRef.current = null
        measure()
      })
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const id = entry.target.getAttribute("data-falcon-section") as HomeSectionId | null
          if (!id) {
            continue
          }

          ratiosRef.current[id] = entry.intersectionRatio
        }

        scheduleMeasure()
      },
      {
        threshold: [0, 0.15, 0.35, 0.55, 0.75, 1],
        rootMargin: "-18% 0px -18% 0px",
      },
    )

    for (const { element } of sections) {
      observer.observe(element)
    }

    const resizeObserver = new ResizeObserver(() => {
      scheduleMeasure()
    })

    for (const { element } of sections) {
      resizeObserver.observe(element)
    }

    window.addEventListener("scroll", scheduleMeasure, { passive: true })
    window.addEventListener("resize", scheduleMeasure)
    scheduleMeasure()

    return () => {
      observer.disconnect()
      resizeObserver.disconnect()
      window.removeEventListener("scroll", scheduleMeasure)
      window.removeEventListener("resize", scheduleMeasure)

      if (frameRef.current !== null) {
        window.cancelAnimationFrame(frameRef.current)
      }
    }
  }, [])

  return state
}
