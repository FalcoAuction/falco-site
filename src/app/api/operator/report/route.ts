import { NextRequest, NextResponse } from "next/server"
import { getOperatorReport } from "@/lib/operator-report"

const ADMIN_APPROVAL_SECRET = process.env.FALCO_APPROVAL_SECRET || "falco-admin-local"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const secret = String(body?.secret ?? "").trim()

    if (!secret) {
      return NextResponse.json(
        { ok: false, error: "Approval secret is required." },
        { status: 400 }
      )
    }

    if (secret !== ADMIN_APPROVAL_SECRET) {
      return NextResponse.json(
        { ok: false, error: "Unauthorized operator request." },
        { status: 401 }
      )
    }

    const report = await getOperatorReport()
    return NextResponse.json({ ok: true, report })
  } catch (error) {
    console.error("operator_report error", error)
    return NextResponse.json(
      { ok: false, error: "Unable to build operator report." },
      { status: 500 }
    )
  }
}
