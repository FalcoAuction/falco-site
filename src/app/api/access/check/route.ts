import { NextRequest, NextResponse } from "next/server"
import { findApprovalByEmail } from "@/lib/access-workflow"

const COOKIE_IS_SECURE = process.env.NODE_ENV === "production"

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

    const approval = await findApprovalByEmail(email)

    if (!approval) {
      console.warn("access_check denied_unapproved_email", { email })
      return NextResponse.json(
        { ok: false, error: "Unable to verify vault access." },
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
      secure: COOKIE_IS_SECURE,
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    })

    return res
  } catch (error) {
    console.error("access_check error", error)
    return NextResponse.json(
      { ok: false, error: "Unable to verify approval." },
      { status: 500 }
    )
  }
}
