import { redirect } from "next/navigation"
import { cookies } from "next/headers"
import { readDialerSessionFromCookies } from "@/lib/dialer-session"
import { OPERATOR_SESSION_COOKIE } from "@/lib/operator-access-session"
import { verifySessionPayload } from "@/lib/session-signing"

type OperatorSessionPayload = { kind: "operator"; nonce: string; exp: number }

async function readOperatorSession(): Promise<OperatorSessionPayload | null> {
  try {
    const store = await cookies()
    const value = store.get(OPERATOR_SESSION_COOKIE)?.value?.trim()
    if (!value) return null
    const payload = verifySessionPayload<OperatorSessionPayload>(value)
    if (!payload || payload.kind !== "operator") return null
    return payload
  } catch {
    return null
  }
}

/**
 * Allow either a dialer session OR a logged-in operator. Operator sees the
 * dialer as read-write (same as the caller). The returned session always
 * looks like a dialer session — for operator viewers we synthesize a
 * "caller" name of "operator" so activity attribution stays sane.
 */
export async function requireDialerSession(redirectFromPath: string) {
  const dialer = await readDialerSessionFromCookies()
  if (dialer) return dialer

  const operator = await readOperatorSession()
  if (operator) {
    return { kind: "dialer" as const, caller: "operator", nonce: operator.nonce, exp: operator.exp }
  }

  const params = new URLSearchParams({ redirect: redirectFromPath })
  redirect(`/dialer/login?${params.toString()}`)
}
