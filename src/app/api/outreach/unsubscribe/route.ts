// Unsubscribe from all FALCO outreach. Public; the signed token is the
// authorization. POST handles both the /unsubscribe confirm form
// (form field t) and RFC 8058 one-click (mail clients POST
// "List-Unsubscribe=One-Click" to the URL carrying ?t=).

import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase-admin"
import { siteUrl, verifyUnsubscribeToken } from "@/lib/outreach"

export const dynamic = "force-dynamic"

export async function POST(req: NextRequest) {
  let token = new URL(req.url).searchParams.get("t")
  const form = await req.formData().catch(() => null)
  const fromForm = form?.get("t")
  if (typeof fromForm === "string" && fromForm) token = fromForm
  let email: string | null = null
  try {
    email = verifyUnsubscribeToken(token, process.env)
  } catch {
    return NextResponse.json({ error: "unsubscribe not configured" }, { status: 500 })
  }
  if (!email) return NextResponse.json({ error: "invalid link" }, { status: 400 })
  if (!supabaseAdmin) return NextResponse.json({ error: "db not configured" }, { status: 500 })
  // Keep the first reason (a complaint stays a complaint).
  const { error } = await supabaseAdmin.from("outreach_suppressions")
    .upsert({ email, reason: "unsubscribe", source: typeof fromForm === "string" ? "page" : "one_click" }, { onConflict: "email", ignoreDuplicates: true })
  if (error) return NextResponse.json({ error: "could not save, try again" }, { status: 500 })
  if (typeof fromForm === "string") return NextResponse.redirect(`${siteUrl(process.env)}/unsubscribe?done=1`, 303)
  return NextResponse.json({ ok: true })
}
