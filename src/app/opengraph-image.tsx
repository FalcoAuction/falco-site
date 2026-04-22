import { ImageResponse } from "next/og"
import { readFileSync } from "node:fs"
import path from "node:path"

// Run on the Node runtime so we can read the hero poster off disk and
// embed it as a data URI. Edge runtime can't touch the filesystem.
export const runtime = "nodejs"

export const alt = "FALCO routes distressed Tennessee homes to auction"
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"

// Read the same poster the hero <video> uses, so the share preview is a
// frozen still of the v2 hero. Loaded once at module init — Vercel reuses
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
            paints behind the autoplaying loop. */}
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
              filter: "grayscale(100%) brightness(0.55)",
            }}
          />
        ) : null}

        {/* Vignette + emerald glow stack — mirrors the live hero overlays */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "radial-gradient(ellipse at center, rgba(6,6,6,0.45) 0%, rgba(6,6,6,0.85) 70%, #060606 100%)",
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

        {/* Content */}
        <div
          style={{
            position: "relative",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "flex-start",
            width: "100%",
            height: "100%",
            padding: "70px 88px",
          }}
        >
          {/* Wordmark */}
          <div
            style={{
              display: "flex",
              fontSize: 18,
              fontWeight: 700,
              letterSpacing: 10,
              textTransform: "uppercase",
              color: "rgba(255,255,255,0.9)",
              marginBottom: 36,
            }}
          >
            FALCO
          </div>

          {/* Hero headline — same wording as the v2 hero */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              fontSize: 68,
              fontWeight: 600,
              lineHeight: 1.04,
              letterSpacing: -2.5,
              color: "#ffffff",
              maxWidth: 1020,
            }}
          >
            <div style={{ display: "flex", flexWrap: "wrap" }}>
              <span>We route distressed Tennessee&nbsp;homes&nbsp;</span>
              <span style={{ color: "rgb(52,211,153)" }}>to auction</span>
              <span style={{ color: "rgba(255,255,255,0.55)" }}>
                . Not to wholesalers.
              </span>
            </div>
          </div>

          {/* Subcopy — condensed v2 hero supporting line */}
          <div
            style={{
              display: "flex",
              fontSize: 24,
              fontWeight: 400,
              lineHeight: 1.45,
              color: "rgba(255,255,255,0.78)",
              marginTop: 32,
              maxWidth: 880,
            }}
          >
            Homeowners keep their equity. Buyers get first look at Tennessee
            inventory before it hits the broader market.
          </div>

          {/* Bottom bar */}
          <div
            style={{
              display: "flex",
              position: "absolute",
              bottom: 56,
              left: 88,
              right: 88,
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                fontSize: 14,
                letterSpacing: 4,
                textTransform: "uppercase",
                color: "rgba(16,185,129,0.85)",
                fontWeight: 600,
              }}
            >
              <div
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: "50%",
                  background: "rgb(16,185,129)",
                  boxShadow: "0 0 14px rgba(16,185,129,0.7)",
                  display: "flex",
                }}
              />
              Tennessee · Live Pipeline
            </div>

            <div
              style={{
                display: "flex",
                fontSize: 14,
                letterSpacing: 3,
                textTransform: "uppercase",
                color: "rgba(255,255,255,0.45)",
                fontWeight: 500,
              }}
            >
              falco.llc
            </div>
          </div>
        </div>
      </div>
    ),
    size
  )
}
