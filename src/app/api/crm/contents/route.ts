// PATCH /api/crm/contents: save the contents checklist an operator fills in
// on a call (vehicles, boats, guns, collections, equipment) into
// raw_payload.operator_contents on the staging row. Bots never write that
// key. Bots do rewrite raw_payload whole after reading it, so a bot run that
// overlaps a save could drop the key; the plain-text copy logged to the
// activity timeline is the record that cannot be lost. Admin only.

import { NextRequest, NextResponse } from "next/server"
import { getAdminSession } from "@/lib/admin-session"
import { supabaseAdmin } from "@/lib/supabase-admin"
import { rankedCodeCaseIds } from "@/lib/chattanooga-research"
import { recordActivity } from "@/lib/dialer-data"
import type { OperatorContents } from "@/lib/crm-data"

const TEXT_FIELDS = ["vehicles", "boats_rvs", "coins_jewelry_art", "tractors_equipment", "other"] as const
const LABELS: Record<(typeof TEXT_FIELDS)[number], string> = {
  vehicles: "Vehicles", boats_rvs: "Boats/RVs", coins_jewelry_art: "Coins/jewelry/art",
  tractors_equipment: "Tractors/equipment", other: "Other",
}

function num(v: unknown, max: number): number | null {
  if (v === null || v === undefined || v === "") return null
  const n = Number(String(v).replace(/[$,\s]/g, ""))
  return Number.isFinite(n) && n >= 0 && n <= max ? Math.round(n) : NaN
}

export async function PATCH(req: NextRequest) {
  if (!getAdminSession(req)) return NextResponse.json({ error: "Not authenticated." }, { status: 401 })
  if (!supabaseAdmin) return NextResponse.json({ error: "Database not configured." }, { status: 500 })
  let body: Record<string, unknown>
  try { body = await req.json() } catch { return NextResponse.json({ error: "Invalid JSON." }, { status: 400 }) }
  const id = String(body.id ?? "")
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: "Invalid id." }, { status: 400 })

  const firearmsCount = num(body.firearms_count, 10_000)
  const estValue = num(body.est_value, 100_000_000)
  if (Number.isNaN(firearmsCount)) return NextResponse.json({ error: "Firearms count must be a whole number." }, { status: 400 })
  if (Number.isNaN(estValue)) return NextResponse.json({ error: "Estimated value must be a dollar amount." }, { status: 400 })
  const contents: OperatorContents = {
    vehicles: "", boats_rvs: "", coins_jewelry_art: "", tractors_equipment: "", other: "",
    firearms_count: firearmsCount, firearms_collection: body.firearms_collection === true,
    est_value: estValue, updated_at: new Date().toISOString(), updated_by: "patrick",
  }
  for (const f of TEXT_FIELDS) contents[f] = String(body[f] ?? "").trim().slice(0, 1000)

  // Re-read right before writing and change only our key, so tags the bots
  // wrote since the page loaded are kept.
  const cur = await supabaseAdmin.from("homeowner_requests_staging").select("bot_source,raw_payload,pipeline_lead_key").eq("id", id).maybeSingle()
  if (cur.error) return NextResponse.json({ error: cur.error.message }, { status: 500 })
  if (!cur.data) return NextResponse.json({ error: "Lead not found." }, { status: 404 })
  if (cur.data.bot_source === "church_closure") return NextResponse.json({ error: "Church closure records are research only." }, { status: 409 })
  if (cur.data.bot_source === "knoxville_poh") {
    // A hearing record on the current ranked snapshot is a serious case and can be worked.
    let ranked: Set<string>
    try { ranked = await rankedCodeCaseIds() } catch { return NextResponse.json({ error: "Unable to verify lead source." }, { status: 503 }) }
    if (!ranked.has(id)) return NextResponse.json({ error: "Knoxville hearing records are research only." }, { status: 409 })
  }
  const raw = cur.data.raw_payload
  if (raw !== null && (typeof raw !== "object" || Array.isArray(raw))) {
    return NextResponse.json({ error: "This lead's payload is not an object; not overwriting it." }, { status: 409 })
  }
  const next = { ...((raw as Record<string, unknown> | null) ?? {}), operator_contents: contents }
  const up = await supabaseAdmin.from("homeowner_requests_staging").update({ raw_payload: next }).eq("id", id)
  if (up.error) return NextResponse.json({ error: up.error.message }, { status: 500 })

  const slug = cur.data.pipeline_lead_key as string | null
  if (slug) {
    const lines = [
      ...TEXT_FIELDS.filter((f) => contents[f]).map((f) => `${LABELS[f]}: ${contents[f]}`),
      contents.firearms_count !== null || contents.firearms_collection
        ? `Firearms: ${contents.firearms_count ?? "?"}${contents.firearms_collection ? " (collection)" : ""}` : "",
      contents.est_value !== null ? `Est. contents value: $${contents.est_value.toLocaleString("en-US")}` : "",
    ].filter(Boolean)
    await recordActivity({
      listingSlug: slug, channel: "note", outcome: "note_only",
      notes: `Contents checklist\n${lines.join("\n") || "Nothing of note."}`.slice(0, 4000),
      // nextAction / nextActionAt left out on purpose: passing null clears a scheduled follow-up.
      createdBy: "patrick",
    })
  }
  return NextResponse.json({ ok: true })
}
