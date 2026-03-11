import { supabaseAdmin, supabaseAdminConfigError } from "@/lib/supabase-admin"

export const VAULT_PURSUIT_COMPANY = "__falco_vault_pursuit__"
export const VAULT_VALIDATION_COMPANY = "__falco_operator_validation__"

export type VaultPursuitStatus =
  | "pursuit_requested"
  | "pursuit_reserved"
  | "pursuit_declined"
  | "pursuit_released"

export type VaultValidationStatus = "validation_recorded" | "validation_cleared"
export type VaultValidationOutcome =
  | "validated_execution_path"
  | "needs_more_info"
  | "no_real_control_path"
  | "low_leverage"
  | "dead_lead"

export type VaultExecutionLane =
  | "borrower_side"
  | "lender_trustee"
  | "auction_only"
  | "mixed"
  | "unclear"

export type VaultRoutingState = "open" | "in_discussion" | "reserved" | "closed"

export type VaultPursuitRecord = {
  requestId: string
  listingSlug: string
  email: string
  fullName: string
  message: string
  status: VaultPursuitStatus
  submittedAt: string
  actedBy: string
}

export type VaultRoutingSnapshot = {
  listingSlug: string
  routingState: VaultRoutingState
  requestCount: number
  reservedByEmail?: string
  reservedByName?: string
}

export type VaultValidationRecord = {
  requestId: string
  listingSlug: string
  outcome: VaultValidationOutcome
  executionLane: VaultExecutionLane
  note: string
  submittedAt: string
  actedBy: string
}

type PartnerAccessRequestRow = {
  id: string
  email: string
  full_name: string | null
  company: string | null
  notes: string | null
  status: string
  created_at: string
}

type VaultPursuitNotesPayload = {
  version: 1
  type: "vault_pursuit"
  listingSlug: string
  message: string
  actedBy: string
}

type VaultValidationNotesPayload = {
  version: 1
  type: "vault_validation"
  listingSlug: string
  outcome: VaultValidationOutcome
  executionLane: VaultExecutionLane
  note: string
  actedBy: string
}

function requireSupabaseAdmin() {
  if (!supabaseAdmin) {
    throw new Error(supabaseAdminConfigError ?? "Supabase admin client is not configured.")
  }

  return supabaseAdmin
}

function parsePursuitNotes(notes: string | null) {
  if (!notes) return null

  try {
    const parsed = JSON.parse(notes) as Partial<VaultPursuitNotesPayload>
    if (parsed.version !== 1 || parsed.type !== "vault_pursuit") return null

    return {
      version: 1 as const,
      type: "vault_pursuit" as const,
      listingSlug: typeof parsed.listingSlug === "string" ? parsed.listingSlug : "",
      message: typeof parsed.message === "string" ? parsed.message : "",
      actedBy: typeof parsed.actedBy === "string" ? parsed.actedBy : "",
    }
  } catch {
    return null
  }
}

function buildPursuitNotes(payload: Omit<VaultPursuitNotesPayload, "version" | "type">) {
  return JSON.stringify({
    version: 1,
    type: "vault_pursuit",
    listingSlug: payload.listingSlug,
    message: payload.message,
    actedBy: payload.actedBy,
  } satisfies VaultPursuitNotesPayload)
}

function parseValidationNotes(notes: string | null) {
  if (!notes) return null

  try {
    const parsed = JSON.parse(notes) as Partial<VaultValidationNotesPayload>
    if (parsed.version !== 1 || parsed.type !== "vault_validation") return null

    return {
      version: 1 as const,
      type: "vault_validation" as const,
      listingSlug: typeof parsed.listingSlug === "string" ? parsed.listingSlug : "",
      outcome:
        typeof parsed.outcome === "string"
          ? (parsed.outcome as VaultValidationOutcome)
          : "needs_more_info",
      executionLane:
        typeof parsed.executionLane === "string"
          ? (parsed.executionLane as VaultExecutionLane)
          : "unclear",
      note: typeof parsed.note === "string" ? parsed.note : "",
      actedBy: typeof parsed.actedBy === "string" ? parsed.actedBy : "",
    }
  } catch {
    return null
  }
}

function buildValidationNotes(
  payload: Omit<VaultValidationNotesPayload, "version" | "type">
) {
  return JSON.stringify({
    version: 1,
    type: "vault_validation",
    listingSlug: payload.listingSlug,
    outcome: payload.outcome,
    executionLane: payload.executionLane,
    note: payload.note,
    actedBy: payload.actedBy,
  } satisfies VaultValidationNotesPayload)
}

function isVaultPursuitStatus(status: string): status is VaultPursuitStatus {
  return [
    "pursuit_requested",
    "pursuit_reserved",
    "pursuit_declined",
    "pursuit_released",
  ].includes(status)
}

function isVaultValidationStatus(status: string): status is VaultValidationStatus {
  return ["validation_recorded", "validation_cleared"].includes(status)
}

function mapPursuitRow(row: PartnerAccessRequestRow): VaultPursuitRecord | null {
  const notes = parsePursuitNotes(row.notes)
  if (!notes || !isVaultPursuitStatus(row.status)) return null

  return {
    requestId: row.id,
    listingSlug: notes.listingSlug,
    email: row.email,
    fullName: row.full_name ?? "",
    message: notes.message,
    status: row.status,
    submittedAt: row.created_at,
    actedBy: notes.actedBy,
  }
}

function mapValidationRow(row: PartnerAccessRequestRow): VaultValidationRecord | null {
  const notes = parseValidationNotes(row.notes)
  if (!notes || !isVaultValidationStatus(row.status) || row.status !== "validation_recorded") {
    return null
  }

  return {
    requestId: row.id,
    listingSlug: notes.listingSlug,
    outcome: notes.outcome,
    executionLane: notes.executionLane,
    note: notes.note,
    submittedAt: row.created_at,
    actedBy: notes.actedBy,
  }
}

export async function listVaultPursuitRequests() {
  if (!supabaseAdmin) {
    console.error("listVaultPursuitRequests error:", supabaseAdminConfigError)
    return []
  }

  const { data, error } = await supabaseAdmin
    .from("partner_access_requests")
    .select("*")
    .eq("company", VAULT_PURSUIT_COMPANY)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("listVaultPursuitRequests error:", error.message)
    return []
  }

  return (data ?? [])
    .map((row) => mapPursuitRow(row as PartnerAccessRequestRow))
    .filter((row): row is VaultPursuitRecord => Boolean(row))
}

export async function listVaultValidationRecords() {
  if (!supabaseAdmin) {
    console.error("listVaultValidationRecords error:", supabaseAdminConfigError)
    return []
  }

  const { data, error } = await supabaseAdmin
    .from("partner_access_requests")
    .select("*")
    .eq("company", VAULT_VALIDATION_COMPANY)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("listVaultValidationRecords error:", error.message)
    return []
  }

  return (data ?? [])
    .map((row) => mapValidationRow(row as PartnerAccessRequestRow))
    .filter((row): row is VaultValidationRecord => Boolean(row))
}

export async function getVaultValidationRecordByListing(listingSlug: string) {
  const rows = await listVaultValidationRecords()
  return rows.find((row) => row.listingSlug === listingSlug) ?? null
}

export async function getVaultValidationSnapshotsForListings(listingSlugs: string[]) {
  const rows = await listVaultValidationRecords()
  const wanted = new Set(listingSlugs)
  const snapshots = new Map<string, VaultValidationRecord>()

  for (const row of rows) {
    if (!wanted.has(row.listingSlug)) continue
    if (!snapshots.has(row.listingSlug)) {
      snapshots.set(row.listingSlug, row)
    }
  }

  return snapshots
}

export async function listVaultPursuitRequestsByListing(listingSlug: string) {
  const rows = await listVaultPursuitRequests()
  return rows.filter((row) => row.listingSlug === listingSlug)
}

function buildRoutingSnapshot(
  listingSlug: string,
  rows: VaultPursuitRecord[],
  isClosed = false
): VaultRoutingSnapshot {
  if (isClosed) {
    return {
      listingSlug,
      routingState: "closed",
      requestCount: 0,
    }
  }

  const reserved = rows.find((row) => row.status === "pursuit_reserved")
  if (reserved) {
    return {
      listingSlug,
      routingState: "reserved",
      requestCount: rows.filter((row) => row.status === "pursuit_requested").length,
      reservedByEmail: reserved.email,
      reservedByName: reserved.fullName,
    }
  }

  const requested = rows.filter((row) => row.status === "pursuit_requested")
  if (requested.length > 0) {
    return {
      listingSlug,
      routingState: "in_discussion",
      requestCount: requested.length,
    }
  }

  return {
    listingSlug,
    routingState: "open",
    requestCount: 0,
  }
}

export async function getVaultRoutingSnapshot(listingSlug: string, isClosed = false) {
  const rows = await listVaultPursuitRequestsByListing(listingSlug)
  return buildRoutingSnapshot(listingSlug, rows, isClosed)
}

export async function getVaultRoutingSnapshotsForListings(
  listings: Array<{ slug: string; status: string }>
) {
  const rows = await listVaultPursuitRequests()
  const bySlug = new Map<string, VaultPursuitRecord[]>()

  for (const row of rows) {
    const existing = bySlug.get(row.listingSlug) ?? []
    existing.push(row)
    bySlug.set(row.listingSlug, existing)
  }

  const snapshots = new Map<string, VaultRoutingSnapshot>()

  for (const listing of listings) {
    snapshots.set(
      listing.slug,
      buildRoutingSnapshot(listing.slug, bySlug.get(listing.slug) ?? [], listing.status !== "active")
    )
  }

  return snapshots
}

export async function createVaultPursuitRequest(input: {
  listingSlug: string
  email: string
  fullName: string
  message: string
}) {
  const client = requireSupabaseAdmin()
  const existing = await listVaultPursuitRequestsByListing(input.listingSlug)
  const duplicate = existing.find(
    (row) =>
      row.email === input.email.toLowerCase() &&
      (row.status === "pursuit_requested" || row.status === "pursuit_reserved")
  )

  if (duplicate) {
    return duplicate
  }

  const { data, error } = await client
    .from("partner_access_requests")
    .insert({
      email: input.email.toLowerCase(),
      full_name: input.fullName,
      company: VAULT_PURSUIT_COMPANY,
      notes: buildPursuitNotes({
        listingSlug: input.listingSlug,
        message: input.message,
        actedBy: input.email.toLowerCase(),
      }),
      status: "pursuit_requested",
    })
    .select("*")
    .single()

  if (error) {
    throw new Error(`createVaultPursuitRequest failed: ${error.message}`)
  }

  const mapped = mapPursuitRow(data as PartnerAccessRequestRow)
  if (!mapped) {
    throw new Error("createVaultPursuitRequest failed: unable to map row.")
  }

  return mapped
}

function buildValidationEmail(listingSlug: string) {
  const slug = listingSlug.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")
  return `validation+${slug || "listing"}@falco.local`
}

async function updatePursuitRowStatus(
  row: VaultPursuitRecord,
  status: VaultPursuitStatus,
  actedBy: string
) {
  const client = requireSupabaseAdmin()
  const { data, error } = await client
    .from("partner_access_requests")
    .update({
      status,
      notes: buildPursuitNotes({
        listingSlug: row.listingSlug,
        message: row.message,
        actedBy,
      }),
    })
    .eq("id", row.requestId)
    .select("*")
    .single()

  if (error) {
    throw new Error(`updatePursuitRowStatus failed: ${error.message}`)
  }

  const mapped = mapPursuitRow(data as PartnerAccessRequestRow)
  if (!mapped) {
    throw new Error("updatePursuitRowStatus failed: unable to map row.")
  }

  return mapped
}

async function updateValidationRow(
  requestId: string,
  input: {
    listingSlug: string
    outcome: VaultValidationOutcome
    executionLane: VaultExecutionLane
    note: string
    actedBy: string
    status: VaultValidationStatus
  }
) {
  const client = requireSupabaseAdmin()
  const { data, error } = await client
    .from("partner_access_requests")
    .update({
      status: input.status,
      notes: buildValidationNotes({
        listingSlug: input.listingSlug,
        outcome: input.outcome,
        executionLane: input.executionLane,
        note: input.note,
        actedBy: input.actedBy,
      }),
    })
    .eq("id", requestId)
    .select("*")
    .single()

  if (error) {
    throw new Error(`updateValidationRow failed: ${error.message}`)
  }

  return mapValidationRow(data as PartnerAccessRequestRow)
}

export async function upsertVaultValidationRecord(input: {
  listingSlug: string
  outcome: VaultValidationOutcome
  executionLane: VaultExecutionLane
  note: string
  actedBy: string
}) {
  const client = requireSupabaseAdmin()
  const existing = await getVaultValidationRecordByListing(input.listingSlug)

  if (existing) {
    return updateValidationRow(existing.requestId, {
      ...input,
      status: "validation_recorded",
    })
  }

  const { data, error } = await client
    .from("partner_access_requests")
    .insert({
      email: buildValidationEmail(input.listingSlug),
      full_name: "Operator Validation",
      company: VAULT_VALIDATION_COMPANY,
      notes: buildValidationNotes(input),
      status: "validation_recorded",
    })
    .select("*")
    .single()

  if (error) {
    throw new Error(`upsertVaultValidationRecord failed: ${error.message}`)
  }

  return mapValidationRow(data as PartnerAccessRequestRow)
}

export async function clearVaultValidationRecord(listingSlug: string, actedBy: string) {
  const existing = await getVaultValidationRecordByListing(listingSlug)
  if (!existing) return null

  return updateValidationRow(existing.requestId, {
    listingSlug,
    outcome: existing.outcome,
    executionLane: existing.executionLane,
    note: existing.note,
    actedBy,
    status: "validation_cleared",
  })
}

export async function reserveVaultPursuitRequest(requestId: string, actedBy: string) {
  const rows = await listVaultPursuitRequests()
  const target = rows.find((row) => row.requestId === requestId)
  if (!target) return null

  const reserved = await updatePursuitRowStatus(target, "pursuit_reserved", actedBy)
  const competing = rows.filter(
    (row) =>
      row.listingSlug === target.listingSlug &&
      row.requestId !== target.requestId &&
      row.status === "pursuit_requested"
  )

  await Promise.all(
    competing.map((row) => updatePursuitRowStatus(row, "pursuit_declined", actedBy))
  )

  return reserved
}

export async function declineVaultPursuitRequest(requestId: string, actedBy: string) {
  const rows = await listVaultPursuitRequests()
  const target = rows.find((row) => row.requestId === requestId)
  if (!target) return null

  return updatePursuitRowStatus(target, "pursuit_declined", actedBy)
}

export async function releaseVaultPursuitReservation(requestId: string, actedBy: string) {
  const rows = await listVaultPursuitRequests()
  const target = rows.find((row) => row.requestId === requestId)
  if (!target) return null

  return updatePursuitRowStatus(target, "pursuit_released", actedBy)
}
