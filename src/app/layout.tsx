import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "FALCO",
  description:
    "FALCO — Fast Acquisition Lead Conversion Overlay. Distress asset intelligence, underwriting, and execution routing.",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}