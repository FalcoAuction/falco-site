import { NextRequest, NextResponse } from "next/server"
import { findApprovalByToken, type AccessApprovalRecord } from "@/lib/access-workflow"
import { signSessionPayload, verifySessionPayload } from "@/lib/session-signing"

const COOKIE_IS_SECURE = process.env.NODE_ENV === "production"

export const VAULT_APPROVAL_COOKIE = "falco_vault_approval_token"

type VaultApprovalSessionPayload = {
  kind: "vault_approval"
  approvalId: string
  email: string
  exp: number
}

export async function getVaultApprovalSession(req: NextRequest): Promise<AccessApprovalRecord | null> {
  const token = req.cookies.get(VAULT_APPROVAL_COOKIE)?.value?.trim()
  if (!token) return null

  const payload = verifySessionPayload<VaultApprovalSessionPayload>(token)
  if (!payload || payload.kind !== "vault_approval") return null

  const approval = await findApprovalByToken(payload.approvalId)
  if (!approval) return null
  if (approval.email.trim().toLowerCase() !== payload.email.trim().toLowerCase()) return null

  return approval
}

export function setVaultApprovalSession(
  res: NextResponse,
  approvalToken: string,
  approvedEmail: string
) {
  const sessionToken = signSessionPayload({
    kind: "vault_approval",
    approvalId: approvalToken,
    email: approvedEmail.trim().toLowerCase(),
    exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7,
  })

  res.cookies.set(VAULT_APPROVAL_COOKIE, sessionToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: COOKIE_IS_SECURE,
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  })
}

export function clearVaultApprovalSession(res: NextResponse) {
  res.cookies.set(VAULT_APPROVAL_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: COOKIE_IS_SECURE,
    path: "/",
    maxAge: 0,
  })
}
