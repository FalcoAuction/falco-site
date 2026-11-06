// Executor letters + estate property reports for matched probate estates.
//
//   GET  /api/admin/estate-letters            -> JSON: eligible estates (deduped by docket)
//   POST /api/admin/estate-letters            -> application/pdf, two pages per estate
//        body = { ids?: string[], county?: string, limit?: number, includeGenerated?: boolean }
//
// POST records raw_payload.estate_letter.generated_at on each row it prints,
// and by default skips estates already printed, so a re-run does not mail
// the same executor twice. Generated is not mailed; Patrick mails the batch.
//
// Admin-gated.

import { NextRequest, NextResponse } from "next/server"
import { getAdminSession } from "@/lib/admin-session"
import { supabaseAdmin } from "@/lib/supabase-admin"
import {
  ESTATE_LETTER_VERSION,
  dedupeEstates,
  estateFromStaging,
  type EstateLetter,
  type StagingRow,
} from "@/lib/estate-letters"
import { buildEstateLettersPdf } from "@/lib/estate-letter-pdf"

export const dynamic = "force-dynamic"
export const runtime = "nodejs" // pdfkit needs Node runtime

const COLUMNS = "id,county,property_address,property_value,property_value_source,staged_at,raw_payload"

async function eligible(): Promise<{ estates: EstateLetter[]; error?: string }> {
  if (!supabaseAdmin) return { estates: [], error: "db not configured" }
  const { data, error } = await supabaseAdmin
    .from("homeowner_requests_staging")
    .select(COLUMNS)
    .eq("bot_source", "court_notices")
    .eq("distress_type", "PROBATE")
    .gt("property_value", 0)
    .order("staged_at", { ascending: false })
    .limit(1000)
  if (error) return { estates: [], error: error.message }
  const estates = dedupeEstates(
    ((data || []) as unknown as StagingRow[]).map(estateFromStaging).filter((e): e is EstateLetter => !!e),
  )
  return { estates }
}

export async function GET(req: NextRequest) {
  if (!getAdminSession(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  const { estates, error } = await eligible()
  if (error) return NextResponse.json({ error }, { status: 500 })
  return NextResponse.json({
    version: ESTATE_LETTER_VERSION,
    total: estates.length,
    notYetGenerated: estates.filter((e) => !e.alreadyGenerated).length,
    estates: estates.map((e) => ({
      stagingId: e.stagingId,
      county: e.county,
      docket: e.docket,
      decedent: e.decedent,
      recipient: e.recipient.lines,
      careOfAttorney: e.recipient.careOfAttorney,
      property: e.property.address,
      appraisal: e.property.appraisal,
      alreadyGenerated: e.alreadyGenerated,
    })),
  })
}

export async function POST(req: NextRequest) {
  if (!getAdminSession(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  const body = (await req.json().catch(() => ({}))) as {
    ids?: unknown; county?: unknown; limit?: unknown; includeGenerated?: unknown
  }
  const ids = Array.isArray(body.ids) ? new Set(body.ids.filter((v): v is string => typeof v === "string")) : null
  const county = typeof body.county === "string" && body.county.trim() ? body.county.trim().toLowerCase() : null
  const limit = Math.min(Math.max(Number(body.limit) || 50, 1), 200)
  const includeGenerated = body.includeGenerated === true

  const { estates, error } = await eligible()
  if (error) return NextResponse.json({ error }, { status: 500 })
  const picked = estates
    .filter((e) => !ids || ids.has(e.stagingId))
    .filter((e) => !county || e.county.toLowerCase() === county)
    .filter((e) => includeGenerated || !e.alreadyGenerated)
    .slice(0, limit)
  if (!picked.length) return NextResponse.json({ error: "No eligible estates to print." }, { status: 404 })

  const pdf = await buildEstateLettersPdf(picked)

  // Record generation. Re-read raw_payload right before writing so a bot
  // update between the select and now is not overwritten.
  const generatedAt = new Date().toISOString()
  const failed: string[] = []
  for (const e of picked) {
    const { data } = await supabaseAdmin!
      .from("homeowner_requests_staging").select("raw_payload").eq("id", e.stagingId).maybeSingle()
    const raw = ((data as { raw_payload?: Record<string, unknown> } | null)?.raw_payload) || {}
    const { error: updErr } = await supabaseAdmin!
      .from("homeowner_requests_staging")
      .update({ raw_payload: { ...raw, estate_letter: { generated_at: generatedAt, version: ESTATE_LETTER_VERSION } } })
      .eq("id", e.stagingId)
    if (updErr) failed.push(e.stagingId)
  }

  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="falco-estate-letters-${generatedAt.slice(0, 10)}.pdf"`,
      "X-Estate-Letters": String(picked.length),
      "X-Estate-Letters-Unrecorded": String(failed.length),
    },
  })
}
