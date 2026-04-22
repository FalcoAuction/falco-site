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
  title: "FALCO | Find the File. Control the Deal.",
  description:
    "FALCO monitors real estate distress signals across Tennessee daily and assembles the full file so you can act on opportunities in minutes, not days.",
  icons: {
    icon: [
      { url: "/falco-logo.png", type: "image/png" },
    ],
    shortcut: "/falco-logo.png",
    apple: "/falco-logo.png",
  },
  metadataBase: new URL("https://falco.llc"),
  openGraph: {
    title: "FALCO | Find the File. Control the Deal.",
    description:
      "Real estate distress intelligence across Tennessee. Sourced daily. Assembled automatically.",
    url: "https://falco.llc",
    siteName: "FALCO",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "FALCO distress asset intelligence preview",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "FALCO | Find the File. Control the Deal.",
    description:
      "Real estate distress intelligence across Tennessee. Sourced daily. Assembled automatically.",
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
