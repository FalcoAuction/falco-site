import { supabaseAdmin, supabaseAdminConfigError } from "@/lib/supabase-admin"
import {
  hasWorkflowTable,
  isMissingWorkflowTableError,
  requireWorkflowSupabaseAdmin,
} from "@/lib/workflow-store"
import type {
  VaultExecutionLane,
  VaultOperatorFeedbackSignal,
  VaultValidationContext,
  VaultValidationOutcome,
} from "@/lib/vault-pursuit"

export const VAULT_PARTNER_FEEDBACK_COMPANY = "__falco_vault_partner_feedback__"

export type VaultPartnerFeedbackRecord = {
  requestId: string
  listingSlug: string
  email: string
  partnerName: string
  outcome: VaultValidationOutcome
  executionLane: VaultExecutionLane
  note: string
  feedbackSignals: VaultOperatorFeedbackSignal[]
  contactAttempted: boolean
  submittedAt: string
  actedBy: string
  context?: VaultValidationContext
}

export type VaultPartnerFeedbackSummary = {
  totalResponses: number
  outcomeCounts: Array<{
    outcome: VaultValidationOutcome
    count: number
  }>
  signalCounts: Array<{
    signal: VaultOperatorFeedbackSignal
    count: number
  }>
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

type VaultPartnerFeedbackNotesPayload = {
  version: 1
  type: "vault_partner_feedback"
  listingSlug: string
  partnerName: string
  outcome: VaultValidationOutcome
  executionLane: VaultExecutionLane
  note: string
  feedbackSignals: VaultOperatorFeedbackSignal[]
  contactAttempted: boolean
  actedBy: string
  context?: VaultValidationContext
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

function buildFeedbackNotes(
  payload: Omit<VaultPartnerFeedbackNotesPayload, "version" | "type">
) {
  return JSON.stringify({
    version: 1,
    type: "vault_partner_feedback",
    listingSlug: payload.listingSlug,
    partnerName: payload.partnerName,
    outcome: payload.outcome,
    executionLane: payload.executionLane,
    note: payload.note,
    feedbackSignals: payload.feedbackSignals,
    contactAttempted: payload.contactAttempted,
    actedBy: payload.actedBy,
    context: payload.context,
  } satisfies VaultPartnerFeedbackNotesPayload)
}

function parseFeedbackNotes(notes: string | null) {
  if (!notes) return null

  try {
    const parsed = JSON.parse(notes) as Partial<VaultPartnerFeedbackNotesPayload>
    if (parsed.version !== 1 || parsed.type !== "vault_partner_feedback") return null

    return {
      version: 1 as const,
      type: "vault_partner_feedback" as const,
      listingSlug: typeof parsed.listingSlug === "string" ? parsed.listingSlug.trim() : "",
      partnerName: typeof parsed.partnerName === "string" ? parsed.partnerName.trim() : "",
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

function requireSupabaseAdmin() {
  return requireWorkflowSupabaseAdmin()
}

function mapLegacyRow(row: PartnerAccessRequestRow): VaultPartnerFeedbackRecord | null {
  if (row.status !== "feedback_recorded") return null

  const notes = parseFeedbackNotes(row.notes)
  if (!notes) return null

  return {
    requestId: row.id,
    listingSlug: notes.listingSlug || (row.full_name ?? ""),
    email: row.email,
    partnerName: notes.partnerName || row.email,
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

function mapDedicatedRow(row: Record<string, unknown>): VaultPartnerFeedbackRecord {
  return {
    requestId: String(row.id ?? ""),
    listingSlug: String(row.listing_slug ?? ""),
    email: String(row.email ?? ""),
    partnerName: String(row.partner_name ?? row.email ?? ""),
    outcome: row.outcome as VaultValidationOutcome,
    executionLane: row.execution_lane as VaultExecutionLane,
    note: String(row.note ?? ""),
    feedbackSignals: normalizeFeedbackSignals(row.feedback_signals),
    contactAttempted: row.contact_attempted === true,
    submittedAt: String(row.submitted_at ?? row.updated_at ?? ""),
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
  }
}

export async function listVaultPartnerFeedbackRecords() {
  if (!supabaseAdmin) {
    console.error("listVaultPartnerFeedbackRecords error:", supabaseAdminConfigError)
    return []
  }

  const dedicatedRows: VaultPartnerFeedbackRecord[] = []

  try {
    if (await hasWorkflowTable("vault_partner_feedback")) {
      const { data, error } = await supabaseAdmin
        .from("vault_partner_feedback")
        .select("*")
        .order("submitted_at", { ascending: false })

      if (error) {
        if (!isMissingWorkflowTableError(error)) {
          console.error("listVaultPartnerFeedbackRecords dedicated error:", error.message)
        }
      } else {
        for (const row of data ?? []) {
          dedicatedRows.push(mapDedicatedRow(row as Record<string, unknown>))
        }
      }
    }
  } catch (error) {
    console.error("listVaultPartnerFeedbackRecords dedicated error:", error)
  }

  const { data, error } = await supabaseAdmin
    .from("partner_access_requests")
    .select("*")
    .eq("company", VAULT_PARTNER_FEEDBACK_COMPANY)
    .eq("status", "feedback_recorded")
    .order("created_at", { ascending: false })

  if (error) {
    console.error("listVaultPartnerFeedbackRecords error:", error.message)
    return dedicatedRows
  }

  const legacyRows = (data ?? [])
    .map((row) => mapLegacyRow(row as PartnerAccessRequestRow))
    .filter((row): row is VaultPartnerFeedbackRecord => Boolean(row))

  const deduped = new Map<string, VaultPartnerFeedbackRecord>()
  for (const row of dedicatedRows) {
    deduped.set(`${row.listingSlug}:${row.email}`, row)
  }
  for (const row of legacyRows) {
    const key = `${row.listingSlug}:${row.email}`
    if (!deduped.has(key)) deduped.set(key, row)
  }

  return [...deduped.values()]
}

export async function listVaultPartnerFeedbackByListing(listingSlug: string) {
  const rows = await listVaultPartnerFeedbackRecords()
  return rows.filter((row) => row.listingSlug === listingSlug)
}

export async function findVaultPartnerFeedbackRecord(listingSlug: string, email: string) {
  if (!supabaseAdmin) {
    console.error("findVaultPartnerFeedbackRecord error:", supabaseAdminConfigError)
    return null
  }

  const normalizedEmail = email.trim().toLowerCase()
  const normalizedSlug = listingSlug.trim()

  try {
    if (await hasWorkflowTable("vault_partner_feedback")) {
      const { data, error } = await supabaseAdmin
        .from("vault_partner_feedback")
        .select("*")
        .eq("listing_slug", normalizedSlug)
        .eq("email", normalizedEmail)
        .maybeSingle()

      if (error) {
        if (!isMissingWorkflowTableError(error)) {
          console.error("findVaultPartnerFeedbackRecord dedicated error:", error.message)
        }
      } else if (data) {
        return mapDedicatedRow(data as Record<string, unknown>)
      }
    }
  } catch (error) {
    console.error("findVaultPartnerFeedbackRecord dedicated error:", error)
  }

  const { data, error } = await supabaseAdmin
    .from("partner_access_requests")
    .select("*")
    .eq("company", VAULT_PARTNER_FEEDBACK_COMPANY)
    .eq("email", normalizedEmail)
    .eq("full_name", normalizedSlug)
    .eq("status", "feedback_recorded")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    console.error("findVaultPartnerFeedbackRecord error:", error.message)
    return null
  }

  if (!data) return null
  return mapLegacyRow(data as PartnerAccessRequestRow)
}

export async function upsertVaultPartnerFeedbackRecord(input: {
  listingSlug: string
  email: string
  partnerName: string
  outcome: VaultValidationOutcome
  executionLane: VaultExecutionLane
  note: string
  feedbackSignals: VaultOperatorFeedbackSignal[]
  contactAttempted: boolean
  actedBy: string
  context?: VaultValidationContext
}) {
  const client = requireSupabaseAdmin()
  const normalizedEmail = input.email.trim().toLowerCase()
  const normalizedSlug = input.listingSlug.trim()

  try {
    if (await hasWorkflowTable("vault_partner_feedback")) {
      const { data, error } = await client
        .from("vault_partner_feedback")
        .upsert(
          {
            listing_slug: normalizedSlug,
            email: normalizedEmail,
            partner_name: input.partnerName,
            outcome: input.outcome,
            execution_lane: input.executionLane,
            note: input.note,
            feedback_signals: input.feedbackSignals,
            contact_attempted: input.contactAttempted,
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
            updated_at: new Date().toISOString(),
          },
          { onConflict: "listing_slug,email" }
        )
        .select("*")
        .single()

      if (error) {
        if (!isMissingWorkflowTableError(error)) {
          console.error("upsertVaultPartnerFeedbackRecord dedicated error:", error.message)
        }
      } else {
        return mapDedicatedRow(data as Record<string, unknown>)
      }
    }
  } catch (error) {
    console.error("upsertVaultPartnerFeedbackRecord dedicated error:", error)
  }

  const existing = await findVaultPartnerFeedbackRecord(normalizedSlug, normalizedEmail)
  const payload = {
    email: normalizedEmail,
    full_name: normalizedSlug,
    company: VAULT_PARTNER_FEEDBACK_COMPANY,
    notes: buildFeedbackNotes({
      listingSlug: normalizedSlug,
      partnerName: input.partnerName,
      outcome: input.outcome,
      executionLane: input.executionLane,
      note: input.note,
      feedbackSignals: input.feedbackSignals,
      contactAttempted: input.contactAttempted,
      actedBy: input.actedBy,
      context: input.context,
    }),
    status: "feedback_recorded",
  }

  if (existing) {
    const { data, error } = await client
      .from("partner_access_requests")
      .update(payload)
      .eq("id", existing.requestId)
      .select("*")
      .single()

    if (error) {
      throw new Error(`upsertVaultPartnerFeedbackRecord failed: ${error.message}`)
    }

    const mapped = mapLegacyRow(data as PartnerAccessRequestRow)
    if (!mapped) {
      throw new Error("upsertVaultPartnerFeedbackRecord failed: unable to map row.")
    }

    return mapped
  }

  const { data, error } = await client
    .from("partner_access_requests")
    .insert(payload)
    .select("*")
    .single()

  if (error) {
    throw new Error(`upsertVaultPartnerFeedbackRecord failed: ${error.message}`)
  }

  const mapped = mapLegacyRow(data as PartnerAccessRequestRow)
  if (!mapped) {
    throw new Error("upsertVaultPartnerFeedbackRecord failed: unable to map row.")
  }

  return mapped
}

export async function clearVaultPartnerFeedbackRecord(listingSlug: string, email: string) {
  if (!supabaseAdmin) {
    console.error("clearVaultPartnerFeedbackRecord error:", supabaseAdminConfigError)
    return null
  }

  const normalizedEmail = email.trim().toLowerCase()
  const normalizedSlug = listingSlug.trim()
  let cleared: VaultPartnerFeedbackRecord | null = null

  try {
    if (await hasWorkflowTable("vault_partner_feedback")) {
      const { data, error } = await supabaseAdmin
        .from("vault_partner_feedback")
        .delete()
        .eq("listing_slug", normalizedSlug)
        .eq("email", normalizedEmail)
        .select("*")
        .maybeSingle()

      if (error) {
        if (!isMissingWorkflowTableError(error)) {
          console.error("clearVaultPartnerFeedbackRecord dedicated error:", error.message)
        }
      } else if (data) {
        cleared = mapDedicatedRow(data as Record<string, unknown>)
      }
    }
  } catch (error) {
    console.error("clearVaultPartnerFeedbackRecord dedicated error:", error)
  }

  const existing = await findVaultPartnerFeedbackRecord(normalizedSlug, normalizedEmail)
  if (!existing) {
    return cleared
  }

  const { error } = await supabaseAdmin
    .from("partner_access_requests")
    .delete()
    .eq("id", existing.requestId)

  if (error) {
    throw new Error(`clearVaultPartnerFeedbackRecord failed: ${error.message}`)
  }

  return cleared ?? existing
}

export async function getVaultPartnerFeedbackSummary(
  listingSlug: string
): Promise<VaultPartnerFeedbackSummary> {
  const rows = await listVaultPartnerFeedbackByListing(listingSlug)
  const outcomeCounts = new Map<VaultValidationOutcome, number>()
  const signalCounts = new Map<VaultOperatorFeedbackSignal, number>()

  for (const row of rows) {
    outcomeCounts.set(row.outcome, (outcomeCounts.get(row.outcome) ?? 0) + 1)
    for (const signal of row.feedbackSignals) {
      signalCounts.set(signal, (signalCounts.get(signal) ?? 0) + 1)
    }
  }

  return {
    totalResponses: rows.length,
    outcomeCounts: [...outcomeCounts.entries()]
      .map(([outcome, count]) => ({ outcome, count }))
      .sort((a, b) => b.count - a.count),
    signalCounts: [...signalCounts.entries()]
      .map(([signal, count]) => ({ signal, count }))
      .sort((a, b) => b.count - a.count),
  }
}
