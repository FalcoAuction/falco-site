import { ImageResponse } from "next/og"
import { readFileSync } from "node:fs"
import path from "node:path"

// Run on the Node runtime so we can read the hero poster off disk and
// embed it as a data URI. Edge runtime can't touch the filesystem.
export const runtime = "nodejs"

export const alt =
  "FALCO routes distressed Tennessee homes to local auction companies, not wholesalers"
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"

// Read the same poster the hero <video> uses, so the share preview is a
// frozen still of the hero. Loaded once at module init — Vercel reuses
// the same lambda for cached invocations.
function loadPosterDataUri(): string | null {
  try {
    const filePath = path.join(process.cwd(), "public", "video", "hero-poster.jpg")
    const buf = readFileSync(filePath)
    return `data:image/jpeg;base64,${buf.toString("base64")}`
  } catch {
    return null
  }
}
const POSTER = loadPosterDataUri()

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          width: "100%",
          height: "100%",
          background: "#060606",
          color: "#fff",
          fontFamily: "Inter, system-ui, sans-serif",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Hero video poster as the background — same image the live hero
            paints. Slightly darker than before so the text reads cleanly
            even on small share-preview sizes. */}
        {POSTER ? (
          <img
            src={POSTER}
            alt=""
            width={1200}
            height={630}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
              filter: "grayscale(100%) brightness(0.45)",
            }}
          />
        ) : null}

        {/* Vignette + emerald glow stack — bumped up a notch for readability. */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "radial-gradient(ellipse at center, rgba(6,6,6,0.55) 0%, rgba(6,6,6,0.92) 70%, #060606 100%)",
            display: "flex",
          }}
        />
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "radial-gradient(circle at top, rgba(16,185,129,0.10) 0%, transparent 55%)",
            display: "flex",
          }}
        />

        {/* Content — three-row column: FALCO (top, centered) /
            headline (middle, centered) / falco.llc (bottom, centered). */}
        <div
          style={{
            position: "relative",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            alignItems: "center",
            width: "100%",
            height: "100%",
            padding: "56px 60px",
          }}
        >
          {/* Centered FALCO wordmark */}
          <div
            style={{
              display: "flex",
              fontSize: 22,
              fontWeight: 700,
              letterSpacing: 14,
              textTransform: "uppercase",
              color: "rgba(255,255,255,0.95)",
            }}
          >
            FALCO
          </div>

          {/* Hero headline — three explicit lines mirroring the live hero
              (white / emerald / faded), centered, sized to be legible at
              small preview dimensions. */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              fontSize: 62,
              fontWeight: 600,
              lineHeight: 1.1,
              letterSpacing: -2,
              textAlign: "center",
            }}
          >
            <div style={{ color: "#ffffff" }}>
              We route distressed Tennessee homes
            </div>
            <div style={{ color: "rgb(52,211,153)" }}>
              to local auction companies.
            </div>
            <div style={{ color: "rgba(255,255,255,0.55)" }}>
              Not to wholesalers.
            </div>
          </div>

          {/* Centered falco.llc */}
          <div
            style={{
              display: "flex",
              fontSize: 14,
              letterSpacing: 5,
              textTransform: "uppercase",
              color: "rgba(255,255,255,0.55)",
              fontWeight: 500,
            }}
          >
            falco.llc
          </div>
        </div>
      </div>
    ),
    size
  )
}
