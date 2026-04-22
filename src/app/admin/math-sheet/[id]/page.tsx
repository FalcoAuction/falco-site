import { redirect, notFound } from "next/navigation"
import { readAdminSessionFromCookies } from "@/lib/admin-session"
import { supabaseAdmin } from "@/lib/supabase-admin"
import MathSheetContent, { type HomeownerSnapshot } from "./math-sheet-content"

export const dynamic = "force-dynamic"
export const metadata = { title: "Math sheet · FALCO Admin", robots: "noindex, nofollow" }

export default async function MathSheetPage({
  params,
}: {
  params: Promise<{ id: string }>
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
    fullName: (data.full_name as string) || "",
    email: (data.email as string) || "",
    phone: (data.phone as string) || "",
    propertyAddress: (data.property_address as string) || "",
    county: (data.county as string) || "",
    trusteeSaleDate: (data.trustee_sale_date as string | null) ?? null,
    mortgageBalance: (data.mortgage_balance as number | null) ?? null,
    submittedAt: (data.submitted_at as string) || "",
  }

  return <MathSheetContent homeowner={snapshot} />
}
