import crypto from "node:crypto"
import { NextRequest, NextResponse } from "next/server"
import { signSessionPayload, verifySessionPayload } from "@/lib/session-signing"

const COOKIE_IS_SECURE = process.env.NODE_ENV === "production"

export const OPERATOR_SESSION_COOKIE = "falco_operator_session"

type OperatorSessionPayload = {
  kind: "operator"
  nonce: string
  exp: number
}

export function setOperatorSession(res: NextResponse) {
  const digest = signSessionPayload({
    kind: "operator",
    nonce: crypto.randomBytes(16).toString("hex"),
    exp: Math.floor(Date.now() / 1000) + 60 * 60 * 12,
  })

  res.cookies.set(OPERATOR_SESSION_COOKIE, digest, {
    httpOnly: true,
    sameSite: "lax",
    secure: COOKIE_IS_SECURE,
    path: "/",
    maxAge: 60 * 60 * 12,
  })
}

export function clearOperatorSession(res: NextResponse) {
  res.cookies.set(OPERATOR_SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: COOKIE_IS_SECURE,
    path: "/",
    maxAge: 0,
  })
}

export function hasOperatorSession(req: NextRequest) {
  const sessionValue = req.cookies.get(OPERATOR_SESSION_COOKIE)?.value?.trim()
  if (!sessionValue) return false

  const payload = verifySessionPayload<OperatorSessionPayload>(sessionValue)
  return Boolean(payload && payload.kind === "operator")
}
