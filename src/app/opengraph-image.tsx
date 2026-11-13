import { ImageResponse } from "next/og"
import { readFileSync } from "node:fs"
import path from "node:path"

// Node runtime so the logo can be read off disk and embedded.
export const runtime = "nodejs"

export const alt =
  "FALCO. Built to keep what's yours. Any distressed asset in Tennessee, routed to the licensed auction firm that sells it best. No cost to you."
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"

function loadBird(): string | null {
  try {
    const buf = readFileSync(path.join(process.cwd(), "public", "media", "falco-bird-ink.png"))
    return `data:image/png;base64,${buf.toString("base64")}`
  } catch {
    return null
  }
}
const BIRD = loadBird()

// Matches the site: light ground, black type, the bird, nothing else.
export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          width: "100%",
          height: "100%",
          background: "#f3f2f0",
          color: "#0c0c0b",
          padding: "64px 72px",
          fontFamily: "Inter, system-ui, sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          {BIRD ? <img src={BIRD} alt="" width={54} height={64} /> : null}
          <div style={{ display: "flex", fontSize: 30, fontWeight: 700, letterSpacing: -1 }}>FALCO</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", fontSize: 92, fontWeight: 600, letterSpacing: -4, lineHeight: 1 }}>
            Built to keep what&apos;s yours.
          </div>
          <div style={{ display: "flex", marginTop: 28, fontSize: 32, color: "#6d6c66", lineHeight: 1.35, maxWidth: 940 }}>
            Any distressed asset in Tennessee, routed to the licensed auction firm that sells it best. No cost to you.
          </div>
        </div>
        <div style={{ display: "flex", fontSize: 22, color: "#6d6c66" }}>falco.llc</div>
      </div>
    ),
    size
  )
}
