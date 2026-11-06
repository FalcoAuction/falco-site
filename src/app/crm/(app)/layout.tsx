// Signed-in CRM: one place for leads, calls, inbound forms, outreach and
// data health. Every page under (app) requires the CRM session
// (FALCO_ADMIN_PASSWORD); API routes under /api/crm check it too.

import { redirect } from "next/navigation"
import Link from "next/link"
import { readAdminSessionFromCookies } from "@/lib/admin-session"
import { getToday } from "@/lib/crm-data"
import { Nav } from "@/app/crm/nav"
import { ThemeToggle } from "@/app/crm/theme-toggle"
import { Icon } from "@/app/crm/icons"
import { readTheme, themeAttr } from "@/app/crm/theme"
import "@/app/crm/crm.css"

export const dynamic = "force-dynamic"

export default async function CrmAppLayout({ children }: { children: React.ReactNode }) {
  if (!(await readAdminSessionFromCookies())) redirect("/crm/login")
  const theme = await readTheme()
  const { counts, due } = await getToday()
  return (
    <div className="crm crm-shell" data-theme={themeAttr(theme)}>
      <aside className="crm-side">
        <div className="crm-brand-row">
          <Link href="/crm" className="crm-brand"><span className="crm-brand-mark">F</span><span>FALCO</span></Link>
          <ThemeToggle initial={theme} />
        </div>
        <Nav groups={[
          { items: [
            { href: "/crm", label: "Today", icon: "today", count: due.length || null },
            { href: "/crm/leads", label: "Leads", icon: "leads", count: counts.leads },
            { href: "/crm/inbox", label: "Inbox", icon: "mail" },
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
          <form action="/api/crm/logout" method="post" style={{ width: "100%" }}>
            <button type="submit" className="crm-btn ghost" style={{ width: "100%", justifyContent: "flex-start" }}>
              <Icon name="logout" />Sign out
            </button>
          </form>
        </div>
      </aside>
      <main className="crm-main">{children}</main>
    </div>
  )
}
