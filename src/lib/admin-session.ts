import crypto from "node:crypto"
import { NextRequest, NextResponse } from "next/server"
import { signSessionPayload, verifySessionPayload } from "@/lib/session-signing"

const COOKIE_IS_SECURE = process.env.NODE_ENV === "production"
export const ADMIN_SESSION_COOKIE = "falco_admin_session"
const SESSION_DURATION_HOURS = 12

type AdminSessionPayload = {
  kind: "admin"
  nonce: string
  exp: number
}

export function setAdminSession(res: NextResponse) {
  const digest = signSessionPayload({
    kind: "admin",
    nonce: crypto.randomBytes(16).toString("hex"),
    exp: Math.floor(Date.now() / 1000) + 60 * 60 * SESSION_DURATION_HOURS,
  })
  res.cookies.set(ADMIN_SESSION_COOKIE, digest, {
    httpOnly: true,
    sameSite: "lax",
    secure: COOKIE_IS_SECURE,
    path: "/",
    maxAge: 60 * 60 * SESSION_DURATION_HOURS,
  })
}

export function clearAdminSession(res: NextResponse) {
  res.cookies.set(ADMIN_SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: COOKIE_IS_SECURE,
    path: "/",
    maxAge: 0,
  })
}

export function getAdminSession(req: NextRequest): AdminSessionPayload | null {
  const v = req.cookies.get(ADMIN_SESSION_COOKIE)?.value?.trim()
  if (!v) return null
  const p = verifySessionPayload<AdminSessionPayload>(v)
  if (!p || p.kind !== "admin") return null
  return p
}

/** Server-component variant — reads cookies via next/headers */
export async function readAdminSessionFromCookies(): Promise<AdminSessionPayload | null> {
  const { cookies } = await import("next/headers")
  const store = await cookies()
  const v = store.get(ADMIN_SESSION_COOKIE)?.value?.trim()
  if (!v) return null
  const p = verifySessionPayload<AdminSessionPayload>(v)
  if (!p || p.kind !== "admin") return null
  return p
}

/** Constant-time password check. */
export function isValidAdminPassword(supplied: string): boolean {
  const expected = process.env.FALCO_ADMIN_PASSWORD?.trim()
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
