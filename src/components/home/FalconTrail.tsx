"use client"

type TrailDot = {
  id: number
  x: number
  y: number
  age: number
  opacity: number
  size: number
}

type FalconTrailProps = {
  dots: TrailDot[]
}

export function FalconTrail({ dots }: FalconTrailProps) {
  return (
    <div className="pointer-events-none fixed inset-0 z-30 overflow-hidden" aria-hidden="true">
      {dots.map((dot) => (
        <span
          key={dot.id}
          className="absolute rounded-full bg-white"
          style={{
            left: dot.x,
            top: dot.y,
            width: dot.size,
            height: dot.size,
            opacity: dot.opacity,
            transform: "translate(-50%, -50%)",
            boxShadow: `0 0 ${dot.size * 4}px rgba(255,255,255,0.22)`,
            filter: `blur(${Math.max(0, dot.age * 0.02)}px)`,
          }}
        />
      ))}
    </div>
  )
}

export type { TrailDot }
