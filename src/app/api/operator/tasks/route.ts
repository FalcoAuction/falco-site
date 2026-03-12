import { NextRequest, NextResponse } from "next/server"
import { getAdminApprovalSecret } from "@/lib/admin-approval-secret"
import {
  completeOperatorTask,
  restoreOperatorTask,
  type OperatorTaskSection,
} from "@/lib/operator-tasks"

function isTaskSection(value: string): value is OperatorTaskSection {
  return ["intake", "approvals", "routing", "vault"].includes(value)
}

export async function POST(req: NextRequest) {
  try {
    const adminApprovalSecret = getAdminApprovalSecret()
    const body = await req.json()
    const secret = String(body?.secret ?? "").trim()
    const action = String(body?.action ?? "").trim()

    if (!secret || secret !== adminApprovalSecret) {
      return NextResponse.json(
        { ok: false, error: "Unauthorized task request." },
        { status: 401 }
      )
    }

    if (action === "restore") {
      const taskId = String(body?.taskId ?? "").trim()
      if (!taskId) {
        return NextResponse.json(
          { ok: false, error: "Task id is required." },
          { status: 400 }
        )
      }

      await restoreOperatorTask(taskId)
      return NextResponse.json({ ok: true })
    }

    if (action !== "complete") {
      return NextResponse.json(
        { ok: false, error: "Invalid task action." },
        { status: 400 }
      )
    }

    const taskId = String(body?.taskId ?? "").trim()
    const title = String(body?.title ?? "").trim()
    const detail = String(body?.detail ?? "").trim()
    const section = String(body?.section ?? "").trim()
    const completedBy = String(body?.completedBy ?? "FALCO Operator").trim() || "FALCO Operator"

    if (!taskId || !title || !isTaskSection(section)) {
      return NextResponse.json(
        { ok: false, error: "Task payload is incomplete." },
        { status: 400 }
      )
    }

    const record = await completeOperatorTask({
      taskId,
      title,
      detail,
      section,
      completedBy,
    })

    return NextResponse.json({ ok: true, record })
  } catch (error) {
    if (error instanceof Error && error.message === "Missing FALCO_APPROVAL_SECRET.") {
      return NextResponse.json(
        { ok: false, error: "Approval secret is not configured." },
        { status: 500 }
      )
    }

    console.error("operator_tasks error", error)
    return NextResponse.json(
      { ok: false, error: "Unable to update operator tasks." },
      { status: 500 }
    )
  }
}
