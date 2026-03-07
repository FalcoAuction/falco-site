import { NextRequest, NextResponse } from "next/server"
import { findApprovalByEmail } from "@/lib/access-workflow"

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

    const approval = findApprovalByEmail(email)

    if (!approval) {
      return NextResponse.json(
        { ok: false, approved: false, error: "Email is not approved for vault access." },
        { status: 403 }
      )
    }

    const res = NextResponse.json({
      ok: true,
      approved: true,
      email: approval.email,
      approvedAt: approval.approvedAt,
    })

    res.cookies.set("falco_vault_approved_email", approval.email, {
      httpOnly: false,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    })

    return res
  } catch {
    return NextResponse.json(
      { ok: false, error: "Unable to verify approval." },
      { status: 500 }
    )
  }
}