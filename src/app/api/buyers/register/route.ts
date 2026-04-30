import { NextRequest, NextResponse } from "next/server"
import { registerBuyer } from "@/lib/buyer-registrations"
import { guardPublicForm } from "@/lib/public-form-guard"

export const dynamic = "force-dynamic"

type Body = {
  email?: string
  fullName?: string
  phone?: string
  company?: string
  priceMin?: number | string | null
  priceMax?: number | string | null
  counties?: string
  propertyTypes?: string
  strategies?: string
  cashReady?: boolean
  fundingSource?: string
  closeSpeedDays?: number | string | null
  notes?: string
  referrer?: string
}

function toInt(v: number | string | null | undefined): number | null {
  if (v === null || v === undefined || v === "") return null
  const n = typeof v === "number" ? v : parseInt(String(v).replace(/[,$\s]/g, ""), 10)
  return Number.isFinite(n) ? n : null
}

export async function POST(req: NextRequest) {
  const guard = guardPublicForm(req, "buyer-register")
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

  const result = await registerBuyer({
    email: body.email ?? "",
    fullName: body.fullName ?? "",
    phone: body.phone,
    company: body.company,
    priceMin: toInt(body.priceMin),
    priceMax: toInt(body.priceMax),
    counties: body.counties,
    propertyTypes: body.propertyTypes,
    strategies: body.strategies,
    cashReady: Boolean(body.cashReady),
    fundingSource: body.fundingSource,
    closeSpeedDays: toInt(body.closeSpeedDays),
    notes: body.notes,
    referrer: body.referrer,
    ipAddress: ip,
    userAgent,
  })

  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 400 })
  }
  return NextResponse.json({
    ok: true,
    alreadyExisted: result.alreadyExisted,
    message: result.alreadyExisted
      ? "You're already on the list — updated your buy box."
      : "You're on the list. We'll email when TN inventory hits.",
  })
}
