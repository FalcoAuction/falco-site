import { redirect } from "next/navigation"
import { readAdminSessionFromCookies } from "@/lib/admin-session"
import LoginForm from "./login-form"

export const dynamic = "force-dynamic"
export const metadata = { title: "Admin · FALCO", robots: "noindex, nofollow" }

export default async function AdminLoginPage() {
  const session = await readAdminSessionFromCookies()
  if (session) redirect("/admin")
  return (
    <main className="min-h-screen bg-[#060606] text-white flex items-center justify-center px-6">
      <div className="absolute inset-0 -z-30 bg-[#060606]" />
      <div className="absolute inset-0 -z-20 bg-[radial-gradient(circle_at_top,rgba(16,185,129,0.06),transparent_45%)]" />
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:32px_32px] opacity-[0.4]" />

      <div className="w-full max-w-sm">
        <div className="text-[12px] uppercase tracking-[0.32em] text-emerald-300/85 font-semibold mb-2">
          FALCO
        </div>
        <h1 className="text-[28px] font-semibold tracking-tight">Admin login</h1>
        <p className="mt-2 text-[13px] text-white/55 leading-relaxed">
          Internal lead inbox. Drop your password to continue.
        </p>
        <div className="mt-8">
          <LoginForm />
        </div>
      </div>
    </main>
  )
}
