import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FALCO",
  description:
    "FALCO — Fast Acquisition Lead Conversion Overlay. Distress asset intelligence, underwriting, and execution routing.",

  icons: {
    icon: [
      { url: "/icon.jpg", type: "image/jpeg" },
      { url: "/falco-logo.jpg", type: "image/jpeg" },
    ],
    shortcut: "/icon.jpg",
    apple: "/icon.jpg",
  },

  metadataBase: new URL("https://falco.llc"),

  openGraph: {
    title: "FALCO",
    description:
      "FALCO — Fast Acquisition Lead Conversion Overlay. Distress asset intelligence and deal origination engine.",
    url: "https://falco.llc",
    siteName: "FALCO",
    images: [
      {
        url: "/falco-preview.jpg",
        width: 1200,
        height: 630,
        alt: "FALCO",
      },
    ],
    locale: "en_US",
    type: "website",
  },

  twitter: {
    card: "summary_large_image",
    title: "FALCO",
    description:
      "Distress Asset Intelligence and Deal Origination Engine.",
    images: ["/falco-preview.jpg"],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
