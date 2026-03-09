import { NextRequest, NextResponse } from "next/server"
import { getVaultReadinessReport } from "@/lib/vault-readiness"
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
        { ok: false, error: "Unauthorized readiness request." },
        { status: 401 }
      )
    }

    const report = await getVaultReadinessReport()

    return NextResponse.json({
      ok: true,
      report,
    })
  } catch (error) {
    if (error instanceof Error && error.message === "Missing FALCO_APPROVAL_SECRET.") {
      return NextResponse.json(
        { ok: false, error: "Approval secret is not configured." },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { ok: false, error: "Unable to build vault readiness report." },
      { status: 500 }
    )
  }
}
