import StartForm from "./start-form"

export const metadata = {
  title: "Tell Us What Happened | FALCO Tennessee",
  description:
    "Estate, business closing, foreclosure, bankruptcy or lien sale in Tennessee? Two minutes, and we come back within one business day with what is worth auctioning and what it would likely clear.",
  alternates: { canonical: "/start" },
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
