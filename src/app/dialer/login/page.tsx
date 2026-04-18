import { redirect } from "next/navigation"
import { readDialerSessionFromCookies } from "@/lib/dialer-session"
import { findDialerAcceptance } from "@/lib/dialer-acceptance"
import LoginForm from "./login-form"

export const metadata = {
  title: "Dialer · FALCO",
}

export default async function DialerLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string; error?: string }>
}) {
  const session = await readDialerSessionFromCookies()
  // Only auto-skip the form when the session is FULLY valid: has email AND a
  // recorded acceptance. Stale legacy sessions (no email) fall through to the
  // form so the user can re-enter their email — prevents redirect loops with
  // requireDialerSession.
  if (session?.email) {
    const acc = await findDialerAcceptance(session.email)
    if (acc) redirect("/dialer")
    // Has email but no acceptance — bounce to agreement
    redirect(`/dialer/agreement?next=${encodeURIComponent("/dialer")}`)
  }
  const params = await searchParams
  return (
    <main className="min-h-screen bg-[#060606] text-white flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="text-2xl font-bold tracking-tight">FALCO</div>
          <div className="mt-1 text-xs uppercase tracking-[0.18em] text-emerald-400">
            Dialer Console
          </div>
        </div>
        <LoginForm
          redirectTo={params.redirect ?? "/dialer"}
          initialError={params.error ?? null}
        />
      </div>
    </main>
  )
}
