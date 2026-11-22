import { supabaseAdmin } from "@/lib/supabase-admin"
import { estateCaseHold, estateFacts, nameKey } from "@/lib/outreach-signals"

export const ESTATE_COLUMNS = "county,property_address,property_value,property_value_source,raw_payload,staging_status"
type EstateRow = Parameters<typeof estateFacts>[0] & { staging_status: string }

export function estateKey(row: EstateRow): string | null {
  const notice = row.raw_payload?.court_notice as { docket?: string } | undefined
  return row.county && notice?.docket ? `${row.county.toLowerCase()}|${notice.docket}` : null
}

// Later observations can be staged separately from the ranked creditor notice.
export async function heldEstateCases(keys: (string | null)[]) {
  const byCounty = new Map<string, Set<string>>()
  for (const key of keys) {
    if (!key) continue
    const [county, docket] = key.split("|")
    if (!county || !docket) continue
    if (!byCounty.has(county)) byCounty.set(county, new Set())
    byCounty.get(county)!.add(docket)
  }
  const held = new Set<string>()
  for (const [county, docketSet] of byCounty) {
    const dockets = [...docketSet]
    for (let i = 0; i < dockets.length; i += 50) {
      for (let offset = 0; ; offset += 300) {
        const { data, error } = await supabaseAdmin!.from("homeowner_requests_staging")
          .select("docket:raw_payload->court_notice->>docket,review:raw_payload->probate_review,court:raw_payload->court_sale_review")
          .eq("county", county)
          .in("distress_type", ["PROBATE", "COURT_SALE", "PARTITION"])
          .in("raw_payload->court_notice->>docket", dockets.slice(i, i + 50))
          .order("id").range(offset, offset + 299)
        if (error) throw new Error(error.message)
        for (const row of data ?? []) {
          if (estateCaseHold({ probate_review: row.review, court_sale_review: row.court })) held.add(`${county}|${row.docket}`)
        }
        if ((data?.length ?? 0) < 300) break
      }
    }
  }
  return held
}

export async function estateDraftBlock(draft: { signal: string; staging_id: string; recipient_key: string;
  facts: { decedent?: string; docket?: string | null; address?: string; county?: string } | null }): Promise<string | null> {
  if (draft.signal !== "probate_notice") return null
  const { data, error } = await supabaseAdmin!.from("homeowner_requests_staging")
    .select(ESTATE_COLUMNS).eq("id", draft.staging_id).maybeSingle<EstateRow>()
  if (error || !data || data.staging_status === "rejected") return "Estate record unavailable for verification."
  const eligible = estateFacts(data)
  if (!eligible || !eligible.people.some(person => nameKey(person) === draft.recipient_key)
      || eligible.facts.decedent !== draft.facts?.decedent || eligible.facts.docket !== draft.facts?.docket
      || eligible.facts.county !== draft.facts?.county || eligible.facts.address !== draft.facts?.address) {
    return "Current estate, property or named attorney requires review."
  }
  const key = estateKey(data)
  return key && (await heldEstateCases([key])).has(key) ? "A related estate observation places this draft on hold." : null
}
