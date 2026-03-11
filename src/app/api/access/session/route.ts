import { NextRequest, NextResponse } from "next/server"
import { clearVaultApprovalSession, getVaultApprovalSession } from "@/lib/vault-access-session"

export async function GET(req: NextRequest) {
  try {
    const approval = await getVaultApprovalSession(req)
    if (!approval) {
      const res = NextResponse.json({ ok: true, approved: false })
      clearVaultApprovalSession(res)
      return res
    }

    return NextResponse.json({
      ok: true,
      approved: true,
      email: approval.email,
      approvedAt: approval.approvedAt,
      requestId: approval.requestId,
    })
  } catch (error) {
    console.error("access_session error", error)
    return NextResponse.json(
      { ok: false, error: "Unable to load vault approval session." },
      { status: 500 }
    )
  }
}
