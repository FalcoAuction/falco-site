import "server-only"
import { createHash } from "node:crypto"
import { supabaseAdmin } from "@/lib/supabase-admin"

type RecordFields = Record<string, unknown>
function fields(value: unknown): RecordFields {
  return value && typeof value === "object" && !Array.isArray(value) ? value as RecordFields : {}
}

export function mtJulietEvidence(row: RecordFields) {
  const raw = fields(row.raw_payload)
  const r = fields(row.mt_review ?? raw.mt_juliet_issue_review)
  const issue = fields(raw.issue).id
  const url = "https://seeclickfix.com/issues/" + issue
  const checked = String(r.checked_on ?? "")
  const age = Date.now() - Date.parse(checked + "T00:00:00Z")
  const key = createHash("sha1").update("mtn_cities_codes|MJ-SCF-" + issue).digest("hex")
  if (row.bot_source !== "mtn_cities_codes" || row.county !== "Wilson County" || row.staging_status === "rejected" ||
      !Number.isSafeInteger(issue) || row.pipeline_lead_key !== key || r.issue_id !== issue || r.source_url !== url ||
      r.finding !== "reported_building_condition" || r.organization !== "Mt. Juliet, TN - Codes Enforcement" ||
      !["Open","Acknowledged"].includes(String(r.status)) || typeof r.condition_excerpt !== "string" || !r.condition_excerpt ||
      typeof r.reported_address !== "string" || typeof r.reported_on !== "string" || !(age >= 0 && age < 4 * 86400000)) return null
  return { issue: Number(issue), url, checked, reported: r.reported_on, status: String(r.status), condition: r.condition_excerpt, address: r.reported_address }
}

export async function listMtJulietResearch() {
  if (!supabaseAdmin) throw new Error("Database unavailable")
  const rows = []
  let cursor = ""
  for (;;) {
    let query = supabaseAdmin.from("homeowner_requests_staging")
      .select("id,pipeline_lead_key,county,staging_status,bot_source,raw_payload,mt_review:phone_metadata->mt_juliet_issue_review")
      .eq("bot_source", "mtn_cities_codes").order("id").limit(100)
    if (cursor) query = query.gt("id", cursor)
    const { data, error } = await query
    if (error) throw new Error("Unable to read Mt. Juliet complaints")
    for (const row of data ?? []) {
      const evidence = mtJulietEvidence(row)
      if (evidence) rows.push({ id: row.id, evidence })
    }
    if (!data || data.length < 100) break
    cursor = data[data.length - 1].id
  }
  return rows.sort((a,b) => b.evidence.reported.localeCompare(a.evidence.reported))
}
