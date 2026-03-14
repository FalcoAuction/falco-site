import type { Metadata } from "next";
import "./globals.css";

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
      <body>{children}</body>
    </html>
  );
}
