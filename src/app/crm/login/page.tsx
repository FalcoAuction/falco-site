import { redirect } from "next/navigation"
import { readAdminSessionFromCookies } from "@/lib/admin-session"
import { readTheme, themeAttr } from "@/app/crm/theme"
import { ThemeToggle } from "@/app/crm/theme-toggle"
import { LoginForm } from "./login-form"
import "@/app/crm/crm.css"

export const dynamic = "force-dynamic"
export const metadata = { title: "Sign in · FALCO CRM", robots: "noindex, nofollow" }

export default async function CrmLoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams
  // Only same-site CRM paths; never an open redirect.
  const dest = next && /^\/crm(\/|$)/.test(next) && !next.startsWith("//") ? next : "/crm"
  if (await readAdminSessionFromCookies()) redirect(dest)
  const theme = await readTheme()
  return (
    <div className="crm crm-auth" data-theme={themeAttr(theme)}>
      <div style={{ position: "fixed", top: 12, right: 12 }}><ThemeToggle initial={theme} /></div>
      <div className="crm-card crm-auth-card">
        <span className="crm-brand-mark" style={{ width: 28, height: 28, fontSize: 14 }}>F</span>
        <h1>Sign in to FALCO</h1>
        <p className="crm-muted" style={{ margin: "0 0 18px" }}>Enter the CRM password to continue.</p>
        <LoginForm dest={dest} />
      </div>
    </div>
  )
}
