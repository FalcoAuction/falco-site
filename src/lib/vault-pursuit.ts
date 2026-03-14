import { supabaseAdmin, supabaseAdminConfigError } from "@/lib/supabase-admin"
import {
  hasWorkflowTable,
  isMissingWorkflowTableError,
  requireWorkflowSupabaseAdmin,
} from "@/lib/workflow-store"

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
export type VaultOperatorFeedbackSignal =
  | "worth_pursuing"
  | "too_late"
  | "too_lender_controlled"
  | "owner_has_room"
  | "no_contact_path"
  | "needs_more_info"
  | "bad_noisy_lead"
  | "good_upstream_candidate"
  | "not_auction_lane"

export type VaultExecutionLane =
  | "borrower_side"
  | "lender_trustee"
  | "auction_only"
  | "mixed"
  | "unclear"

export type VaultValidationContext = {
  county: string
  distressType: string
  contactPathQuality: string
  controlParty: string
  ownerAgency?: string
  interventionWindow?: string
  lenderControlIntensity?: string
  influenceability?: string
  executionPosture: string
  workabilityBand: string
  saleStatus?: string
  sourceLeadKey?: string
}

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
  feedbackSignals: VaultOperatorFeedbackSignal[]
  contactAttempted: boolean
  submittedAt: string
  actedBy: string
  context?: VaultValidationContext
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
  feedbackSignals?: VaultOperatorFeedbackSignal[]
  contactAttempted?: boolean
  actedBy: string
  context?: VaultValidationContext
}

type StructuredValidationNotePayload = {
  version: 1
  type: "vault_validation_meta"
  note: string
  feedbackSignals: VaultOperatorFeedbackSignal[]
  contactAttempted: boolean
}

function normalizeFeedbackSignals(value: unknown): VaultOperatorFeedbackSignal[] {
  if (!Array.isArray(value)) return []

  const allowed = new Set<VaultOperatorFeedbackSignal>([
    "worth_pursuing",
    "too_late",
    "too_lender_controlled",
    "owner_has_room",
    "no_contact_path",
    "needs_more_info",
    "bad_noisy_lead",
    "good_upstream_candidate",
    "not_auction_lane",
  ])

  return value.filter(
    (entry): entry is VaultOperatorFeedbackSignal =>
      typeof entry === "string" && allowed.has(entry as VaultOperatorFeedbackSignal)
  )
}

function normalizeValidationContext(raw: unknown): VaultValidationContext | undefined {
  if (!raw || typeof raw !== "object") return undefined

  const context = raw as Partial<VaultValidationContext>
  const normalized = {
    county: typeof context.county === "string" ? context.county.trim() : "",
    distressType: typeof context.distressType === "string" ? context.distressType.trim() : "",
    contactPathQuality:
      typeof context.contactPathQuality === "string" ? context.contactPathQuality.trim() : "",
    controlParty: typeof context.controlParty === "string" ? context.controlParty.trim() : "",
    ownerAgency: typeof context.ownerAgency === "string" ? context.ownerAgency.trim() : "",
    interventionWindow:
      typeof context.interventionWindow === "string" ? context.interventionWindow.trim() : "",
    lenderControlIntensity:
      typeof context.lenderControlIntensity === "string"
        ? context.lenderControlIntensity.trim()
        : "",
    influenceability:
      typeof context.influenceability === "string" ? context.influenceability.trim() : "",
    executionPosture:
      typeof context.executionPosture === "string" ? context.executionPosture.trim() : "",
    workabilityBand:
      typeof context.workabilityBand === "string" ? context.workabilityBand.trim() : "",
    saleStatus: typeof context.saleStatus === "string" ? context.saleStatus.trim() : "",
    sourceLeadKey: typeof context.sourceLeadKey === "string" ? context.sourceLeadKey.trim() : "",
  }

  if (Object.values(normalized).every((value) => !value)) {
    return undefined
  }

  return normalized
}

function requireSupabaseAdmin() {
  return requireWorkflowSupabaseAdmin()
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

function parseStructuredValidationNote(note: string | null) {
  if (!note) return null

  try {
    const parsed = JSON.parse(note) as Partial<StructuredValidationNotePayload>
    if (parsed.version !== 1 || parsed.type !== "vault_validation_meta") return null

    return {
      version: 1 as const,
      type: "vault_validation_meta" as const,
      note: typeof parsed.note === "string" ? parsed.note : "",
      feedbackSignals: normalizeFeedbackSignals(parsed.feedbackSignals),
      contactAttempted: parsed.contactAttempted === true,
    }
  } catch {
    return null
  }
}

function buildStructuredValidationNote(input: {
  note: string
  feedbackSignals: VaultOperatorFeedbackSignal[]
  contactAttempted: boolean
}) {
  return JSON.stringify({
    version: 1,
    type: "vault_validation_meta",
    note: input.note,
    feedbackSignals: input.feedbackSignals,
    contactAttempted: input.contactAttempted,
  } satisfies StructuredValidationNotePayload)
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
      feedbackSignals: normalizeFeedbackSignals(parsed.feedbackSignals),
      contactAttempted: parsed.contactAttempted === true,
      actedBy: typeof parsed.actedBy === "string" ? parsed.actedBy : "",
      context: normalizeValidationContext(parsed.context),
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
    feedbackSignals: payload.feedbackSignals,
    contactAttempted: payload.contactAttempted,
    actedBy: payload.actedBy,
    context: payload.context,
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
    feedbackSignals: notes.feedbackSignals,
    contactAttempted: notes.contactAttempted,
    submittedAt: row.created_at,
    actedBy: notes.actedBy,
    context: notes.context,
  }
}

export async function listVaultPursuitRequests() {
  if (!supabaseAdmin) {
    console.error("listVaultPursuitRequests error:", supabaseAdminConfigError)
    return []
  }

  const dedicatedRows: VaultPursuitRecord[] = []

  try {
    if (await hasWorkflowTable("vault_pursuit_requests")) {
      const { data, error } = await supabaseAdmin
        .from("vault_pursuit_requests")
        .select("*")
        .order("created_at", { ascending: false })

      if (error) {
        if (!isMissingWorkflowTableError(error)) {
          console.error("listVaultPursuitRequests dedicated error:", error.message)
        }
      } else {
        for (const row of data ?? []) {
          dedicatedRows.push({
            requestId: String(row.id ?? ""),
            listingSlug: String(row.listing_slug ?? ""),
            email: String(row.email ?? ""),
            fullName: String(row.full_name ?? ""),
            message: String(row.message ?? ""),
            status: row.status as VaultPursuitStatus,
            submittedAt: String(row.created_at ?? row.updated_at ?? ""),
            actedBy: String(row.acted_by ?? ""),
          })
        }
      }
    }
  } catch (error) {
    console.error("listVaultPursuitRequests dedicated error:", error)
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

  const legacyRows = (data ?? [])
    .map((row) => mapPursuitRow(row as PartnerAccessRequestRow))
    .filter((row): row is VaultPursuitRecord => Boolean(row))

  const deduped = new Map<string, VaultPursuitRecord>()
  for (const row of dedicatedRows) {
    if (row.requestId && !deduped.has(row.requestId)) deduped.set(row.requestId, row)
  }
  for (const row of legacyRows) {
    if (!deduped.has(row.requestId)) deduped.set(row.requestId, row)
  }

  return [...deduped.values()]
}

export async function listVaultValidationRecords() {
  if (!supabaseAdmin) {
    console.error("listVaultValidationRecords error:", supabaseAdminConfigError)
    return []
  }

  const dedicatedRows: VaultValidationRecord[] = []

  try {
    if (await hasWorkflowTable("vault_validation_records")) {
      const { data, error } = await supabaseAdmin
        .from("vault_validation_records")
        .select("*")
        .order("submitted_at", { ascending: false })

      if (error) {
        if (!isMissingWorkflowTableError(error)) {
          console.error("listVaultValidationRecords dedicated error:", error.message)
        }
      } else {
        for (const row of data ?? []) {
          const noteMeta = parseStructuredValidationNote(String(row.note ?? ""))
          dedicatedRows.push({
            requestId: String(row.listing_slug ?? ""),
            listingSlug: String(row.listing_slug ?? ""),
            outcome: row.outcome as VaultValidationOutcome,
            executionLane: row.execution_lane as VaultExecutionLane,
            note: noteMeta?.note ?? String(row.note ?? ""),
            feedbackSignals: noteMeta?.feedbackSignals ?? [],
            contactAttempted: noteMeta?.contactAttempted ?? false,
            submittedAt: String(row.submitted_at ?? ""),
            actedBy: String(row.acted_by ?? ""),
            context: normalizeValidationContext({
              county: row.county,
              distressType: row.distress_type,
              contactPathQuality: row.contact_path_quality,
              controlParty: row.control_party,
              ownerAgency: row.owner_agency,
              interventionWindow: row.intervention_window,
              lenderControlIntensity: row.lender_control_intensity,
              influenceability: row.influenceability,
              executionPosture: row.execution_posture,
              workabilityBand: row.workability_band,
              saleStatus: row.sale_status,
              sourceLeadKey: row.source_lead_key,
            }),
          })
        }
      }
    }
  } catch (error) {
    console.error("listVaultValidationRecords dedicated error:", error)
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

  const legacyRows = (data ?? [])
    .map((row) => mapValidationRow(row as PartnerAccessRequestRow))
    .filter((row): row is VaultValidationRecord => Boolean(row))

  const deduped = new Map<string, VaultValidationRecord>()
  for (const row of dedicatedRows) {
    if (row.listingSlug && !deduped.has(row.listingSlug)) deduped.set(row.listingSlug, row)
  }
  for (const row of legacyRows) {
    if (!deduped.has(row.listingSlug)) deduped.set(row.listingSlug, row)
  }

  return [...deduped.values()]
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

  try {
    if (await hasWorkflowTable("vault_pursuit_requests")) {
      const { data, error } = await client
        .from("vault_pursuit_requests")
        .insert({
          listing_slug: input.listingSlug,
          email: input.email.toLowerCase(),
          full_name: input.fullName,
          message: input.message,
          status: "pursuit_requested",
          acted_by: input.email.toLowerCase(),
        })
        .select("*")
        .single()

      if (error) {
        if (!isMissingWorkflowTableError(error)) {
          throw new Error(`createVaultPursuitRequest failed: ${error.message}`)
        }
      } else {
        return {
          requestId: String(data.id ?? ""),
          listingSlug: String(data.listing_slug ?? ""),
          email: String(data.email ?? ""),
          fullName: String(data.full_name ?? ""),
          message: String(data.message ?? ""),
          status: data.status as VaultPursuitStatus,
          submittedAt: String(data.created_at ?? data.updated_at ?? ""),
          actedBy: String(data.acted_by ?? ""),
        }
      }
    }
  } catch (error) {
    if (error instanceof Error) throw error
    throw new Error("createVaultPursuitRequest failed.")
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

  try {
    if (await hasWorkflowTable("vault_pursuit_requests")) {
      const { data, error } = await client
        .from("vault_pursuit_requests")
        .update({
          status,
          acted_by: actedBy,
          updated_at: new Date().toISOString(),
        })
        .eq("id", row.requestId)
        .select("*")
        .single()

      if (error) {
        if (!isMissingWorkflowTableError(error)) {
          throw new Error(`updatePursuitRowStatus failed: ${error.message}`)
        }
      } else {
        return {
          requestId: String(data.id ?? ""),
          listingSlug: String(data.listing_slug ?? ""),
          email: String(data.email ?? ""),
          fullName: String(data.full_name ?? ""),
          message: String(data.message ?? ""),
          status: data.status as VaultPursuitStatus,
          submittedAt: String(data.created_at ?? data.updated_at ?? ""),
          actedBy: String(data.acted_by ?? ""),
        }
      }
    }
  } catch (error) {
    if (error instanceof Error) throw error
    throw new Error("updatePursuitRowStatus failed.")
  }

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
    feedbackSignals: VaultOperatorFeedbackSignal[]
    contactAttempted: boolean
    actedBy: string
    status: VaultValidationStatus
    context?: VaultValidationContext
  }
) {
  const client = requireSupabaseAdmin()

  try {
    if (await hasWorkflowTable("vault_validation_records")) {
      const { data, error } = await client
        .from("vault_validation_records")
        .upsert(
          {
            listing_slug: input.listingSlug,
            outcome: input.outcome,
            execution_lane: input.executionLane,
            note: buildStructuredValidationNote({
              note: input.note,
              feedbackSignals: input.feedbackSignals,
              contactAttempted: input.contactAttempted,
            }),
            acted_by: input.actedBy,
            county: input.context?.county ?? "",
            distress_type: input.context?.distressType ?? "",
            contact_path_quality: input.context?.contactPathQuality ?? "",
            control_party: input.context?.controlParty ?? "",
            owner_agency: input.context?.ownerAgency ?? "",
            intervention_window: input.context?.interventionWindow ?? "",
            lender_control_intensity: input.context?.lenderControlIntensity ?? "",
            influenceability: input.context?.influenceability ?? "",
            execution_posture: input.context?.executionPosture ?? "",
            workability_band: input.context?.workabilityBand ?? "",
            sale_status: input.context?.saleStatus ?? "",
            source_lead_key: input.context?.sourceLeadKey ?? "",
            submitted_at: new Date().toISOString(),
          },
          { onConflict: "listing_slug" }
        )
        .select("*")
        .single()

      if (error) {
        if (!isMissingWorkflowTableError(error)) {
          console.error("updateValidationRow dedicated error:", error.message)
        }
      } else {
        const noteMeta = parseStructuredValidationNote(String(data.note ?? ""))
        return {
          requestId: String(data.listing_slug ?? ""),
          listingSlug: String(data.listing_slug ?? ""),
          outcome: data.outcome as VaultValidationOutcome,
          executionLane: data.execution_lane as VaultExecutionLane,
          note: noteMeta?.note ?? String(data.note ?? ""),
          feedbackSignals: noteMeta?.feedbackSignals ?? [],
          contactAttempted: noteMeta?.contactAttempted ?? false,
          submittedAt: String(data.submitted_at ?? ""),
          actedBy: String(data.acted_by ?? ""),
          context: normalizeValidationContext({
            county: data.county,
            distressType: data.distress_type,
            contactPathQuality: data.contact_path_quality,
            controlParty: data.control_party,
            ownerAgency: data.owner_agency,
            interventionWindow: data.intervention_window,
            lenderControlIntensity: data.lender_control_intensity,
            influenceability: data.influenceability,
            executionPosture: data.execution_posture,
            workabilityBand: data.workability_band,
            saleStatus: data.sale_status,
            sourceLeadKey: data.source_lead_key,
          }),
        }
      }
    }
  } catch (error) {
    console.error("updateValidationRow dedicated error:", error)
  }

  const { data, error } = await client
    .from("partner_access_requests")
    .update({
      status: input.status,
      notes: buildValidationNotes({
        listingSlug: input.listingSlug,
        outcome: input.outcome,
        executionLane: input.executionLane,
        note: input.note,
        feedbackSignals: input.feedbackSignals,
        contactAttempted: input.contactAttempted,
        actedBy: input.actedBy,
        context: input.context,
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
  feedbackSignals?: VaultOperatorFeedbackSignal[]
  contactAttempted?: boolean
  actedBy: string
  context?: VaultValidationContext
}) {
  const client = requireSupabaseAdmin()

  try {
    if (await hasWorkflowTable("vault_validation_records")) {
      const { data, error } = await client
        .from("vault_validation_records")
        .upsert(
          {
            listing_slug: input.listingSlug,
            outcome: input.outcome,
            execution_lane: input.executionLane,
            note: buildStructuredValidationNote({
              note: input.note,
              feedbackSignals: input.feedbackSignals ?? [],
              contactAttempted: input.contactAttempted === true,
            }),
            acted_by: input.actedBy,
            county: input.context?.county ?? "",
            distress_type: input.context?.distressType ?? "",
            contact_path_quality: input.context?.contactPathQuality ?? "",
            control_party: input.context?.controlParty ?? "",
            owner_agency: input.context?.ownerAgency ?? "",
            intervention_window: input.context?.interventionWindow ?? "",
            lender_control_intensity: input.context?.lenderControlIntensity ?? "",
            influenceability: input.context?.influenceability ?? "",
            execution_posture: input.context?.executionPosture ?? "",
            workability_band: input.context?.workabilityBand ?? "",
            sale_status: input.context?.saleStatus ?? "",
            source_lead_key: input.context?.sourceLeadKey ?? "",
            submitted_at: new Date().toISOString(),
          },
          { onConflict: "listing_slug" }
        )
        .select("*")
        .single()

      if (error) {
        if (!isMissingWorkflowTableError(error)) {
          console.error("upsertVaultValidationRecord dedicated error:", error.message)
        }
      } else {
        const noteMeta = parseStructuredValidationNote(String(data.note ?? ""))
        return {
          requestId: String(data.listing_slug ?? ""),
          listingSlug: String(data.listing_slug ?? ""),
          outcome: data.outcome as VaultValidationOutcome,
          executionLane: data.execution_lane as VaultExecutionLane,
          note: noteMeta?.note ?? String(data.note ?? ""),
          feedbackSignals: noteMeta?.feedbackSignals ?? [],
          contactAttempted: noteMeta?.contactAttempted ?? false,
          submittedAt: String(data.submitted_at ?? ""),
          actedBy: String(data.acted_by ?? ""),
          context: normalizeValidationContext({
            county: data.county,
            distressType: data.distress_type,
            contactPathQuality: data.contact_path_quality,
            controlParty: data.control_party,
            ownerAgency: data.owner_agency,
            interventionWindow: data.intervention_window,
            lenderControlIntensity: data.lender_control_intensity,
            influenceability: data.influenceability,
            executionPosture: data.execution_posture,
            workabilityBand: data.workability_band,
            saleStatus: data.sale_status,
            sourceLeadKey: data.source_lead_key,
          }),
        }
      }
    }
  } catch (error) {
    console.error("upsertVaultValidationRecord dedicated error:", error)
  }

  const existing = await getVaultValidationRecordByListing(input.listingSlug)

  if (existing) {
    return updateValidationRow(existing.requestId, {
      listingSlug: input.listingSlug,
      outcome: input.outcome,
      executionLane: input.executionLane,
      note: input.note,
      feedbackSignals: input.feedbackSignals ?? [],
      contactAttempted: input.contactAttempted === true,
      actedBy: input.actedBy,
      context: input.context,
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
  const client = requireSupabaseAdmin()

  try {
    if (await hasWorkflowTable("vault_validation_records")) {
      const { data, error } = await client
        .from("vault_validation_records")
        .delete()
        .eq("listing_slug", listingSlug)
        .select("*")
        .maybeSingle()

      if (error) {
        if (!isMissingWorkflowTableError(error)) {
          throw new Error(`clearVaultValidationRecord failed: ${error.message}`)
        }
      } else {
        if (!data) return null
        const noteMeta = parseStructuredValidationNote(String(data.note ?? ""))
        return {
          requestId: String(data.listing_slug ?? ""),
          listingSlug: String(data.listing_slug ?? ""),
          outcome: data.outcome as VaultValidationOutcome,
          executionLane: data.execution_lane as VaultExecutionLane,
          note: noteMeta?.note ?? String(data.note ?? ""),
          feedbackSignals: noteMeta?.feedbackSignals ?? [],
          contactAttempted: noteMeta?.contactAttempted ?? false,
          submittedAt: String(data.submitted_at ?? ""),
          actedBy: actedBy || String(data.acted_by ?? ""),
          context: normalizeValidationContext({
            county: data.county,
            distressType: data.distress_type,
            contactPathQuality: data.contact_path_quality,
            controlParty: data.control_party,
            ownerAgency: data.owner_agency,
            interventionWindow: data.intervention_window,
            lenderControlIntensity: data.lender_control_intensity,
            influenceability: data.influenceability,
            executionPosture: data.execution_posture,
            workabilityBand: data.workability_band,
            saleStatus: data.sale_status,
            sourceLeadKey: data.source_lead_key,
          }),
        }
      }
    }
  } catch (error) {
    if (error instanceof Error) throw error
    throw new Error("clearVaultValidationRecord failed.")
  }

  const existing = await getVaultValidationRecordByListing(listingSlug)
  if (!existing) return null

  return updateValidationRow(existing.requestId, {
    listingSlug,
    outcome: existing.outcome,
    executionLane: existing.executionLane,
    note: existing.note,
    feedbackSignals: existing.feedbackSignals,
    contactAttempted: existing.contactAttempted,
    actedBy,
    status: "validation_cleared",
    context: existing.context,
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
