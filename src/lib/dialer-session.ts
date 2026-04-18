import crypto from "node:crypto"
import { NextRequest, NextResponse } from "next/server"
import { signSessionPayload, verifySessionPayload } from "@/lib/session-signing"

const COOKIE_IS_SECURE = process.env.NODE_ENV === "production"

export const DIALER_SESSION_COOKIE = "falco_dialer_session"

type DialerSessionPayload = {
  kind: "dialer"
  caller: string
  email?: string
  nonce: string
  exp: number
}

export function setDialerSession(
  res: NextResponse,
  callerName: string,
  email?: string
) {
  const digest = signSessionPayload({
    kind: "dialer",
    caller: callerName.trim() || "caller",
    email: email ? email.trim().toLowerCase() : undefined,
    nonce: crypto.randomBytes(16).toString("hex"),
    exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24, // 24h
  })

  res.cookies.set(DIALER_SESSION_COOKIE, digest, {
    httpOnly: true,
    sameSite: "lax",
    secure: COOKIE_IS_SECURE,
    path: "/",
    maxAge: 60 * 60 * 24,
  })
}

export function clearDialerSession(res: NextResponse) {
  res.cookies.set(DIALER_SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: COOKIE_IS_SECURE,
    path: "/",
    maxAge: 0,
  })
}

export function getDialerSession(req: NextRequest) {
  const sessionValue = req.cookies.get(DIALER_SESSION_COOKIE)?.value?.trim()
  if (!sessionValue) return null

  const payload = verifySessionPayload<DialerSessionPayload>(sessionValue)
  if (!payload || payload.kind !== "dialer") return null
  return payload
}

export function hasDialerSession(req: NextRequest) {
  return getDialerSession(req) !== null
}

/** Server-component variant — reads cookies via next/headers */
export async function readDialerSessionFromCookies(): Promise<DialerSessionPayload | null> {
  const { cookies } = await import("next/headers")
  const store = await cookies()
  const sessionValue = store.get(DIALER_SESSION_COOKIE)?.value?.trim()
  if (!sessionValue) return null
  const payload = verifySessionPayload<DialerSessionPayload>(sessionValue)
  if (!payload || payload.kind !== "dialer") return null
  return payload
}

/** Get either a dialer or operator session as a dialer-shaped session. */
export function getDialerOrOperatorSession(req: NextRequest): DialerSessionPayload | null {
  const dialer = getDialerSession(req)
  if (dialer) return dialer
  // fall back to operator cookie
  const opCookie = req.cookies.get("falco_operator_session")?.value?.trim()
  if (!opCookie) return null
  const opPayload = verifySessionPayload<{ kind: string; nonce: string; exp: number }>(opCookie)
  if (!opPayload || opPayload.kind !== "operator") return null
  return { kind: "dialer", caller: "operator", nonce: opPayload.nonce, exp: opPayload.exp }
}

/** Validate the password from env. Constant-time comparison. */
export function isValidDialerPassword(supplied: string): boolean {
  const expected =
    process.env.FALCO_DIALER_PASSWORD?.trim() ||
    process.env.FALCO_OPERATOR_PASSWORD?.trim() // fallback to operator pw if not set
  if (!expected) return false
  if (supplied.length !== expected.length) return false
  try {
    return crypto.timingSafeEqual(
      Buffer.from(supplied, "utf8"),
      Buffer.from(expected, "utf8")
    )
  } catch {
    return false
  }
}
