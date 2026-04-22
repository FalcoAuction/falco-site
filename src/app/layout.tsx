import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import LoadingScreen from "./loading-screen";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "FALCO — Save the equity. Skip the wholesaler.",
  description:
    "We help distressed Tennessee homeowners save their equity by routing their homes through marketed auctions before the trustee sale takes it.",
  icons: {
    icon: [
      { url: "/falco-logo.png", type: "image/png" },
    ],
    shortcut: "/falco-logo.png",
    apple: "/falco-logo.png",
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
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        <LoadingScreen />
        {children}
      </body>
    </html>
  );
}
