import type { MetadataRoute } from "next"

// Crawl policy:
//   - Public marketing surface is indexable.
//   - Everything operational (admin, dialer, operator console, pilot
//     partner economics, internal team docs, APIs, legacy vault) is
//     disallowed — some of it is auth-gated anyway, but partner terms
//     and pilot economics must never sit in a search index.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/admin",
          "/api/",
          "/dialer",
          "/operator",
          "/pilot/",
          "/team/",
          "/vault",
          "/vault-routing",
          "/approve-access",
          "/request-access",
          "/partner-login",
          "/submit-opportunity",
          "/outreach",
          "/investor",
        ],
      },
    ],
    sitemap: "https://falco.llc/sitemap.xml",
  }
}
