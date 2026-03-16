import { NextRequest, NextResponse } from "next/server"
import { findApprovalByToken } from "@/lib/access-workflow"
import { verifyVaultLoginLinkToken } from "@/lib/partner-login-link"
import { clearVaultApprovalSession, setVaultApprovalSession } from "@/lib/vault-access-session"

export async function GET(req: NextRequest) {
  const token = String(req.nextUrl.searchParams.get("token") ?? "").trim()
  const baseUrl = req.nextUrl.origin

  if (!token) {
    return NextResponse.redirect(new URL("/partner-login?error=missing-link", baseUrl))
  }

  const payload = verifyVaultLoginLinkToken(token)
  if (!payload) {
    const res = NextResponse.redirect(new URL("/partner-login?error=expired-link", baseUrl))
    clearVaultApprovalSession(res)
    return res
  }

  const approval = await findApprovalByToken(payload.approvalId)
  if (!approval || approval.email.trim().toLowerCase() !== payload.email.trim().toLowerCase()) {
    const res = NextResponse.redirect(new URL("/partner-login?error=approval-invalid", baseUrl))
    clearVaultApprovalSession(res)
    return res
  }

  const res = NextResponse.redirect(new URL("/vault", baseUrl))
  setVaultApprovalSession(res, approval.approvalToken, approval.email)
  return res
}
