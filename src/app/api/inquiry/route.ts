import { NextRequest, NextResponse } from "next/server"
import { submitGeneralInquiry } from "@/lib/inbound-forms"
import { guardPublicForm } from "@/lib/public-form-guard"

export const dynamic = "force-dynamic"

type Body = {
  email?: string
  fullName?: string
  phone?: string
  company?: string
  topic?: string
  message?: string
}

export async function POST(req: NextRequest) {
  const guard = guardPublicForm(req, "general-inquiry")
  if (guard) return guard
  let body: Body
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON." }, { status: 400 })
  }
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    null
  const userAgent = req.headers.get("user-agent") || null

  const result = await submitGeneralInquiry({
    email: body.email ?? "",
    fullName: body.fullName ?? "",
    phone: body.phone,
    company: body.company,
    topic: body.topic,
    message: body.message,
    ipAddress: ip,
    userAgent,
  })

  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 400 })
  }
  return NextResponse.json({ ok: true, message: result.message })
}
