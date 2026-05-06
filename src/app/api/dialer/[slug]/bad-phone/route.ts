// POST /api/dialer/[slug]/bad-phone
// DELETE /api/dialer/[slug]/bad-phone?phone=...
//
// Caller feedback loop. When the caller marks a phone bad on a lead, we
// record it cross-lead so it never gets surfaced anywhere again. Catches:
//   - Disconnected numbers
//   - Wrong-person numbers (number reassigned to someone else)
//   - Voicemail-only numbers (homeowner doesn't pick up)
//   - DNC requests
//   - Junk fallback numbers (BatchData glitches)
//
// Auth: dialer/operator session.

import { NextRequest, NextResponse } from "next/server"
import { getDialerOrOperatorSession } from "@/lib/dialer-session"
import { supabaseAdmin } from "@/lib/supabase-admin"

export const dynamic = "force-dynamic"

const VALID_REASONS = new Set([
  "disconnected",
  "wrong_person",
  "voicemail_only",
  "do_not_call",
  "other",
])

function normalizePhone(raw: string): string {
  const d = String(raw).replace(/\D/g, "")
  if (d.length === 11 && d.startsWith("1")) return d.slice(1)
  return d
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const session = getDialerOrOperatorSession(req)
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }
  if (!supabaseAdmin) {
    return NextResponse.json({ error: "db not configured" }, { status: 500 })
  }
  const { slug } = await params
  let body: { phone?: string; reason?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "bad json" }, { status: 400 })
  }
  const phone = normalizePhone(body.phone || "")
  if (!phone || phone.length < 10) {
    return NextResponse.json({ error: "phone required (10+ digits)" }, { status: 400 })
  }
  const reason = (body.reason || "other").toLowerCase()
  if (!VALID_REASONS.has(reason)) {
    return NextResponse.json(
      { error: `reason must be one of: ${[...VALID_REASONS].join(", ")}` },
      { status: 400 }
    )
  }

  const { error } = await supabaseAdmin
    .from("dialer_bad_phones")
    .insert({
      phone,
      reason,
      reported_by: session.caller || "caller",
      listing_slug: slug,
    })
    .select()
  // Conflict on (phone, reason) is fine — already flagged
  if (error && !error.message.includes("duplicate key")) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, phone, reason })
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  void params
  const session = getDialerOrOperatorSession(req)
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }
  if (!supabaseAdmin) {
    return NextResponse.json({ error: "db not configured" }, { status: 500 })
  }
  const phoneParam = req.nextUrl.searchParams.get("phone")
  if (!phoneParam) {
    return NextResponse.json({ error: "phone query required" }, { status: 400 })
  }
  const phone = normalizePhone(phoneParam)
  const { error } = await supabaseAdmin
    .from("dialer_bad_phones")
    .delete()
    .eq("phone", phone)
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ ok: true, phone })
}
