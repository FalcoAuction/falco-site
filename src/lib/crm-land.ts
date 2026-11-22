import "server-only"
import { cache } from "react"
import { supabaseAdmin } from "@/lib/supabase-admin"
import type { LaneTag, StagedBucket } from "@/lib/crm-data"
import { landEvidence, landParcelKey } from "@/lib/land-evidence"

// JSON is projected only for previously identified staging primary keys.
export const LAND_FIELDS = "bot_source,distress_type,staging_status,county,owner_name_records,lane:raw_payload->property_lane,land:raw_payload->land,roll:raw_payload->comptroller_parcel,origin:raw_payload->>source"

export const loadLandRows = cache(async (columns: string): Promise<StagedBucket[]> => {
  const db = supabaseAdmin
  if (!db) return []
  async function discover(acquisition: boolean) {
    const ids: string[] = []
    for (let offset = 0; ; offset += 500) {
      const query = db!.from("homeowner_requests_staging").select("id")
      const { data, error } = await (acquisition ? query.eq("bot_source", "land_lane")
        : query.not("raw_payload->property_lane", "is", null).eq("raw_payload->property_lane->>lane", "land"))
        .order("id").range(offset, offset + 499)
      if (error) throw new Error(error.message)
      ids.push(...(data ?? []).map(r => r.id))
      if ((data?.length ?? 0) < 500) return ids
    }
  }
  const ids = [...new Set((await Promise.all([discover(true), discover(false)])).flat())]
  const rows: StagedBucket[] = []
  const projection = [...new Set((columns + "," + LAND_FIELDS).split(","))].join(",")
  const batches: string[][] = []
  for (let i = 0; i < ids.length; i += 80) batches.push(ids.slice(i, i + 80))
  for (let i = 0; i < batches.length; i += 3) {
    const results = await Promise.all(batches.slice(i, i + 3).map(batch =>
      db.from("homeowner_requests_staging").select(projection).in("id", batch)))
    for (const result of results) if (result.error) throw new Error(result.error.message)
    for (const record of results.flatMap(result => result.data ?? [])) {
      const row = record as unknown as StagedBucket & { origin: string; land: unknown; roll: unknown }
      const evidence = landEvidence(row, row)
      rows.push({ ...row, lane: typeof row.lane === "object" && row.lane ? row.lane as LaneTag : null,
        landEvidence: evidence, parcelKey: evidence ? landParcelKey(row.origin, row.county, evidence.parcel) ?? row.id : undefined })
    }
  }
  const parcels = new Map<string, StagedBucket>()
  for (const row of rows) {
    const parcel = row.parcelKey
    if (!parcel || !row.landEvidence) continue
    const prior = parcels.get(parcel)
    if (!prior?.landEvidence) {
      parcels.set(parcel, row)
      continue
    }
    // Prefer the most recent roll for display, but never transfer qualifications across versions.
    const latest = row.landEvidence.rollYear > prior.landEvidence.rollYear ? row : prior
    const reason = "Multiple staging records share this parcel control"
    const evidence = latest.landEvidence!
    parcels.set(parcel, { ...latest, landEvidence: { ...evidence, corroborated: false,
      reasons: [...new Set([...evidence.reasons, reason])] } })
  }
  return [...rows.filter(row => !row.landEvidence), ...parcels.values()]
})
