// PATCH /api/crm/contact: fill in a contact's person, title, email or phone
// (bank and attorney decision-makers are sourced by hand). Admin only.

import { NextRequest, NextResponse } from "next/server"
import { getAdminSession } from "@/lib/admin-session"
import { supabaseAdmin } from "@/lib/supabase-admin"
import { normalizeEmail } from "@/lib/outreach"

export async function PATCH(req: NextRequest) {
  if (!getAdminSession(req)) return NextResponse.json({ error: "Not authenticated." }, { status: 401 })
  if (!supabaseAdmin) return NextResponse.json({ error: "Database not configured." }, { status: 500 })
  let body: Record<string, unknown>
  try { body = await req.json() } catch { return NextResponse.json({ error: "Invalid JSON." }, { status: 400 }) }
  const id = String(body.id ?? "")
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: "Invalid id." }, { status: 400 })
  const text = (k: string) => {
    const v = String(body[k] ?? "").trim().slice(0, 200)
    return v || null
  }
  const rawEmail = text("email")
  const email = rawEmail ? normalizeEmail(rawEmail) : null
  if (rawEmail && !email) return NextResponse.json({ error: "That email address is not valid." }, { status: 400 })
  const { error } = await supabaseAdmin.from("outreach_contacts")
    .update({ person_name: text("person_name"), title: text("title"), email, phone: text("phone"), updated_at: new Date().toISOString() })
    .eq("id", id)
  if (error) {
    const dup = /duplicate|unique/i.test(error.message)
    return NextResponse.json({ error: dup ? "Another contact already has that email." : error.message }, { status: dup ? 409 : 500 })
  }
  return NextResponse.json({ ok: true })
}
