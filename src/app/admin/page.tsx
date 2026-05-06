import { redirect } from "next/navigation"
import { readAdminSessionFromCookies } from "@/lib/admin-session"
import { fetchAllLeads } from "@/lib/admin-leads"
import { getBotFreshness } from "@/lib/bot-freshness"
import AdminContent from "./admin-content"

export const dynamic = "force-dynamic"
export const metadata = { title: "Admin · FALCO", robots: "noindex, nofollow" }

export default async function AdminPage() {
  const session = await readAdminSessionFromCookies()
  if (!session) redirect("/admin/login")

  const [bundle, botFreshness] = await Promise.all([
    fetchAllLeads(200),
    getBotFreshness(),
  ])
  return <AdminContent bundle={bundle} botFreshness={botFreshness} />
}
