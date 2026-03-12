import { NextRequest, NextResponse } from "next/server"
import { getAdminApprovalSecret } from "@/lib/admin-approval-secret"
import {
  clearOperatorIntakeDecision,
  recordOperatorIntakeDecision,
  type OperatorIntakeDecision,
} from "@/lib/operator-intake"

function isDecision(value: string): value is OperatorIntakeDecision {
  return ["promote", "hold", "needs_more_info"].includes(value)
}

export async function POST(req: NextRequest) {
  try {
    const adminApprovalSecret = getAdminApprovalSecret()
    const body = await req.json()
    const secret = String(body?.secret ?? "").trim()
    const action = String(body?.action ?? "").trim()

    if (!secret || secret !== adminApprovalSecret) {
      return NextResponse.json(
        { ok: false, error: "Unauthorized intake request." },
        { status: 401 }
      )
    }

    const leadKey = String(body?.leadKey ?? "").trim()
    if (!leadKey) {
      return NextResponse.json(
        { ok: false, error: "Lead key is required." },
        { status: 400 }
      )
    }

    if (action === "clear") {
      await clearOperatorIntakeDecision(leadKey)
      return NextResponse.json({ ok: true })
    }

    if (action !== "record") {
      return NextResponse.json(
        { ok: false, error: "Invalid intake action." },
        { status: 400 }
      )
    }

    const decision = String(body?.decision ?? "").trim()
    if (!isDecision(decision)) {
      return NextResponse.json(
        { ok: false, error: "Decision is required." },
        { status: 400 }
      )
    }

    const actedBy = String(body?.actedBy ?? "FALCO Operator").trim() || "FALCO Operator"
    const note = String(body?.note ?? "").trim()

    const record = await recordOperatorIntakeDecision({
      leadKey,
      decision,
      note,
      actedBy,
    })

    return NextResponse.json({ ok: true, record })
  } catch (error) {
    if (error instanceof Error && error.message === "Missing FALCO_APPROVAL_SECRET.") {
      return NextResponse.json(
        { ok: false, error: "Approval secret is not configured." },
        { status: 500 }
      )
    }

    console.error("operator_intake error", error)
    return NextResponse.json(
      { ok: false, error: "Unable to record intake review." },
      { status: 500 }
    )
  }
}
