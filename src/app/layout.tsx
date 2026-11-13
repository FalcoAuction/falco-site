import type { Metadata } from "next";
import { Inter, Geist_Mono } from "next/font/google";
import Script from "next/script";
import "./globals.css";

// The ported design system is single-typeface: Inter, self-hosted by
// next/font so there is no render-blocking Google Fonts request (the
// static site linked fonts.googleapis.com in <head>).
const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  display: "swap",
});

const GA_ID = "G-PYSVEK735L";

export const metadata: Metadata = {
  title: "FALCO | Everything has a buyer.",
  description:
    "Any distressed asset in Tennessee, from a house to an estate to a business closing, routed to the licensed auction firm that sells it best. No cost to you; the buyer pays the premium.",
  // Square (512x512) black falcon on white, the same bird the site uses.
  // Google needs a square icon that reads on light and dark result pages.
  icons: {
    // New file names, so browsers that cached the old white-on-black
    // icon have to fetch this one. /favicon.ico is the same bird.
    icon: [
      { url: "/falco-icon-2026.png", type: "image/png", sizes: "512x512" },
      { url: "/favicon.ico", sizes: "any" },
    ],
    shortcut: "/falco-icon-2026.png",
    apple: { url: "/falco-apple-icon-2026.png", sizes: "180x180" },
  },
  metadataBase: new URL("https://falco.llc"),
  openGraph: {
    title: "FALCO | Everything has a buyer.",
    description:
      "Any distressed asset in Tennessee, from a house to an estate to a business closing, routed to the licensed auction firm that sells it best. No cost to you; the buyer pays the premium.",
    url: "https://falco.llc",
    siteName: "FALCO",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "FALCO routes distressed Tennessee assets to auction",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "FALCO | Everything has a buyer.",
    description:
      "Any distressed asset in Tennessee, from a house to an estate to a business closing, routed to the licensed auction firm that sells it best. No cost to you; the buyer pays the premium.",
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
      <body className={`${inter.variable} ${geistMono.variable}`}>
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
