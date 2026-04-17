import Link from "next/link"
import { readDialerSessionFromCookies } from "@/lib/dialer-session"
import LogoutButton from "./logout-button"

export const metadata = {
  title: "Dialer · FALCO",
}

export default async function DialerLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await readDialerSessionFromCookies()
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
                <span className="text-white">{session.caller}</span>
              </span>
              <LogoutButton />
            </div>
          </div>
        </header>
      )}
      {children}
    </div>
  )
}
