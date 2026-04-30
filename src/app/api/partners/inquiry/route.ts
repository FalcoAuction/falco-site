import { NextRequest, NextResponse } from "next/server"
import { submitPartnerInquiry } from "@/lib/inbound-forms"
import { guardPublicForm } from "@/lib/public-form-guard"

export const dynamic = "force-dynamic"

type Body = {
  email?: string
  fullName?: string
  company?: string
  phone?: string
  countyCoverage?: string
  dealsPerYear?: number | string | null
  yearsInBusiness?: number | string | null
  feeStructure?: string
  notes?: string
}

function toInt(v: number | string | null | undefined): number | null {
  if (v === null || v === undefined || v === "") return null
  const n = typeof v === "number" ? v : parseInt(String(v).replace(/[,$\s]/g, ""), 10)
  return Number.isFinite(n) ? n : null
}

export async function POST(req: NextRequest) {
  const guard = guardPublicForm(req, "partner-inquiry")
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

  const result = await submitPartnerInquiry({
    email: body.email ?? "",
    fullName: body.fullName ?? "",
    company: body.company,
    phone: body.phone,
    countyCoverage: body.countyCoverage,
    dealsPerYear: toInt(body.dealsPerYear),
    yearsInBusiness: toInt(body.yearsInBusiness),
    feeStructure: body.feeStructure,
    notes: body.notes,
    ipAddress: ip,
    userAgent,
  })

  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 400 })
  }
  return NextResponse.json({ ok: true, alreadyExisted: result.alreadyExisted, message: result.message })
}
