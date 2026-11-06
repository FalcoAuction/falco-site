// /crm: one place for leads, calls, outreach and data health. Admin-only
// (same session as /admin). Theme comes from the crm_theme cookie so the
// first paint is right; "system" follows prefers-color-scheme.

import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import Link from "next/link"
import { readAdminSessionFromCookies } from "@/lib/admin-session"
import { getToday } from "@/lib/crm-data"
import { Nav } from "./nav"
import { ThemeToggle, type ThemePref } from "./theme-toggle"
import "./crm.css"

export const dynamic = "force-dynamic"
export const metadata = { title: "FALCO CRM", robots: "noindex, nofollow" }

export default async function CrmLayout({ children }: { children: React.ReactNode }) {
  if (!(await readAdminSessionFromCookies())) redirect("/admin/login")
  const raw = (await cookies()).get("crm_theme")?.value
  const theme: ThemePref = raw === "light" || raw === "dark" ? raw : "system"
  const { counts, due } = await getToday()
  return (
    <div className="crm" data-theme={theme === "system" ? undefined : theme}>
      <aside className="crm-side">
        <Link href="/crm" className="crm-brand"><span className="crm-brand-mark">F</span><span>FALCO</span></Link>
        <Nav groups={[
          { items: [
            { href: "/crm", label: "Today", icon: "today", count: due.length || null },
            { href: "/crm/leads", label: "Leads", icon: "leads", count: counts.leads },
            { href: "/crm/landlords", label: "Landlords", icon: "landlord", count: counts.landlords },
          ] },
          { label: "Outreach", items: [
            { href: "/crm/outreach", label: "Campaigns", icon: "outreach" },
            { href: "/crm/attorneys", label: "Estate attorneys", icon: "attorney" },
          ] },
          { label: "System", items: [
            { href: "/crm/health", label: "Data health", icon: "health" },
          ] },
        ]} />
        <div className="crm-side-foot">
          <ThemeToggle initial={theme} />
        </div>
      </aside>
      <main className="crm-main">{children}</main>
    </div>
  )
}
