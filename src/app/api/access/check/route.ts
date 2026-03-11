import { NextRequest, NextResponse } from "next/server"
import { findApprovalByEmail } from "@/lib/access-workflow"
import {
  clearVaultApprovalSession,
  setVaultApprovalSession,
} from "@/lib/vault-access-session"

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

    if (!approval) {
      console.warn("access_check denied_unapproved_email", { email })
      const res = NextResponse.json(
        { ok: false, error: "Unable to verify vault access." },
        { status: 403 }
      )
      clearVaultApprovalSession(res)
      return res
    }

    const res = NextResponse.json({
      ok: true,
      approved: true,
      email: approval.email,
      approvedAt: approval.approvedAt,
    })

    setVaultApprovalSession(res, approval.approvalToken, approval.email)

    return res
  } catch (error) {
    console.error("access_check error", error)
    return NextResponse.json(
      { ok: false, error: "Unable to verify approval." },
      { status: 500 }
    )
  }
}
