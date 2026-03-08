import { NextRequest, NextResponse } from "next/server"
import {
  approveAccessRequest,
  rejectAccessRequest,
} from "@/lib/access-workflow"

const ADMIN_APPROVAL_SECRET = process.env.FALCO_APPROVAL_SECRET || "falco-admin-local"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    const requestId = String(body?.requestId ?? "").trim()
    const approvedBy = String(body?.approvedBy ?? "").trim() || "FALCO Admin"
    const secret = String(body?.secret ?? "").trim()
    const action = String(body?.action ?? "approve").trim().toLowerCase()

    if (!requestId || !secret) {
      return NextResponse.json(
        { ok: false, error: "Missing required fields." },
        { status: 400 }
      )
    }

    if (secret !== ADMIN_APPROVAL_SECRET) {
      return NextResponse.json(
        { ok: false, error: "Unauthorized approval request." },
        { status: 401 }
      )
    }

    if (action === "reject") {
      const rejected = await rejectAccessRequest(requestId)

      if (!rejected) {
        return NextResponse.json(
          { ok: false, error: "Request not found." },
          { status: 404 }
        )
      }

      return NextResponse.json({
        ok: true,
        action: "rejected",
        requestId: rejected.requestId,
        email: rejected.email,
      })
    }

    const approval = await approveAccessRequest(requestId, approvedBy)

    if (!approval) {
      return NextResponse.json(
        { ok: false, error: "Request not found." },
        { status: 404 }
      )
    }

    return NextResponse.json({
      ok: true,
      action: "approved",
      approvalToken: approval.approvalToken,
      email: approval.email,
      requestId: approval.requestId,
    })
  } catch {
    return NextResponse.json(
      { ok: false, error: "Unable to process access request." },
      { status: 500 }
    )
  }
}