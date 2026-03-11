"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import Image from "next/image"
import {
  motion,
  useMotionTemplate,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
} from "framer-motion"
import { FalconTrail, type TrailDot } from "@/components/home/FalconTrail"
import { useActiveHomeSection } from "@/hooks/useActiveHomeSection"
import {
  clamp,
  easeInOutCubic,
  getFalconAnchor,
  getFalconBirdSize,
  getFalconTrailSettings,
  getSegmentTuning,
  lerp,
  quadraticBezier,
  quadraticTangent,
  viewportPoint,
} from "@/lib/home/falcon-paths"

type FalconPhase =
  | "hero_idle"
  | "perch"
  | "launch"
  | "glide"
  | "bank_left"
  | "bank_right"
  | "dive"
  | "reverse_transition"

function getPhase(progress: number, tangentX: number, tangentY: number, direction: 1 | -1): FalconPhase {
  if (progress < 0.04) {
    return "perch"
  }

  if (progress > 0.9) {
    return "perch"
  }

  if (direction < 0 && progress < 0.2) {
    return "reverse_transition"
  }

  if (progress < 0.18) {
    return "launch"
  }

  if (tangentY > 26 && progress > 0.35 && progress < 0.78) {
    return "dive"
  }

  if (tangentX < -18) {
    return "bank_left"
  }

  if (tangentX > 18) {
    return "bank_right"
  }

  return "glide"
}

export function FalconFlightLayer() {
  const reducedMotion = useReducedMotion()
  const sectionState = useActiveHomeSection()
  const [trailDots, setTrailDots] = useState<TrailDot[]>([])
  const dotIdRef = useRef(0)
  const lastSampleRef = useRef<{ x: number; y: number } | null>(null)

  const targetX = useMotionValue(0)
  const targetY = useMotionValue(0)
  const targetRotate = useMotionValue(0)
  const targetScale = useMotionValue(1)
  const targetOpacity = useMotionValue(0)
  const targetGlow = useMotionValue(0.14)
  const targetFacing = useMotionValue(1)

  const birdX = useSpring(targetX, { stiffness: 110, damping: 24, mass: 0.8 })
  const birdY = useSpring(targetY, { stiffness: 110, damping: 24, mass: 0.86 })
  const birdRotate = useSpring(targetRotate, { stiffness: 120, damping: 22, mass: 0.7 })
  const birdScale = useSpring(targetScale, { stiffness: 100, damping: 22, mass: 0.78 })
  const birdOpacity = useSpring(targetOpacity, { stiffness: 80, damping: 24, mass: 0.9 })
  const birdGlow = useSpring(targetGlow, { stiffness: 90, damping: 24, mass: 0.9 })
  const birdFacing = useSpring(targetFacing, { stiffness: 120, damping: 28, mass: 0.8 })
  const glowRadius = useTransform(birdGlow, (value) => Math.max(0, value * 42))
  const glowFilter = useMotionTemplate`drop-shadow(0 0 ${glowRadius}px rgba(255,255,255,0.28))`

  const motionModel = useMemo(() => {
    const {
      viewportWidth,
      viewportHeight,
      profile,
      currentId,
      nextId,
      progress,
      direction,
      activeId,
    } = sectionState

    if (!viewportWidth || !viewportHeight) {
      return null
    }

    const currentAnchor = getFalconAnchor(currentId, profile)
    const nextAnchor = getFalconAnchor(nextId ?? currentId, profile)
    const currentPoint = viewportPoint(currentAnchor, viewportWidth, viewportHeight)
    const nextPoint = viewportPoint(nextAnchor, viewportWidth, viewportHeight)
    const birdSize = getFalconBirdSize(profile)

    if (reducedMotion || !nextId) {
      const reducedAnchor = getFalconAnchor(activeId, profile)
      const reducedPoint = viewportPoint(reducedAnchor, viewportWidth, viewportHeight)
      const defaultFacing = reducedAnchor.xPct > 50 ? -1 : 1

      return {
        x: reducedPoint.x,
        y: reducedPoint.y,
        rotate: reducedAnchor.perchRotate,
        scale: reducedAnchor.scale,
        facing: defaultFacing,
        opacity: 0.72,
        glow: 0.12,
        phase: activeId === "hero" ? "hero_idle" : "perch",
        speed: 0,
        birdSize,
      }
    }

    const tunedProgress = easeInOutCubic(progress)
    const segment = getSegmentTuning(currentId, nextId, profile)
    const control = {
      x:
        (currentPoint.x + nextPoint.x) / 2 +
        (segment.arcXPct / 100) * viewportWidth,
      y:
        (currentPoint.y + nextPoint.y) / 2 +
        (segment.arcYPct / 100) * viewportHeight,
    }

    const point = quadraticBezier(tunedProgress, currentPoint, control, nextPoint)
    const tangent = quadraticTangent(tunedProgress, currentPoint, control, nextPoint)
    const angle = (Math.atan2(tangent.y, tangent.x) * 180) / Math.PI
    const phaseBase = getPhase(tunedProgress, tangent.x, tangent.y, direction)
    const phase =
      currentId === "hero" && tunedProgress < 0.04 ? "hero_idle" : phaseBase
    const glideLift = Math.sin(tunedProgress * Math.PI) * segment.depth
    const scale =
      lerp(currentAnchor.scale, nextAnchor.scale, tunedProgress) +
      glideLift +
      (phase === "dive" ? 0.04 : 0)
    const rotate =
      phase === "perch"
        ? nextAnchor.perchRotate
        : clamp(angle * 0.34, -24, 24) + (phase === "dive" ? 3 : 0)
    const facing =
      Math.abs(tangent.x) > 8
        ? tangent.x < 0
          ? -1
          : 1
        : nextAnchor.xPct > currentAnchor.xPct
          ? 1
          : -1
    const speed = Math.hypot(tangent.x, tangent.y)
    const glow =
      phase === "dive"
        ? 0.26
        : phase === "perch" || phase === "hero_idle"
          ? 0.12
          : 0.18
    const opacity = phase === "perch" ? 0.84 : 0.96

    return {
      x: point.x,
      y: point.y,
      rotate,
      scale,
      facing,
      opacity,
      glow,
      phase,
      speed,
      birdSize,
    }
  }, [reducedMotion, sectionState])

  useEffect(() => {
    if (!motionModel) {
      return
    }

    targetX.set(motionModel.x)
    targetY.set(motionModel.y)
    targetRotate.set(motionModel.rotate)
    targetScale.set(motionModel.scale)
    targetOpacity.set(motionModel.opacity)
    targetGlow.set(motionModel.glow)
    targetFacing.set(motionModel.facing)
  }, [
    motionModel,
    targetFacing,
    targetGlow,
    targetOpacity,
    targetRotate,
    targetScale,
    targetX,
    targetY,
  ])

  useEffect(() => {
    if (!motionModel || reducedMotion) {
      setTrailDots([])
      return
    }

    const settings = getFalconTrailSettings(sectionState.profile)
    const timer = window.setInterval(() => {
      const x = birdX.get()
      const y = birdY.get()
      const previous = lastSampleRef.current ?? { x, y }
      const distance = Math.hypot(x - previous.x, y - previous.y)
      const shouldEmit =
        motionModel.phase !== "perch" &&
        motionModel.phase !== "hero_idle" &&
        distance > (sectionState.profile === "mobile" ? 10 : 14)

      lastSampleRef.current = { x, y }

      setTrailDots((existing) => {
        const aged = existing
          .map((dot) => {
            const age = dot.age + settings.sampleMs
            const life = 1 - age / settings.lifetimeMs

            return {
              ...dot,
              age,
              opacity: dot.opacity * 0.78 * Math.max(life, 0),
            }
          })
          .filter((dot) => dot.age < settings.lifetimeMs && dot.opacity > 0.015)

        if (!shouldEmit) {
          return aged
        }

        const intensity = clamp(distance / 38, 0.25, 1)
        const size = lerp(2.2, 5.6, intensity) * (sectionState.profile === "mobile" ? 0.82 : 1)
        const newDot: TrailDot = {
          id: dotIdRef.current,
          x,
          y,
          age: 0,
          opacity: 0.26 + intensity * 0.24,
          size,
        }

        dotIdRef.current += 1

        return [newDot, ...aged].slice(0, settings.maxDots)
      })
    }, settings.sampleMs)

    return () => {
      window.clearInterval(timer)
    }
  }, [birdX, birdY, motionModel, reducedMotion, sectionState.profile])

  if (!motionModel) {
    return null
  }

  const perchAnimation =
    motionModel.phase === "perch" || motionModel.phase === "hero_idle"
      ? "falconPerch 7.2s ease-in-out infinite"
      : "none"

  return (
    <>
      <style>{`
        @keyframes falconPerch {
          0%, 100% { transform: translate3d(0, 0, 0); }
          50% { transform: translate3d(0, -3px, 0); }
        }
      `}</style>

      {!reducedMotion ? <FalconTrail dots={trailDots} /> : null}

      <div className="pointer-events-none fixed inset-0 z-30 overflow-hidden" aria-hidden="true">
        <motion.div
          className="absolute left-0 top-0 will-change-transform"
          style={{
            x: birdX,
            y: birdY,
            opacity: birdOpacity,
          }}
        >
          <motion.div
            className="relative will-change-transform"
            style={{
              width: motionModel.birdSize.width,
              height: motionModel.birdSize.height,
              marginLeft: -motionModel.birdSize.width / 2,
              marginTop: -motionModel.birdSize.height / 2,
              rotate: birdRotate,
              scale: birdScale,
            }}
          >
            <div
              className="relative h-full w-full will-change-transform"
              style={{ animation: perchAnimation }}
            >
              <motion.div
                className="relative h-full w-full will-change-transform"
                style={{
                  scaleX: birdFacing,
                  filter: glowFilter,
                }}
              >
                <Image
                  src="/falcon-flight-mark.png"
                  alt=""
                  fill
                  priority
                  sizes="(max-width: 767px) 112px, (max-width: 1279px) 146px, 178px"
                  className="object-contain select-none"
                />
              </motion.div>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </>
  )
}
