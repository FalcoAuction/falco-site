import { NextRequest, NextResponse } from "next/server"
import { findApprovalByEmail } from "@/lib/access-workflow"
import { sendVaultLoginLinkEmail } from "@/lib/partner-login-link"
import { clearVaultApprovalSession } from "@/lib/vault-access-session"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const email = String(body?.email ?? "").trim().toLowerCase()

    if (!email) {
      return NextResponse.json(
        { ok: false, error: "Email is required." },
        { status: 400 }
      )
    }

    const approval = await findApprovalByEmail(email)
    const origin = (process.env.FALCO_SITE_URL?.trim() || req.nextUrl.origin).replace(/\/+$/, "")

    if (!approval) {
      console.warn("access_check denied_unapproved_email", { email })
      const res = NextResponse.json(
        {
          ok: true,
          sent: true,
          message: "If that email is approved for vault access, a secure login link has been sent.",
        }
      )
      clearVaultApprovalSession(res)
      return res
    }

    await sendVaultLoginLinkEmail({
      email: approval.email,
      approvalId: approval.approvalToken,
      origin,
    })

    return NextResponse.json({
      ok: true,
      sent: true,
      message: "If that email is approved for vault access, a secure login link has been sent.",
    })
  } catch (error) {
    console.error("access_check error", error)
    return NextResponse.json(
      { ok: false, error: "Unable to send vault login link." },
      { status: 500 }
    )
  }
}
