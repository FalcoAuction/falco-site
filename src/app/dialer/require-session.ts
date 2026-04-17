import { redirect } from "next/navigation"
import { readDialerSessionFromCookies } from "@/lib/dialer-session"

export async function requireDialerSession(redirectFromPath: string) {
  const session = await readDialerSessionFromCookies()
  if (!session) {
    const params = new URLSearchParams({ redirect: redirectFromPath })
    redirect(`/dialer/login?${params.toString()}`)
  }
  return session
}
