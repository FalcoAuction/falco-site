import { ImageResponse } from "next/og";

export const runtime = "edge";

export const size = {
  width: 1200,
  height: 630,
};

export const contentType = "image/png";

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
        {/* Subtle radial glow */}
        <div
          style={{
            position: "absolute",
            top: -100,
            left: "50%",
            width: 800,
            height: 500,
            marginLeft: -400,
            background: "radial-gradient(circle, rgba(16,185,129,0.08) 0%, transparent 70%)",
            display: "flex",
          }}
        />

        {/* Content */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            width: "100%",
            height: "100%",
            padding: "60px 80px",
            textAlign: "center",
          }}
        >
          {/* FALCO wordmark */}
          <div
            style={{
              display: "flex",
              fontSize: 16,
              fontWeight: 600,
              letterSpacing: 8,
              textTransform: "uppercase",
              color: "rgba(255,255,255,0.4)",
              marginBottom: 40,
            }}
          >
            FALCO
          </div>

          {/* Headline */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 4,
            }}
          >
            <div
              style={{
                display: "flex",
                fontSize: 72,
                fontWeight: 700,
                lineHeight: 0.9,
                letterSpacing: -3,
                color: "#ffffff",
              }}
            >
              FALCO finds the file.
            </div>
            <div
              style={{
                display: "flex",
                fontSize: 72,
                fontWeight: 700,
                lineHeight: 0.9,
                letterSpacing: -3,
                color: "rgba(16,185,129,0.5)",
              }}
            >
              You control the deal.
            </div>
          </div>

          {/* Sub-hero */}
          <div
            style={{
              display: "flex",
              fontSize: 14,
              fontWeight: 400,
              letterSpacing: 4,
              textTransform: "uppercase",
              color: "rgba(255,255,255,0.3)",
              marginTop: 40,
              maxWidth: 600,
              textAlign: "center",
              lineHeight: 1.6,
            }}
          >
            Real estate distress intelligence across Tennessee
          </div>

          {/* Bottom bar */}
          <div
            style={{
              display: "flex",
              position: "absolute",
              bottom: 40,
              left: 80,
              right: 80,
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                fontSize: 12,
                letterSpacing: 3,
                textTransform: "uppercase",
                color: "rgba(16,185,129,0.5)",
              }}
            >
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: "rgb(16,185,129)",
                  display: "flex",
                }}
              />
              Live Pipeline
            </div>

            <div
              style={{
                display: "flex",
                fontSize: 12,
                letterSpacing: 2,
                color: "rgba(255,255,255,0.15)",
              }}
            >
              falco.llc
            </div>
          </div>
        </div>
      </div>
    ),
    size
  );
}
