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
          background: "#000",
          color: "#fff",
          padding: "56px 64px",
          fontFamily: "Arial, sans-serif",
          justifyContent: "space-between",
          alignItems: "stretch",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            width: "68%",
          }}
        >
          <div
            style={{
              display: "flex",
              fontSize: 24,
              letterSpacing: 6,
              textTransform: "uppercase",
              opacity: 0.72,
            }}
          >
            Falco
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <div
              style={{
                display: "flex",
                fontSize: 82,
                fontWeight: 700,
                lineHeight: 1,
                letterSpacing: -3,
                maxWidth: 720,
              }}
            >
              Distress Asset Intelligence
            </div>
            <div
              style={{
                display: "flex",
                fontSize: 32,
                lineHeight: 1.35,
                color: "rgba(255,255,255,0.76)",
                maxWidth: 700,
              }}
            >
              Controlled lead origination, underwriting, and partner-ready
              opportunity routing.
            </div>
          </div>

          <div
            style={{
              display: "flex",
              gap: 16,
              flexWrap: "wrap",
            }}
          >
            {["Underwritten Leads", "Private Vault", "Execution Routing"].map((label) => (
              <div
                key={label}
                style={{
                  display: "flex",
                  border: "1px solid rgba(255,255,255,0.18)",
                  borderRadius: 999,
                  padding: "12px 18px",
                  fontSize: 20,
                  letterSpacing: 1,
                  textTransform: "uppercase",
                  color: "rgba(255,255,255,0.72)",
                }}
              >
                {label}
              </div>
            ))}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            width: "26%",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              display: "flex",
              width: 280,
              height: 280,
              borderRadius: "50%",
              overflow: "hidden",
              border: "1px solid rgba(255,255,255,0.12)",
              background: "#fff",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <img
              src="https://falco.llc/falco-logo.jpg"
              alt="FALCO logo"
              width="220"
              height="220"
              style={{ objectFit: "contain" }}
            />
          </div>
        </div>
      </div>
    ),
    size
  );
}
