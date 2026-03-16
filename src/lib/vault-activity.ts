import { supabaseAdmin, supabaseAdminConfigError } from "@/lib/supabase-admin"
import {
  hasWorkflowTable,
  isMissingWorkflowTableError,
  requireWorkflowSupabaseAdmin,
} from "@/lib/workflow-store"

export const VAULT_ACTIVITY_COMPANY = "__falco_vault_activity__"

export type VaultActivityEventType =
  | "vault_login_verified"
  | "vault_listing_viewed"
  | "vault_packet_viewed"
  | "vault_acceptance_recorded"
  | "vault_pursuit_requested"
  | "vault_feedback_recorded"
  | "vault_feedback_cleared"
  | "vault_logout"

export type VaultActivityRecord = {
  id: string
  eventType: VaultActivityEventType
  email: string
  partnerName: string
  listingSlug: string
  detail: string
  ipAddress: string
  userAgent: string
  actedBy: string
  createdAt: string
  context?: Record<string, string>
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

type VaultActivityNotesPayload = {
  version: 1
  type: "vault_activity"
  listingSlug: string
  partnerName: string
  detail: string
  ipAddress: string
  userAgent: string
  actedBy: string
  context?: Record<string, string>
}

const VALID_VAULT_ACTIVITY_EVENTS = new Set<VaultActivityEventType>([
  "vault_login_verified",
  "vault_listing_viewed",
  "vault_packet_viewed",
  "vault_acceptance_recorded",
  "vault_pursuit_requested",
  "vault_feedback_recorded",
  "vault_feedback_cleared",
  "vault_logout",
])

function normalizeContext(value: unknown) {
  if (!value || typeof value !== "object") return undefined

  const next: Record<string, string> = {}
  for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
    if (typeof raw !== "string") continue
    const normalized = raw.trim()
    if (!normalized) continue
    next[key] = normalized
  }

  return Object.keys(next).length ? next : undefined
}

function buildVaultActivityNotes(
  payload: Omit<VaultActivityNotesPayload, "version" | "type">
) {
  return JSON.stringify({
    version: 1,
    type: "vault_activity",
    listingSlug: payload.listingSlug,
    partnerName: payload.partnerName,
    detail: payload.detail,
    ipAddress: payload.ipAddress,
    userAgent: payload.userAgent,
    actedBy: payload.actedBy,
    context: payload.context,
  } satisfies VaultActivityNotesPayload)
}

function parseVaultActivityNotes(notes: string | null) {
  if (!notes) return null

  try {
    const parsed = JSON.parse(notes) as Partial<VaultActivityNotesPayload>
    if (parsed.version !== 1 || parsed.type !== "vault_activity") return null

    return {
      version: 1 as const,
      type: "vault_activity" as const,
      listingSlug: typeof parsed.listingSlug === "string" ? parsed.listingSlug.trim() : "",
      partnerName: typeof parsed.partnerName === "string" ? parsed.partnerName.trim() : "",
      detail: typeof parsed.detail === "string" ? parsed.detail.trim() : "",
      ipAddress: typeof parsed.ipAddress === "string" ? parsed.ipAddress.trim() : "",
      userAgent: typeof parsed.userAgent === "string" ? parsed.userAgent.trim() : "",
      actedBy: typeof parsed.actedBy === "string" ? parsed.actedBy.trim() : "",
      context: normalizeContext(parsed.context),
    }
  } catch {
    return null
  }
}

function mapLegacyRow(row: PartnerAccessRequestRow): VaultActivityRecord | null {
  const eventType = String(row.status ?? "").trim() as VaultActivityEventType
  if (!VALID_VAULT_ACTIVITY_EVENTS.has(eventType)) return null

  const notes = parseVaultActivityNotes(row.notes)
  if (!notes) return null

  return {
    id: row.id,
    eventType,
    email: row.email,
    partnerName: notes.partnerName || row.full_name || row.email,
    listingSlug: notes.listingSlug,
    detail: notes.detail,
    ipAddress: notes.ipAddress,
    userAgent: notes.userAgent,
    actedBy: notes.actedBy,
    createdAt: row.created_at,
    context: notes.context,
  }
}

function mapDedicatedRow(row: Record<string, unknown>): VaultActivityRecord {
  return {
    id: String(row.id ?? ""),
    eventType: String(row.event_type ?? "") as VaultActivityEventType,
    email: String(row.email ?? ""),
    partnerName: String(row.partner_name ?? row.email ?? ""),
    listingSlug: String(row.listing_slug ?? ""),
    detail: String(row.detail ?? ""),
    ipAddress: String(row.ip_address ?? ""),
    userAgent: String(row.user_agent ?? ""),
    actedBy: String(row.acted_by ?? ""),
    createdAt: String(row.created_at ?? ""),
    context: normalizeContext(row.context),
  }
}

function requireSupabaseAdmin() {
  return requireWorkflowSupabaseAdmin()
}

export async function recordVaultActivity(input: {
  eventType: VaultActivityEventType
  email: string
  partnerName?: string
  listingSlug?: string
  detail?: string
  ipAddress?: string
  userAgent?: string
  actedBy?: string
  context?: Record<string, string>
}) {
  if (!VALID_VAULT_ACTIVITY_EVENTS.has(input.eventType)) {
    throw new Error(`Unsupported vault activity event: ${input.eventType}`)
  }

  const client = requireSupabaseAdmin()
  const normalizedEmail = input.email.trim().toLowerCase()
  const partnerName = input.partnerName?.trim() || normalizedEmail
  const listingSlug = input.listingSlug?.trim() || ""
  const detail = input.detail?.trim() || ""
  const ipAddress = input.ipAddress?.trim() || ""
  const userAgent = input.userAgent?.trim() || ""
  const actedBy = input.actedBy?.trim() || normalizedEmail
  const context = normalizeContext(input.context)

  try {
    if (await hasWorkflowTable("vault_activity_events")) {
      const { data, error } = await client
        .from("vault_activity_events")
        .insert({
          event_type: input.eventType,
          email: normalizedEmail,
          partner_name: partnerName,
          listing_slug: listingSlug,
          detail,
          ip_address: ipAddress,
          user_agent: userAgent,
          acted_by: actedBy,
          context: context ?? {},
        })
        .select("*")
        .single()

      if (error) {
        if (!isMissingWorkflowTableError(error)) {
          throw new Error(`recordVaultActivity failed: ${error.message}`)
        }
      } else {
        return mapDedicatedRow(data as Record<string, unknown>)
      }
    }
  } catch (error) {
    if (error instanceof Error) throw error
    throw new Error("recordVaultActivity failed.")
  }

  const { data, error } = await client
    .from("partner_access_requests")
    .insert({
      email: normalizedEmail,
      full_name: partnerName,
      company: VAULT_ACTIVITY_COMPANY,
      notes: buildVaultActivityNotes({
        listingSlug,
        partnerName,
        detail,
        ipAddress,
        userAgent,
        actedBy,
        context,
      }),
      status: input.eventType,
    })
    .select("*")
    .single()

  if (error) {
    throw new Error(`recordVaultActivity failed: ${error.message}`)
  }

  const mapped = mapLegacyRow(data as PartnerAccessRequestRow)
  if (!mapped) {
    throw new Error("recordVaultActivity failed: unable to map row.")
  }

  return mapped
}

export async function listVaultActivityRecords(limit = 80) {
  if (!supabaseAdmin) {
    console.error("listVaultActivityRecords error:", supabaseAdminConfigError)
    return []
  }

  const dedicatedRows: VaultActivityRecord[] = []

  try {
    if (await hasWorkflowTable("vault_activity_events")) {
      const { data, error } = await supabaseAdmin
        .from("vault_activity_events")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit)

      if (error) {
        if (!isMissingWorkflowTableError(error)) {
          console.error("listVaultActivityRecords dedicated error:", error.message)
        }
      } else {
        for (const row of data ?? []) {
          dedicatedRows.push(mapDedicatedRow(row as Record<string, unknown>))
        }
      }
    }
  } catch (error) {
    console.error("listVaultActivityRecords dedicated error:", error)
  }

  const { data, error } = await supabaseAdmin
    .from("partner_access_requests")
    .select("*")
    .eq("company", VAULT_ACTIVITY_COMPANY)
    .order("created_at", { ascending: false })
    .limit(limit)

  if (error) {
    console.error("listVaultActivityRecords error:", error.message)
    return dedicatedRows
  }

  const legacyRows = (data ?? [])
    .map((row) => mapLegacyRow(row as PartnerAccessRequestRow))
    .filter((row): row is VaultActivityRecord => Boolean(row))

  const deduped = new Map<string, VaultActivityRecord>()
  for (const row of dedicatedRows) {
    deduped.set(row.id, row)
  }
  for (const row of legacyRows) {
    if (!deduped.has(row.id)) deduped.set(row.id, row)
  }

  return [...deduped.values()]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, limit)
}
