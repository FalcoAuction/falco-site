import type { MetadataRoute } from "next"

// Public marketing surface only. Operational routes are excluded via
// robots.ts. lastModified is intentionally omitted on pages we don't
// version — a fake timestamp on every deploy erodes crawler trust.
export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://falco.llc"
  return [
    { url: `${base}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/homeowners`, changeFrequency: "weekly", priority: 0.9 },
    { url: `${base}/manifesto`, changeFrequency: "monthly", priority: 0.7 },
    { url: `${base}/buyers`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${base}/partners`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${base}/inquiry`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${base}/privacy`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${base}/terms`, changeFrequency: "yearly", priority: 0.2 },
  ]
}
