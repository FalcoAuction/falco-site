import { redirect } from "next/navigation"
import { readAdminSessionFromCookies } from "@/lib/admin-session"
import { fetchAllLeads } from "@/lib/admin-leads"
import AdminContent from "./admin-content"

export const dynamic = "force-dynamic"
export const metadata = { title: "Admin · FALCO", robots: "noindex, nofollow" }

export default async function AdminPage() {
  const session = await readAdminSessionFromCookies()
  if (!session) redirect("/admin/login")

  const bundle = await fetchAllLeads(200)
  return <AdminContent bundle={bundle} />
}
