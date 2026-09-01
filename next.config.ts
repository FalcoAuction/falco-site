import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,

  // Only HSTS was being sent. These are the low-risk headers that matter
  // for a site with an authenticated dialer and admin behind it.
  // A full Content-Security-Policy is deliberately not set here: it needs
  // to be validated against Google Analytics, Supabase and the video
  // assets first, and a wrong CSP silently breaks the app.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          // Clickjacking: nothing here should ever be framed, and the
          // dialer/admin are session-cookie authenticated.
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
          // Stop MIME sniffing on user-facing responses.
          { key: "X-Content-Type-Options", value: "nosniff" },
          // Don't leak full lead URLs (which carry lead slugs) to
          // third-party sites in the Referer header.
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // We ask for none of these; deny by default.
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
