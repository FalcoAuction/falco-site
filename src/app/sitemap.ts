import type { MetadataRoute } from "next"
import { COUNTIES } from "./foreclosure/county-list"

// Public marketing surface only. Operational routes are excluded via
// robots.ts. lastModified is intentionally omitted on pages we don't
// version — a fake timestamp on every deploy erodes crawler trust.
export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://falco.llc"
  const countyPages: MetadataRoute.Sitemap = [
    { url: `${base}/foreclosure`, changeFrequency: "weekly", priority: 0.8 },
    // Memphis city page — distinct from the Shelby County logistics page,
    // targets the high-intent "foreclosure Memphis" search.
    { url: `${base}/foreclosure/memphis`, changeFrequency: "monthly", priority: 0.8 },
    ...COUNTIES.map((c) => ({
      url: `${base}/foreclosure/${c.slug}`,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
  ]
  return [
    ...countyPages,
    { url: `${base}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/homeowners`, changeFrequency: "weekly", priority: 0.9 },
    // Guides — the SEO content hub. Pillar highest, comparisons below it.
    { url: `${base}/guides`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${base}/guides/tennessee-foreclosure-process`, changeFrequency: "monthly", priority: 0.9 },
    { url: `${base}/guides/postpone-trustee-sale-tennessee`, changeFrequency: "monthly", priority: 0.85 },
    { url: `${base}/guides/cash-offer-vs-auction`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/guides/short-sale-vs-auction`, changeFrequency: "monthly", priority: 0.7 },
    { url: `${base}/guides/wholesaler-economics`, changeFrequency: "monthly", priority: 0.7 },
    { url: `${base}/guides/tennessee-foreclosure-surplus-funds`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/manifesto`, changeFrequency: "monthly", priority: 0.7 },
    { url: `${base}/buyers`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${base}/partners`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${base}/inquiry`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${base}/sms-consent`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${base}/privacy`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${base}/terms`, changeFrequency: "yearly", priority: 0.2 },
  ]
}
