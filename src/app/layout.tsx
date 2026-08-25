import type { Metadata } from "next";
import { DM_Sans, Cormorant_Garamond, Geist_Mono } from "next/font/google";
import Script from "next/script";
import LoadingScreen from "./loading-screen";
import "./globals.css";

// Body / UI: DM Sans — clean, warm geometric sans. The workhorse voice,
// paired with the display serif the way a serious property brand pairs
// them (per the La Masion editorial direction).
const dmSans = DM_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

// Display / headlines: Cormorant Garamond — an elegant, high-contrast
// old-style serif. Reserved for large display sizes where its delicacy
// reads as luxury and authority, not weakness. This is the face that
// carries the "established firm" credibility on the warm ivory ground.
const cormorant = Cormorant_Garamond({
  variable: "--font-display",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
});

const geistMono = Geist_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  display: "swap",
});

const GA_ID = "G-PYSVEK735L";

export const metadata: Metadata = {
  title: "FALCO — Save the equity. Skip the wholesaler.",
  description:
    "We help distressed Tennessee homeowners save their equity by routing their homes through marketed auctions before the trustee sale takes it.",
  // Square (512x512) white falcon on the dark brand background. The old
  // /falco-logo.png favicon was non-square (341x512) AND white-on-
  // transparent, so Google rejected it on shape and it was invisible on
  // white — hence no icon in search results. This one is square and
  // visible on any background.
  icons: {
    icon: [{ url: "/favicon-512.png", type: "image/png", sizes: "512x512" }],
    shortcut: "/favicon-512.png",
    apple: "/favicon-512.png",
  },
  metadataBase: new URL("https://falco.llc"),
  openGraph: {
    title: "FALCO — Save the equity. Skip the wholesaler.",
    description:
      "We help distressed Tennessee homeowners save their equity by routing their homes through marketed auctions before the trustee sale takes it.",
    url: "https://falco.llc",
    siteName: "FALCO",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "FALCO routes distressed Tennessee homes to auction",
      },
    ],
    // Some platforms (Discord, Facebook) play a linked og:video alongside
    // the og:image preview. Most (iMessage, Slack, Twitter, LinkedIn,
    // WhatsApp) ignore it and just show the image — that's expected.
    videos: [
      {
        // hero-share.mp4 is the hero loop with the headline burned in via
        // ffmpeg drawtext, sized + vignetted for share previews. Used by
        // platforms that play og:video inline (iMessage, Discord, Facebook).
        url: "https://falco.llc/video/hero-share.mp4",
        width: 1280,
        height: 720,
        type: "video/mp4",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "FALCO — Save the equity. Skip the wholesaler.",
    description:
      "We help distressed Tennessee homeowners save their equity by routing their homes through marketed auctions before the trustee sale takes it.",
    images: ["/opengraph-image"],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        {/* Always preload the lightweight hero poster — it's what the loading
            screen waits on and the painted background on mobile. */}
        <link rel="preload" as="image" href="/video/hero-poster.jpg" type="image/jpeg" />
        {/* Only pre-fetch the heavy hero video on desktop. Mobile renders the
            poster only (see HeroVideoBg) so pre-fetching ~4.7MB on cell would
            waste data and slow first paint. */}
        <link
          rel="preload"
          as="video"
          href="/video/hero-loop.mp4"
          type="video/mp4"
          media="(min-width: 768px)"
        />
      </head>
      <body className={`${dmSans.variable} ${cormorant.variable} ${geistMono.variable}`}>
        <LoadingScreen />
        {children}
        {/* Google Analytics 4. Loaded afterInteractive so it never blocks
            first paint, and only in production so local dev traffic does not
            pollute the property. Disclosed in /privacy. */}
        {process.env.NODE_ENV === "production" && (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
              strategy="afterInteractive"
            />
            <Script id="ga4-init" strategy="afterInteractive">
              {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${GA_ID}');`}
            </Script>
          </>
        )}
      </body>
    </html>
  );
}
