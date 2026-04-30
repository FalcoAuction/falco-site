import { NextRequest, NextResponse } from "next/server"
import { submitHomeownerRequest } from "@/lib/inbound-forms"
import { guardPublicForm } from "@/lib/public-form-guard"

export const dynamic = "force-dynamic"

type Body = {
  email?: string
  fullName?: string
  phone?: string
  propertyAddress?: string
  county?: string
  trusteeSaleDate?: string | null
  mortgageBalance?: number | string | null
  bestCallback?: string
  situationNotes?: string
  referrer?: string
}

function toInt(v: number | string | null | undefined): number | null {
  if (v === null || v === undefined || v === "") return null
  const n = typeof v === "number" ? v : parseInt(String(v).replace(/[,$\s]/g, ""), 10)
  return Number.isFinite(n) ? n : null
}

export async function POST(req: NextRequest) {
  const guard = guardPublicForm(req, "homeowner-request")
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

  const result = await submitHomeownerRequest({
    email: body.email ?? "",
    fullName: body.fullName ?? "",
    phone: body.phone,
    propertyAddress: body.propertyAddress,
    county: body.county,
    trusteeSaleDate: body.trusteeSaleDate || null,
    mortgageBalance: toInt(body.mortgageBalance),
    bestCallback: body.bestCallback,
    situationNotes: body.situationNotes,
    referrer: body.referrer,
    ipAddress: ip,
    userAgent,
  })

  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 400 })
  }
  return NextResponse.json({ ok: true, alreadyExisted: result.alreadyExisted, message: result.message })
}
