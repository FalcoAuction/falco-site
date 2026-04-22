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
  title: "FALCO · Tennessee Distressed Real Estate",
  description:
    "Homeowners keep their equity. Buyers get first look at Tennessee inventory before it hits the broader market.",
  icons: {
    icon: [
      { url: "/falco-logo.png", type: "image/png" },
    ],
    shortcut: "/falco-logo.png",
    apple: "/falco-logo.png",
  },
  metadataBase: new URL("https://falco.llc"),
  openGraph: {
    title: "FALCO · Tennessee Distressed Real Estate",
    description:
      "Homeowners keep their equity. Buyers get first look at Tennessee inventory before it hits the broader market.",
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
        url: "https://falco.llc/video/hero-loop.mp4",
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
    title: "FALCO · Tennessee Distressed Real Estate",
    description:
      "Homeowners keep their equity. Buyers get first look at Tennessee inventory before it hits the broader market.",
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
        {/* Warm cache for the hero video so it's ready by the time the loading screen finishes */}
        <link rel="preload" as="video" href="/video/hero-loop.mp4" type="video/mp4" />
        <link rel="preload" as="image" href="/video/hero-poster.jpg" type="image/jpeg" />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        <LoadingScreen />
        {children}
      </body>
    </html>
  );
}
