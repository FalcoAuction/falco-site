import { NextRequest, NextResponse } from "next/server"
import { findApprovalByToken } from "@/lib/access-workflow"
import { verifyVaultLoginLinkToken } from "@/lib/partner-login-link"
import { recordVaultActivity } from "@/lib/vault-activity"
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
  const forwardedFor = req.headers.get("x-forwarded-for") ?? ""
  const ipAddress = forwardedFor.split(",")[0]?.trim() || "unknown"
  const userAgent = req.headers.get("user-agent") ?? "unknown"
  await recordVaultActivity({
    eventType: "vault_login_verified",
    email: approval.email,
    partnerName: approval.email,
    detail: "Approved email verified through secure login link.",
    ipAddress,
    userAgent,
    actedBy: approval.email,
    context: {
      method: "secure_email_link",
    },
  })
  return res
}
