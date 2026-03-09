import { NextRequest, NextResponse } from "next/server"
import { listAccessRequests } from "@/lib/access-workflow"
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
        { ok: false, error: "Unauthorized queue request." },
        { status: 401 }
      )
    }

    const requests = await listAccessRequests()
    return NextResponse.json({ ok: true, requests })
  } catch (error) {
    if (error instanceof Error && error.message === "Missing FALCO_APPROVAL_SECRET.") {
      return NextResponse.json(
        { ok: false, error: "Approval secret is not configured." },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { ok: false, error: "Unable to load access queue." },
      { status: 500 }
    )
  }
}
