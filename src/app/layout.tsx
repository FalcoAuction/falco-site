import type { Metadata } from "next";
import { DM_Sans, Cormorant_Garamond, Geist_Mono } from "next/font/google";
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
    // og:video removed with the hero footage — the share preview is the
    // static og:image everywhere now.
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
      {/* No media preloads: the site no longer renders hero footage, so
          the old poster/video prefetch was pure wasted bandwidth. */}
      <body className={`${dmSans.variable} ${cormorant.variable} ${geistMono.variable}`}>
        <LoadingScreen />
        {children}
      </body>
    </html>
  );
}
