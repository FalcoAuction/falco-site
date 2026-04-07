"use client"

import { useEffect, useRef } from "react"

type DotOrbitProps = {
  dotColor?: string
  lineColor?: string
  density?: number
  speed?: number
  dotSize?: number
  linkDistance?: number
  opacity?: number
  className?: string
}

export function DotOrbit({
  dotColor = "rgba(16, 185, 129, 0.6)",
  lineColor = "rgba(16, 185, 129, 0.08)",
  density = 0.8,
  speed = 0.4,
  dotSize = 1.5,
  linkDistance = 120,
  opacity = 1,
  className = "",
}: DotOrbitProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const mouseRef = useRef({ x: -1000, y: -1000 })
  const frameRef = useRef<number>(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Respect reduced motion
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    if (prefersReducedMotion) return

    let width = 0
    let height = 0
    let dots: {
      x: number
      y: number
      angle: number
      radius: number
      orbitSpeed: number
      size: number
      pulseOffset: number
    }[] = []

    function resize() {
      const dpr = window.devicePixelRatio || 1
      const rect = canvas!.getBoundingClientRect()
      width = rect.width
      height = rect.height
      canvas!.width = width * dpr
      canvas!.height = height * dpr
      ctx!.scale(dpr, dpr)
      initDots()
    }

    function initDots() {
      const area = width * height
      const count = Math.floor((area / 12000) * density)
      const cx = width / 2
      const cy = height / 2
      const maxRadius = Math.max(width, height) * 0.55

      dots = Array.from({ length: count }, () => {
        const angle = Math.random() * Math.PI * 2
        const radius = 40 + Math.random() * maxRadius
        return {
          x: cx + Math.cos(angle) * radius,
          y: cy + Math.sin(angle) * radius,
          angle,
          radius,
          orbitSpeed: (0.2 + Math.random() * 0.8) * speed * (Math.random() > 0.5 ? 1 : -1),
          size: dotSize * (0.5 + Math.random() * 0.8),
          pulseOffset: Math.random() * Math.PI * 2,
        }
      })
    }

    function draw(time: number) {
      ctx!.clearRect(0, 0, width, height)
      ctx!.globalAlpha = opacity

      const cx = width / 2
      const cy = height / 2
      const mx = mouseRef.current.x
      const my = mouseRef.current.y
      const t = time * 0.001

      // Update positions
      for (const dot of dots) {
        dot.angle += dot.orbitSpeed * 0.003
        const wobble = Math.sin(t * 0.5 + dot.pulseOffset) * 8
        dot.x = cx + Math.cos(dot.angle) * (dot.radius + wobble)
        dot.y = cy + Math.sin(dot.angle) * (dot.radius + wobble * 0.6)

        // Mouse repulsion
        const dx = dot.x - mx
        const dy = dot.y - my
        const dist = Math.sqrt(dx * dx + dy * dy)
        if (dist < 150 && dist > 0) {
          const force = (150 - dist) / 150 * 12
          dot.x += (dx / dist) * force
          dot.y += (dy / dist) * force
        }
      }

      // Draw lines between nearby dots
      for (let i = 0; i < dots.length; i++) {
        for (let j = i + 1; j < dots.length; j++) {
          const dx = dots[i].x - dots[j].x
          const dy = dots[i].y - dots[j].y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist < linkDistance) {
            const alpha = (1 - dist / linkDistance) * 0.5
            ctx!.beginPath()
            ctx!.strokeStyle = lineColor
            ctx!.globalAlpha = alpha * opacity
            ctx!.lineWidth = 0.5
            ctx!.moveTo(dots[i].x, dots[i].y)
            ctx!.lineTo(dots[j].x, dots[j].y)
            ctx!.stroke()
          }
        }
      }

      // Draw dots
      ctx!.globalAlpha = opacity
      for (const dot of dots) {
        const pulse = 1 + Math.sin(t * 1.5 + dot.pulseOffset) * 0.3
        ctx!.beginPath()
        ctx!.fillStyle = dotColor
        ctx!.arc(dot.x, dot.y, dot.size * pulse, 0, Math.PI * 2)
        ctx!.fill()
      }

      frameRef.current = requestAnimationFrame(draw)
    }

    function handleMouseMove(e: MouseEvent) {
      const rect = canvas!.getBoundingClientRect()
      mouseRef.current.x = e.clientX - rect.left
      mouseRef.current.y = e.clientY - rect.top
    }

    function handleMouseLeave() {
      mouseRef.current.x = -1000
      mouseRef.current.y = -1000
    }

    window.addEventListener("resize", resize)
    canvas.addEventListener("mousemove", handleMouseMove)
    canvas.addEventListener("mouseleave", handleMouseLeave)

    resize()
    frameRef.current = requestAnimationFrame(draw)

    return () => {
      cancelAnimationFrame(frameRef.current)
      window.removeEventListener("resize", resize)
      canvas.removeEventListener("mousemove", handleMouseMove)
      canvas.removeEventListener("mouseleave", handleMouseLeave)
    }
  }, [dotColor, lineColor, density, speed, dotSize, linkDistance, opacity])

  return (
    <canvas
      ref={canvasRef}
      className={`pointer-events-auto ${className}`}
      style={{ width: "100%", height: "100%", position: "absolute", inset: 0 }}
    />
  )
}
