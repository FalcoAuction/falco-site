import { redirect, notFound } from "next/navigation"
import { readAdminSessionFromCookies } from "@/lib/admin-session"
import { supabaseAdmin } from "@/lib/supabase-admin"
import MathSheetContent, { type HomeownerSnapshot } from "./math-sheet-content"
import { type Scenario } from "./scenario-config"
import { extractCodeViolationData } from "./code-violation-data"

export const dynamic = "force-dynamic"
export const metadata = { title: "Math sheet · FALCO Admin", robots: "noindex, nofollow" }

export default async function MathSheetPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ view?: string }>
}) {
  const session = await readAdminSessionFromCookies()
  if (!session) redirect("/admin/login")
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
  const { data, error } = await supabaseAdmin
    .from("homeowner_requests")
    .select("*")
    .eq("id", id)
    .maybeSingle()
  if (error) {
    console.error("math-sheet load error:", error.message)
  }
  if (!data) notFound()

  const snapshot: HomeownerSnapshot = {
    id: String(data.id),
    fullName: (data.full_name as string) || (data.owner_name_records as string) || "",
    email: (data.email as string) || "",
    phone: (data.phone as string) || "",
    propertyAddress: (data.property_address as string) || "",
    county: (data.county as string) || "",
    trusteeSaleDate: (data.trustee_sale_date as string | null) ?? null,
    mortgageBalance: (data.mortgage_balance as number | null) ?? null,
    submittedAt: (data.submitted_at as string) || "",
    // Pipeline-enriched fields used to pre-populate the math sheet inputs
    propertyValue: (data.property_value as number | null) ?? null,
    propertyValueSource: (data.property_value_source as string | null) ?? null,
    distressType: (data.distress_type as string | null) ?? null,
    codeViolation: extractCodeViolationData(
      data.raw_payload,
      (data.admin_notes as string | null) ?? null,
    ),
  }

  return (
    <MathSheetContent
      homeowner={snapshot}
      scenarioOverride={view as Scenario | null}
      toggleHrefBuilder={(s) => `/admin/math-sheet/${id}?view=${s}`}
    />
  )
}
