import { redirect, notFound } from "next/navigation"
import { readAdminSessionFromCookies } from "@/lib/admin-session"
import { supabaseAdmin } from "@/lib/supabase-admin"
import MathSheetContent from "./math-sheet-content"
import { type Scenario } from "./scenario-config"
import { loadHomeownerSnapshot } from "./load-snapshot"

export const dynamic = "force-dynamic"
export const metadata = { title: "Math sheet · FALCO CRM", robots: "noindex, nofollow" }

export default async function MathSheetPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ view?: string; layout?: string }>
}) {
  const session = await readAdminSessionFromCookies()
  if (!session) redirect("/crm/login")
  if (!supabaseAdmin) {
    return (
      <main className="min-h-screen bg-[#060606] text-white grid place-items-center p-8">
        <div className="text-[14px] text-amber-200">Database not configured.</div>
      </main>
    )
  }

  const { id } = await params
  const sp = await searchParams
  const view = sp.view ?? null
  const snapshot = await loadHomeownerSnapshot(id)
  if (!snapshot) notFound()

  return (
    <MathSheetContent
      homeowner={snapshot}
      scenarioOverride={view as Scenario | null}
      layout={sp.layout === "classic" ? "classic" : "simple"}
    />
  )
}
