import Link from "next/link"
import { cookies } from "next/headers"
import { readDialerSessionFromCookies } from "@/lib/dialer-session"
import { OPERATOR_SESSION_COOKIE } from "@/lib/operator-access-session"
import { verifySessionPayload } from "@/lib/session-signing"
import LogoutButton from "./logout-button"

export const metadata = {
  title: "Dialer · FALCO",
}

type ActiveSession = {
  callerName: string
  isOperator: boolean
}

async function readActiveSession(): Promise<ActiveSession | null> {
  // Prefer dialer cookie (the named caller); fall back to operator cookie.
  const dialer = await readDialerSessionFromCookies()
  if (dialer) return { callerName: dialer.caller, isOperator: false }

  try {
    const store = await cookies()
    const value = store.get(OPERATOR_SESSION_COOKIE)?.value?.trim()
    if (!value) return null
    const payload = verifySessionPayload<{ kind: string; exp: number }>(value)
    if (!payload || payload.kind !== "operator") return null
    return { callerName: "operator", isOperator: true }
  } catch {
    return null
  }
}

export default async function DialerLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await readActiveSession()
  return (
    <div className="min-h-screen bg-[#060606] text-white">
      {session && (
        <header className="sticky top-0 z-30 border-b border-white/10 bg-[#060606]/85 backdrop-blur">
          <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between">
            <Link
              href="/dialer"
              className="text-base font-bold tracking-tight hover:text-emerald-400"
            >
              FALCO{" "}
              <span className="text-emerald-400 font-normal text-xs uppercase tracking-wider">
                · Dialer
              </span>
            </Link>
            <div className="flex items-center gap-3 text-xs text-white/65">
              <span className="hidden sm:inline">
                Signed in as{" "}
                <span className="text-white">{session.callerName}</span>
                {session.isOperator && (
                  <span className="ml-1.5 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-emerald-200">
                    operator
                  </span>
                )}
              </span>
              {session.isOperator && (
                <Link
                  href="/operator"
                  className="rounded-md border border-white/12 bg-white/[0.04] hover:bg-white/[0.08] px-2.5 py-1 text-[11px] uppercase tracking-wider text-white/75 transition-colors"
                >
                  /operator
                </Link>
              )}
              <LogoutButton />
            </div>
          </div>
        </header>
      )}
      {children}
    </div>
  )
}
