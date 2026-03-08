import { NextRequest, NextResponse } from "next/server"
import { createAccessRequest } from "@/lib/access-workflow"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    const fullName = String(body?.fullName ?? "").trim()
    const email = String(body?.email ?? "").trim().toLowerCase()
    const company = String(body?.company ?? "").trim()
    const role = String(body?.role ?? "").trim()
    const marketFocus = String(body?.marketFocus ?? "").trim()
    const accessType = String(body?.accessType ?? "").trim()
    const executionCapacity = String(body?.executionCapacity ?? "").trim()
    const notes = String(body?.notes ?? "").trim()

    if (!fullName || !email || !role || !accessType) {
      return NextResponse.json(
        { ok: false, error: "Missing required fields." },
        { status: 400 }
      )
    }

    const forwardedFor = req.headers.get("x-forwarded-for") ?? ""
    const ipAddress = forwardedFor.split(",")[0]?.trim() || "unknown"
    const userAgent = req.headers.get("user-agent") ?? "unknown"

    const record = await createAccessRequest({
      fullName,
      email,
      company,
      role,
      marketFocus,
      accessType,
      executionCapacity,
      notes,
      ipAddress,
      userAgent,
    })

    return NextResponse.json({
      ok: true,
      requestId: record.requestId,
      status: record.status,
    })
  } catch {
    return NextResponse.json(
      { ok: false, error: "Unable to create access request." },
      { status: 500 }
    )
  }
}