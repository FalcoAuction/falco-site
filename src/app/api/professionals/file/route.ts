import { NextRequest, NextResponse } from "next/server"
import { submitProfessionalFile } from "@/lib/inbound-forms"
import { guardPublicForm } from "@/lib/public-form-guard"

export const dynamic = "force-dynamic"

type Body = {
  role?: string
  matter?: string
  assets?: unknown
  location?: string
  caseNumber?: string
  deadline?: string | null
  fullName?: string
  firm?: string
  email?: string
  phone?: string
  notes?: string
}

export async function POST(req: NextRequest) {
  const guard = guardPublicForm(req, "professional-file")
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

  const result = await submitProfessionalFile({
    role: body.role,
    matter: body.matter,
    assets: Array.isArray(body.assets) ? body.assets.map(String) : [],
    location: body.location,
    caseNumber: body.caseNumber,
    deadline: body.deadline ?? null,
    fullName: body.fullName ?? "",
    firm: body.firm,
    email: body.email ?? "",
    phone: body.phone,
    notes: body.notes,
    ipAddress: ip,
    userAgent,
  })

  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 400 })
  }
  return NextResponse.json({ ok: true, message: result.message })
}
