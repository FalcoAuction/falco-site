// POST /api/sms/consent
//
// Public endpoint behind the /sms-consent opt-in form. Records an
// explicit SMS consent event: phone, name, the exact consent language
// shown at capture, IP, and user agent. This is the audit trail the
// A2P registration references.
//
// No auth (public form). Honeypot field + basic validation as the
// abuse guard; volume here will be tiny and human.

import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase-admin"

export const dynamic = "force-dynamic"

export async function POST(req: NextRequest) {
  if (!supabaseAdmin) {
    return NextResponse.json({ error: "Unavailable." }, { status: 503 })
  }

  let body: {
    name?: string
    phone?: string
    property?: string
    consent?: boolean
    consent_text?: string
    website?: string // honeypot — humans never fill this
  }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 })
  }

  if ((body.website || "").trim() !== "") {
    // Honeypot tripped — pretend success, store nothing.
    return NextResponse.json({ ok: true })
  }

  const digits = (body.phone || "").replace(/\D/g, "").replace(/^1(?=\d{10}$)/, "")
  const name = (body.name || "").trim()
  if (digits.length !== 10) {
    return NextResponse.json(
      { error: "Please enter a valid 10-digit US phone number." },
      { status: 400 }
    )
  }
  if (!name) {
    return NextResponse.json({ error: "Please enter your name." }, { status: 400 })
  }
  if (body.consent !== true) {
    return NextResponse.json(
      { error: "The consent box must be checked to opt in." },
      { status: 400 }
    )
  }

  const ip =
    (req.headers.get("x-forwarded-for") || "").split(",")[0].trim() ||
    req.headers.get("x-real-ip") ||
    ""

  const { error } = await supabaseAdmin.from("sms_consents").insert({
    phone: `+1${digits}`,
    full_name: name.slice(0, 120),
    property_address: (body.property || "").trim().slice(0, 200),
    method: "web_form",
    consent_text: (body.consent_text || "").slice(0, 600),
    ip: String(ip).slice(0, 60),
    user_agent: (req.headers.get("user-agent") || "").slice(0, 250),
  })
  if (error) {
    console.error("sms_consents insert:", error.message)
    return NextResponse.json({ error: "Something went wrong. Try again." }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
