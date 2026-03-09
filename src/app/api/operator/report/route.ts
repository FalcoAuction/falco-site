import { NextRequest, NextResponse } from "next/server"
import { getOperatorReport } from "@/lib/operator-report"
import { getAdminApprovalSecret } from "@/lib/admin-approval-secret"

export async function POST(req: NextRequest) {
  try {
    const adminApprovalSecret = getAdminApprovalSecret()
    const body = await req.json()
    const secret = String(body?.secret ?? "").trim()

    if (!secret) {
      return NextResponse.json(
        { ok: false, error: "Approval secret is required." },
        { status: 400 }
      )
    }

    if (secret !== adminApprovalSecret) {
      return NextResponse.json(
        { ok: false, error: "Unauthorized operator request." },
        { status: 401 }
      )
    }

    const report = await getOperatorReport()
    return NextResponse.json({ ok: true, report })
  } catch (error) {
    if (error instanceof Error && error.message === "Missing FALCO_APPROVAL_SECRET.") {
      return NextResponse.json(
        { ok: false, error: "Approval secret is not configured." },
        { status: 500 }
      )
    }

    console.error("operator_report error", error)
    return NextResponse.json(
      { ok: false, error: "Unable to build operator report." },
      { status: 500 }
    )
  }
}
