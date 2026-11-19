import StartForm from "./start-form"
import { ogMeta } from "@/lib/og"

export const metadata = {
  title: "Start Here | FALCO",
  description:
    "Selling, referring a file, buying, or running an auction firm in Tennessee? Tell us who you are and we ask the right questions. We reply within one business day.",
  alternates: { canonical: "/start" },
  ...ogMeta({
    key: "start",
    title: "Start Here | FALCO",
    description: "Selling, referring a file, buying, or running an auction firm in Tennessee? Tell us who you are and we ask the right questions. We reply within one business day.",
    path: "/start",
  }),
}

// ?s=<situation>&r=<role> preselect the answers when a situation page
// links here.
export default async function StartPage({
  searchParams,
}: {
  searchParams: Promise<{ s?: string; r?: string }>
}) {
  const { s, r } = await searchParams
  return <StartForm s={typeof s === "string" ? s : undefined} r={typeof r === "string" ? r : undefined} />
}
