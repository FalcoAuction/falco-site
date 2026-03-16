import crypto from "node:crypto"
import { NextRequest, NextResponse } from "next/server"
import { getAdminApprovalSecret } from "@/lib/admin-approval-secret"

const COOKIE_IS_SECURE = process.env.NODE_ENV === "production"

export const OPERATOR_SESSION_COOKIE = "falco_operator_session"

function buildOperatorSessionDigest(secret: string) {
  return crypto.createHash("sha256").update(secret).digest("hex")
}

export function setOperatorSession(res: NextResponse) {
  const secret = getAdminApprovalSecret()
  const digest = buildOperatorSessionDigest(secret)

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

  const secret = getAdminApprovalSecret()
  return sessionValue === buildOperatorSessionDigest(secret)
}
