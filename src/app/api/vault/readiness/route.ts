import { NextRequest, NextResponse } from "next/server"
import { getVaultReadinessReport } from "@/lib/vault-readiness"

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
        { ok: false, error: "Unauthorized readiness request." },
        { status: 401 }
      )
    }

    const report = await getVaultReadinessReport()

    return NextResponse.json({
      ok: true,
      report,
    })
  } catch {
    return NextResponse.json(
      { ok: false, error: "Unable to build vault readiness report." },
      { status: 500 }
    )
  }
}
