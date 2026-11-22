import "server-only"
import { supabaseAdmin } from "@/lib/supabase-admin"

const SOURCE = "nashville_codes"
type Candidate = { id: string; bot_source?: string | null }

// Only Metro IDs already selected by the caller reach the computed-field lookup.
export async function metroDispositions(rows: Candidate[]) {
  const ids = [...new Set(rows.filter(row => row.bot_source === SOURCE).map(row => row.id))]
  const dispositions = new Map(ids.map(id => [id, "unverified_case"]))
  if (!supabaseAdmin) return dispositions
  for (let offset = 0; offset < ids.length; offset += 80) {
    const { data, error } = await supabaseAdmin.from("homeowner_requests_staging")
      .select("id,nashville_code_disposition").eq("bot_source", SOURCE).in("id", ids.slice(offset, offset + 80))
    if (error) {
      console.error("Metro case disposition lookup failed", error.code)
      continue
    }
    for (const row of data ?? []) dispositions.set(row.id, row.nashville_code_disposition || "unverified_case")
  }
  return dispositions
}

export function metroHeld(dispositions: Map<string, string>, id: string) {
  return dispositions.has(id) && dispositions.get(id) !== "open"
}

export function metroLabel(disposition: string) {
  switch (disposition) {
    case "open": return "Open · qualifying code citation"
    case "done": return "Metro case marked DONE"
    case "closed": return "Metro case marked CLOSED"
    case "not_found": return "Case missing from Metro results"
    case "ambiguous_case": return "Conflicting Metro case records"
    case "identity_mismatch": return "Property identity requires review"
    case "unrecognized": return "Metro status requires review"
    case "condition_unverified": return "Qualifying property condition unverified"
    case "staging_rejected": return "Staging record rejected"
    default: return "Metro case verification pending"
  }
}
