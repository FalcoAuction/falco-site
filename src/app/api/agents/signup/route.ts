import { NextRequest, NextResponse } from "next/server"
import { submitAgentSignup } from "@/lib/inbound-forms"
import { guardPublicForm } from "@/lib/public-form-guard"

export const dynamic = "force-dynamic"

type Body = {
  email?: string
  fullName?: string
  phone?: string
  licenseNumber?: string
  brokerage?: string
  principalBroker?: string
  inventory?: unknown
  propertyAddress?: string
  notes?: string
}

export async function POST(req: NextRequest) {
  const guard = guardPublicForm(req, "agent-signup")
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

  const result = await submitAgentSignup({
    email: body.email ?? "",
    fullName: body.fullName ?? "",
    phone: body.phone,
    licenseNumber: body.licenseNumber,
    brokerage: body.brokerage,
    principalBroker: body.principalBroker,
    inventory: Array.isArray(body.inventory) ? body.inventory.map(String) : [],
    propertyAddress: body.propertyAddress,
    notes: body.notes,
    ipAddress: ip,
    userAgent,
  })

  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 400 })
  }
  return NextResponse.json({ ok: true, message: result.message })
}
