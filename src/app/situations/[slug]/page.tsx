import { notFound } from "next/navigation"
import LaneContent from "../../v2/lane-content"
import { SITUATIONS, SITUATION_BY_SLUG } from "../../v2/situations"
import { ogMeta } from "@/lib/og"

export const dynamicParams = false

export function generateStaticParams() {
  return SITUATIONS.map((s) => ({ slug: s.slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const s = SITUATION_BY_SLUG[slug]
  if (!s) return {}
  return {
    title: s.title,
    description: s.description,
    alternates: { canonical: `/situations/${s.slug}` },
    ...ogMeta({ key: `situation-${s.slug}`, title: s.title, description: s.description, path: `/situations/${s.slug}` }),
  }
}

export default async function SituationPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const s = SITUATION_BY_SLUG[slug]
  if (!s) notFound()
  // FAQPage schema mirrors the visible accordion verbatim.
  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: s.faq.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: { "@type": "Answer", text: item.a },
    })),
  }
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }}
      />
      <LaneContent slug={s.slug} />
    </>
  )
}
