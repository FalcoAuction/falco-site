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
import { useActiveHomeSection } from "@/hooks/useActiveHomeSection"
import {
  clamp,
  easeInOutCubic,
  getFalconAnchor,
  getFalconBirdSize,
  getSegmentTuning,
  lerp,
  quadraticBezier,
  quadraticTangent,
  resolveAnchorPoint,
} from "@/lib/home/falcon-paths"

type FalconPhase =
  | "hero_idle"
  | "perch"
  | "launch"
  | "glide"
  | "bank_left"
  | "bank_right"
  | "dive"
  | "landing"
  | "reverse_transition"

type MotionModel = {
  x: number
  y: number
  rotate: number
  scale: number
  facing: 1 | -1
  opacity: number
  glow: number
  phase: FalconPhase
  currentId: string
  nextId: string | null
  birdSize: { width: number; height: number }
}

function getPhase(progress: number, tangentX: number, tangentY: number, direction: 1 | -1): FalconPhase {
  if (progress < 0.08) {
    return direction < 0 ? "reverse_transition" : "launch"
  }

  if (progress > 0.84) {
    return "landing"
  }

  if (tangentY > 20 && progress > 0.34 && progress < 0.72) {
    return "dive"
  }

  if (tangentX < -20) {
    return "bank_left"
  }

  if (tangentX > 20) {
    return "bank_right"
  }

  return "glide"
}

function getPhaseAnimation(phase: FalconPhase) {
  switch (phase) {
    case "hero_idle":
      return { name: "falconHeroIdle", duration: "7.2s", timing: "ease-in-out", iteration: "infinite" }
    case "perch":
      return { name: "falconPerchIdle", duration: "6.4s", timing: "ease-in-out", iteration: "infinite" }
    case "launch":
      return { name: "falconLaunch", duration: "680ms", timing: "cubic-bezier(0.22, 1, 0.36, 1)", iteration: "1" }
    case "bank_left":
      return { name: "falconBankLeft", duration: "1.5s", timing: "ease-in-out", iteration: "infinite" }
    case "bank_right":
      return { name: "falconBankRight", duration: "1.5s", timing: "ease-in-out", iteration: "infinite" }
    case "dive":
      return { name: "falconDive", duration: "980ms", timing: "cubic-bezier(0.22, 1, 0.36, 1)", iteration: "infinite" }
    case "landing":
      return { name: "falconLanding", duration: "900ms", timing: "cubic-bezier(0.22, 1, 0.36, 1)", iteration: "1" }
    case "reverse_transition":
      return {
        name: "falconReverse",
        duration: "760ms",
        timing: "cubic-bezier(0.22, 1, 0.36, 1)",
        iteration: "1",
      }
    case "glide":
    default:
      return { name: "falconGlide", duration: "2.2s", timing: "ease-in-out", iteration: "infinite" }
  }
}

export function FalconFlightLayer() {
  const reducedMotion = useReducedMotion()
  const sectionState = useActiveHomeSection()
  const targetX = useMotionValue(0)
  const targetY = useMotionValue(0)
  const targetRotate = useMotionValue(0)
  const targetScale = useMotionValue(1)
  const targetOpacity = useMotionValue(0)
  const targetGlow = useMotionValue(0.12)
  const targetFacing = useMotionValue(1)
  const previousPhaseRef = useRef<FalconPhase | null>(null)
  const [phaseNonce, setPhaseNonce] = useState(0)

  const birdX = useSpring(targetX, { stiffness: 92, damping: 22, mass: 0.82 })
  const birdY = useSpring(targetY, { stiffness: 94, damping: 24, mass: 0.86 })
  const birdRotate = useSpring(targetRotate, { stiffness: 96, damping: 18, mass: 0.72 })
  const birdScale = useSpring(targetScale, { stiffness: 90, damping: 19, mass: 0.76 })
  const birdOpacity = useSpring(targetOpacity, { stiffness: 80, damping: 24, mass: 0.9 })
  const birdGlow = useSpring(targetGlow, { stiffness: 74, damping: 22, mass: 0.9 })
  const birdFacing = useSpring(targetFacing, { stiffness: 110, damping: 24, mass: 0.82 })
  const glowRadius = useTransform(birdGlow, (value) => Math.max(8, value * 34))
  const glowFilter = useMotionTemplate`drop-shadow(0 0 ${glowRadius}px rgba(255,255,255,0.18))`

  const motionModel = useMemo<MotionModel | null>(() => {
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

    const birdSize = getFalconBirdSize(profile)

    const activeAnchor = getFalconAnchor(activeId, profile)
    const currentPoint = resolveAnchorPoint(currentId, profile, viewportWidth, viewportHeight)

    if (reducedMotion || !nextId) {
      return {
        x: currentPoint.x,
        y: currentPoint.y,
        rotate: activeId === "hero" ? -7 : activeAnchor.perchRotate,
        scale: activeAnchor.scale,
        facing: currentPoint.x > viewportWidth * 0.56 ? -1 : 1,
        opacity: 0.88,
        glow: 0.12,
        phase: activeId === "hero" ? "hero_idle" : "perch",
        currentId,
        nextId: null,
        birdSize,
      }
    }

    const currentAnchor = getFalconAnchor(currentId, profile)
    const nextAnchor = getFalconAnchor(nextId, profile)
    const nextPoint = resolveAnchorPoint(nextId, profile, viewportWidth, viewportHeight)
    const tunedProgress = easeInOutCubic(progress)
    const segment = getSegmentTuning(currentId, nextId, profile)
    const control = {
      x: (currentPoint.x + nextPoint.x) / 2 + (segment.arcXPct / 100) * viewportWidth,
      y: (currentPoint.y + nextPoint.y) / 2 + (segment.arcYPct / 100) * viewportHeight,
    }

    const point = quadraticBezier(tunedProgress, currentPoint, control, nextPoint)
    const tangent = quadraticTangent(tunedProgress, currentPoint, control, nextPoint)
    const angle = (Math.atan2(tangent.y, tangent.x) * 180) / Math.PI
    const basePhase =
      currentId === "hero" && tunedProgress < 0.05
        ? "hero_idle"
        : getPhase(tunedProgress, tangent.x, tangent.y, direction)
    const depthLift = Math.sin(tunedProgress * Math.PI) * segment.depth
    const phaseScaleBoost =
      basePhase === "dive" ? 0.05 : basePhase === "launch" ? 0.03 : 0
    const rotate =
      basePhase === "landing" || basePhase === "perch" || basePhase === "hero_idle"
        ? nextAnchor.perchRotate
        : clamp(angle * 0.34, -26, 26) + (basePhase === "dive" ? 5 : 0)

    return {
      x: point.x,
      y: point.y,
      rotate,
      scale:
        lerp(currentAnchor.scale, nextAnchor.scale, tunedProgress) +
        depthLift +
        phaseScaleBoost,
      facing:
        Math.abs(tangent.x) > 5
          ? tangent.x < 0
            ? -1
            : 1
          : nextPoint.x > currentPoint.x
            ? 1
            : -1,
      opacity: 0.96,
      glow:
        basePhase === "dive"
          ? 0.2
          : basePhase === "launch" || basePhase === "landing"
            ? 0.16
            : 0.12,
      phase: basePhase,
      currentId,
      nextId,
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

    if (previousPhaseRef.current !== motionModel.phase) {
      previousPhaseRef.current = motionModel.phase
      setPhaseNonce((value) => value + 1)
    }
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

  if (!motionModel) {
    return null
  }

  const phaseAnimation = getPhaseAnimation(motionModel.phase)

  return (
    <>
      <style>{`
        @keyframes falconHeroIdle {
          0%, 100% { transform: translate3d(0, 0, 0) rotate(0deg) scale(1); }
          20% { transform: translate3d(0.5px, -1px, 0) rotate(-1deg) scale(1.012); }
          46% { transform: translate3d(-0.5px, 0.6px, 0) rotate(0.4deg) scale(0.996); }
          72% { transform: translate3d(0.4px, -0.7px, 0) rotate(-0.2deg) scale(1.004); }
        }

        @keyframes falconPerchIdle {
          0%, 100% { transform: translate3d(0, 0, 0) rotate(0deg) scale(1); }
          24% { transform: translate3d(0.6px, -1.4px, 0) rotate(-0.8deg) scale(1.01); }
          58% { transform: translate3d(-0.4px, 0.5px, 0) rotate(0.45deg) scale(0.995); }
          82% { transform: translate3d(0.3px, -0.8px, 0) rotate(-0.25deg) scale(1.003); }
        }

        @keyframes falconLaunch {
          0% { transform: translate3d(0, 0, 0) rotate(0deg) scale(1); }
          24% { transform: translate3d(-2px, 2px, 0) rotate(-2deg) scale(0.982); }
          54% { transform: translate3d(4px, -7px, 0) rotate(2.5deg) scale(1.02); }
          100% { transform: translate3d(10px, -14px, 0) rotate(5deg) scale(1.03); }
        }

        @keyframes falconGlide {
          0%, 100% { transform: translate3d(0, 0, 0) rotate(0deg) scale(1); }
          35% { transform: translate3d(0, -2px, 0) rotate(1.4deg) scale(1.012); }
          65% { transform: translate3d(0, 1px, 0) rotate(-0.8deg) scale(0.998); }
        }

        @keyframes falconBankLeft {
          0%, 100% { transform: translate3d(0, 0, 0) rotate(0deg) scale(1); }
          50% { transform: translate3d(-4px, -2px, 0) rotate(-5deg) scale(1.02); }
        }

        @keyframes falconBankRight {
          0%, 100% { transform: translate3d(0, 0, 0) rotate(0deg) scale(1); }
          50% { transform: translate3d(4px, -2px, 0) rotate(5deg) scale(1.02); }
        }

        @keyframes falconDive {
          0% { transform: translate3d(0, 0, 0) rotate(0deg) scale(1); }
          45% { transform: translate3d(1px, 6px, 0) rotate(4deg) scale(1.045); }
          100% { transform: translate3d(0, 10px, 0) rotate(6deg) scale(1.055); }
        }

        @keyframes falconLanding {
          0% { transform: translate3d(10px, -10px, 0) rotate(5deg) scale(1.04); }
          58% { transform: translate3d(0, 3px, 0) rotate(-2.4deg) scale(0.986); }
          100% { transform: translate3d(0, 0, 0) rotate(0deg) scale(1); }
        }

        @keyframes falconReverse {
          0% { transform: translate3d(-8px, -10px, 0) rotate(-4deg) scale(1.03); }
          56% { transform: translate3d(-1px, -4px, 0) rotate(1.2deg) scale(1.01); }
          100% { transform: translate3d(0, 0, 0) rotate(0deg) scale(1); }
        }
      `}</style>

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
              key={`${motionModel.currentId}-${motionModel.nextId ?? "none"}-${motionModel.phase}-${phaseNonce}`}
              className="relative h-full w-full will-change-transform"
              style={{
                animationName: phaseAnimation.name,
                animationDuration: phaseAnimation.duration,
                animationTimingFunction: phaseAnimation.timing,
                animationIterationCount: phaseAnimation.iteration,
                animationFillMode: "both",
              }}
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
                  sizes="(max-width: 767px) 56px, (max-width: 1279px) 74px, 90px"
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
