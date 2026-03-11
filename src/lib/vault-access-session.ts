import { NextRequest, NextResponse } from "next/server"
import { findApprovalByToken, type AccessApprovalRecord } from "@/lib/access-workflow"

const COOKIE_IS_SECURE = process.env.NODE_ENV === "production"

export const VAULT_APPROVAL_COOKIE = "falco_vault_approval_token"

export async function getVaultApprovalSession(req: NextRequest): Promise<AccessApprovalRecord | null> {
  const token = req.cookies.get(VAULT_APPROVAL_COOKIE)?.value?.trim()
  if (!token) return null

  return findApprovalByToken(token)
}

export function setVaultApprovalSession(
  res: NextResponse,
  approvalToken: string,
  legacyApprovedEmail?: string
) {
  res.cookies.set(VAULT_APPROVAL_COOKIE, approvalToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: COOKIE_IS_SECURE,
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  })

  if (legacyApprovedEmail) {
    res.cookies.set("falco_vault_approved_email", legacyApprovedEmail, {
      httpOnly: false,
      sameSite: "lax",
      secure: COOKIE_IS_SECURE,
      path: "/",
      maxAge: 0,
    })
  }
}

export function clearVaultApprovalSession(res: NextResponse) {
  res.cookies.set(VAULT_APPROVAL_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: COOKIE_IS_SECURE,
    path: "/",
    maxAge: 0,
  })

  res.cookies.set("falco_vault_approved_email", "", {
    httpOnly: false,
    sameSite: "lax",
    secure: COOKIE_IS_SECURE,
    path: "/",
    maxAge: 0,
  })
}
