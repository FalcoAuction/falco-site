// Per-page link previews (texts, iMessage, Slack, social). Each page passes
// its own key, title and description; the image comes from /og/<key>, which
// only renders text the site defines for that key, so nobody can make the
// domain draw words of their choosing.

export function ogMeta({
  key,
  title,
  description,
  path,
}: {
  key: string
  title: string
  description: string
  path: string
}) {
  const image = { url: `/og/${key}`, width: 1200, height: 630, alt: title }
  return {
    openGraph: {
      title,
      description,
      url: `https://falco.llc${path}`,
      siteName: "FALCO",
      images: [image],
      locale: "en_US",
      type: "website" as const,
    },
    twitter: {
      card: "summary_large_image" as const,
      title,
      description,
      images: [image.url],
    },
  }
}
