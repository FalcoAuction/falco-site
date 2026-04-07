import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
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
  title: "FALCO",
  description:
    "FALCO - Distress asset intelligence, underwriting, and controlled execution routing.",
  icons: {
    icon: [
      { url: "/falco-mark-transparent.png", type: "image/png" },
    ],
    shortcut: "/falco-mark-transparent.png",
    apple: "/falco-mark-transparent.png",
  },
  metadataBase: new URL("https://falco.llc"),
  openGraph: {
    title: "FALCO | Distress Asset Intelligence",
    description:
      "Controlled distress lead origination, underwriting, and partner-ready opportunity routing.",
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
    title: "FALCO | Distress Asset Intelligence",
    description:
      "Controlled distress lead origination, underwriting, and partner-ready opportunity routing.",
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
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        <div className="falco-preloader" aria-hidden="true">
          <div className="falco-preloader-ring" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/falco-mark-transparent.png"
            alt=""
            width={56}
            height={56}
            className="falco-preloader-logo"
          />
        </div>
        {children}
      </body>
    </html>
  );
}
