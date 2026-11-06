// Resend webhook: bounces and spam complaints suppress the address for all
// future outreach and mark the send. Register this URL in Resend
// (Webhooks, events email.bounced + email.complained) and set
// RESEND_WEBHOOK_SECRET to its signing secret (whsec_...).

import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase-admin"
import { normalizeEmail, verifySvix, webhookOutcome } from "@/lib/outreach"

export const dynamic = "force-dynamic"

export async function POST(req: NextRequest) {
  const body = await req.text()
  const ok = verifySvix(body, {
    id: req.headers.get("svix-id"), timestamp: req.headers.get("svix-timestamp"), signature: req.headers.get("svix-signature"),
  }, process.env.RESEND_WEBHOOK_SECRET)
  if (!ok) return NextResponse.json({ error: "bad signature" }, { status: 401 })
  let event: { type?: string; data?: { email_id?: string; to?: string[] | string } }
  try {
    event = JSON.parse(body)
  } catch {
    return NextResponse.json({ error: "bad json" }, { status: 400 })
  }
  const outcome = webhookOutcome(String(event.type ?? ""))
  if (!outcome) return NextResponse.json({ ok: true, ignored: event.type })
  if (!supabaseAdmin) return NextResponse.json({ error: "db not configured" }, { status: 500 })
  const to = Array.isArray(event.data?.to) ? event.data?.to : [event.data?.to]
  const emails = to.map((e) => normalizeEmail(e)).filter((e): e is string => !!e)
  if (emails.length) {
    // A complaint outranks an earlier bounce or unsubscribe reason.
    const { error } = await supabaseAdmin.from("outreach_suppressions")
      .upsert(emails.map((email) => ({ email, reason: outcome.reason, source: "resend_webhook" })),
        { onConflict: "email", ignoreDuplicates: outcome.reason !== "complaint" })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }
  if (event.data?.email_id) {
    await supabaseAdmin.from("outreach_sends").update({ status: outcome.status }).eq("provider_id", event.data.email_id)
  }
  return NextResponse.json({ ok: true })
}
