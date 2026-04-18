import { redirect } from "next/navigation"
import { cookies } from "next/headers"
import { readDialerSessionFromCookies, DIALER_SESSION_COOKIE } from "@/lib/dialer-session"
import { OPERATOR_SESSION_COOKIE } from "@/lib/operator-access-session"
import { verifySessionPayload } from "@/lib/session-signing"
import { findDialerAcceptance } from "@/lib/dialer-acceptance"

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
 * dialer as read-write (same as the caller, no agreement gate). For dialer
 * (caller) sessions, the email must have a recorded NDA + non-circ
 * acceptance, otherwise the user is bounced to /dialer/agreement.
 */
export async function requireDialerSession(redirectFromPath: string) {
  const dialer = await readDialerSessionFromCookies()
  if (dialer) {
    if (dialer.email) {
      const acc = await findDialerAcceptance(dialer.email)
      if (!acc) {
        const params = new URLSearchParams({ next: redirectFromPath })
        redirect(`/dialer/agreement?${params.toString()}`)
      }
    } else {
      // Old session without an email — clear it and send them to login fresh.
      // Without the cookie clear, /dialer/login will keep redirecting back here.
      try {
        const store = await cookies()
        store.delete(DIALER_SESSION_COOKIE)
      } catch {
        // ignore — best effort
      }
      redirect("/dialer/login?redirect=" + encodeURIComponent(redirectFromPath))
    }
    return dialer
  }

  const operator = await readOperatorSession()
  if (operator) {
    return {
      kind: "dialer" as const,
      caller: "operator",
      email: undefined,
      nonce: operator.nonce,
      exp: operator.exp,
    }
  }

  const params = new URLSearchParams({ redirect: redirectFromPath })
  redirect(`/dialer/login?${params.toString()}`)
}
