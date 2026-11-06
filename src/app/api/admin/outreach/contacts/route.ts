// Import outreach contacts. Admin-gated.
// POST JSON { rows: [...], kind?, source? }  or  text/csv body with
// ?kind=&source= query params. Columns: kind, org_name, person_name, title,
// email, phone, mail_line1, mail_line2, mail_city, mail_state, mail_zip,
// county, source, source_ref; anything else is kept in meta.
// Rows with source_ref upsert on (source, source_ref); rows with only an
// email upsert on email. Rows with neither are inserted.

import { NextRequest, NextResponse } from "next/server"
import { getAdminSession } from "@/lib/admin-session"
import { supabaseAdmin } from "@/lib/supabase-admin"
import { parseCsv, toContactRow, type ContactRow } from "@/lib/outreach"

export const dynamic = "force-dynamic"

export async function POST(req: NextRequest) {
  if (!getAdminSession(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  if (!supabaseAdmin) return NextResponse.json({ error: "db not configured" }, { status: 500 })
  const url = new URL(req.url)
  let raw: Record<string, unknown>[]
  let defaults = { kind: url.searchParams.get("kind") ?? undefined, source: url.searchParams.get("source") ?? undefined }
  try {
    if ((req.headers.get("content-type") ?? "").includes("text/csv")) {
      raw = parseCsv(await req.text())
    } else {
      const body = await req.json()
      raw = Array.isArray(body?.rows) ? body.rows : []
      defaults = { kind: body?.kind ?? defaults.kind, source: body?.source ?? defaults.source }
    }
  } catch {
    return NextResponse.json({ error: "bad body" }, { status: 400 })
  }
  if (raw.length === 0 || raw.length > 5000) return NextResponse.json({ error: "send 1 to 5000 rows" }, { status: 400 })

  const errors: { row: number; error: string }[] = []
  const bySource: ContactRow[] = [], byEmail: ContactRow[] = [], plain: ContactRow[] = []
  raw.forEach((r, i) => {
    const row = toContactRow(r, defaults)
    if (typeof row === "string") errors.push({ row: i + 1, error: row })
    else (row.source_ref ? bySource : row.email ? byEmail : plain).push(row)
  })
  const now = new Date().toISOString()
  const stamp = (rows: ContactRow[]) => rows.map((r) => ({ ...r, updated_at: now }))
  let written = 0
  for (const [rows, onConflict] of [[bySource, "source,source_ref"], [byEmail, "email"], [plain, null]] as const) {
    if (rows.length === 0) continue
    const q = onConflict
      ? supabaseAdmin.from("outreach_contacts").upsert(stamp(rows), { onConflict })
      : supabaseAdmin.from("outreach_contacts").insert(stamp(rows))
    const { error } = await q
    if (error) errors.push({ row: 0, error: `${onConflict ?? "insert"}: ${error.message}` })
    else written += rows.length
  }
  return NextResponse.json({ ok: errors.length === 0, written, errors })
}
