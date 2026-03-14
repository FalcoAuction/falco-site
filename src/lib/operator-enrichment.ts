import crypto from "node:crypto"
import { hasWorkflowTable, isMissingWorkflowTableError, requireWorkflowSupabaseAdmin } from "@/lib/workflow-store"

export const OPERATOR_ENRICHMENT_COMPANY = "__falco_operator_enrichment__"

export type OperatorEnrichmentStatus =
  | "requested"
  | "processing"
  | "completed"
  | "failed"

export type OperatorEnrichmentRequest = {
  leadKey: string
  status: OperatorEnrichmentStatus
  note: string
  requestedBy: string
  requestedAt: string
  updatedAt: string
  resultMessage: string
}

type PartnerAccessRequestRow = {
  id: string
  email: string
  company: string | null
  notes: string | null
  status: string
  created_at: string
}

type EnrichmentNotesPayload = {
  version: 1
  type: "operator_enrichment"
  leadKey: string
  note: string
  requestedBy: string
  resultMessage: string
  updatedAt?: string
}

function buildEnrichmentEmail(leadKey: string) {
  const digest = crypto.createHash("sha1").update(leadKey).digest("hex").slice(0, 20)
  return `enrichment+${digest}@falco.local`
}

function parseStatus(status: string | null | undefined): OperatorEnrichmentStatus | null {
  const value = String(status ?? "").trim()
  if (value === "enrichment_requested") return "requested"
  if (value === "enrichment_processing") return "processing"
  if (value === "enrichment_completed") return "completed"
  if (value === "enrichment_failed") return "failed"
  return null
}

function buildStatus(status: OperatorEnrichmentStatus) {
  if (status === "requested") return "enrichment_requested"
  if (status === "processing") return "enrichment_processing"
  if (status === "completed") return "enrichment_completed"
  return "enrichment_failed"
}

function parseEnrichmentNotes(notes: string | null) {
  if (!notes) return null

  try {
    const parsed = JSON.parse(notes) as Partial<EnrichmentNotesPayload>
    if (parsed.version !== 1 || parsed.type !== "operator_enrichment") return null
    if (typeof parsed.leadKey !== "string") return null
    return {
      version: 1 as const,
      type: "operator_enrichment" as const,
      leadKey: parsed.leadKey,
      note: typeof parsed.note === "string" ? parsed.note : "",
      requestedBy: typeof parsed.requestedBy === "string" ? parsed.requestedBy : "",
      resultMessage: typeof parsed.resultMessage === "string" ? parsed.resultMessage : "",
      updatedAt: typeof parsed.updatedAt === "string" ? parsed.updatedAt : undefined,
    }
  } catch {
    return null
  }
}

function buildEnrichmentNotes(payload: Omit<EnrichmentNotesPayload, "version" | "type">) {
  return JSON.stringify({
    version: 1,
    type: "operator_enrichment",
    leadKey: payload.leadKey,
    note: payload.note,
    requestedBy: payload.requestedBy,
    resultMessage: payload.resultMessage,
    updatedAt: payload.updatedAt,
  } satisfies EnrichmentNotesPayload)
}

function mapEnrichmentRow(row: PartnerAccessRequestRow): OperatorEnrichmentRequest | null {
  const notes = parseEnrichmentNotes(row.notes)
  const status = parseStatus(row.status)
  if (!notes || !status) return null

  return {
    leadKey: notes.leadKey,
    status,
    note: notes.note,
    requestedBy: notes.requestedBy,
    requestedAt: row.created_at,
    updatedAt: notes.updatedAt || row.created_at,
    resultMessage: notes.resultMessage,
  }
}

export async function listOperatorEnrichmentRequests() {
  const client = requireWorkflowSupabaseAdmin()
  const rows: OperatorEnrichmentRequest[] = []

  try {
    if (await hasWorkflowTable("operator_intake_reviews")) {
      // No dedicated enrichment table exists yet. Keep compatibility-only path for now.
    }
  } catch (error) {
    if (!(error instanceof Error) || !isMissingWorkflowTableError(error)) {
      console.error("listOperatorEnrichmentRequests table check error:", error)
    }
  }

  const { data, error } = await client
    .from("partner_access_requests")
    .select("*")
    .eq("company", OPERATOR_ENRICHMENT_COMPANY)
    .order("created_at", { ascending: false })

  if (error) {
    throw new Error(`listOperatorEnrichmentRequests failed: ${error.message}`)
  }

  for (const row of data ?? []) {
    const mapped = mapEnrichmentRow(row as PartnerAccessRequestRow)
    if (mapped) rows.push(mapped)
  }

  const deduped = new Map<string, OperatorEnrichmentRequest>()
  for (const row of rows) {
    if (!row.leadKey || deduped.has(row.leadKey)) continue
    deduped.set(row.leadKey, row)
  }

  return [...deduped.values()]
}

export async function requestOperatorEnrichment(input: {
  leadKey: string
  note?: string
  requestedBy: string
}) {
  const client = requireWorkflowSupabaseAdmin()
  const email = buildEnrichmentEmail(input.leadKey)
  const note = String(input.note ?? "").trim()
  const requestedBy = String(input.requestedBy || "FALCO Operator").trim() || "FALCO Operator"

  const { data: existing, error: existingError } = await client
    .from("partner_access_requests")
    .select("*")
    .eq("company", OPERATOR_ENRICHMENT_COMPANY)
    .eq("email", email)
    .maybeSingle()

  if (existingError) {
    throw new Error(`requestOperatorEnrichment lookup failed: ${existingError.message}`)
  }

  const payload = {
    email,
    full_name: input.leadKey,
    company: OPERATOR_ENRICHMENT_COMPANY,
    notes: buildEnrichmentNotes({
      leadKey: input.leadKey,
      note,
      requestedBy,
      resultMessage: "",
      updatedAt: new Date().toISOString(),
    }),
    status: buildStatus("requested"),
  }

  const query = existing
    ? client.from("partner_access_requests").update(payload).eq("id", (existing as PartnerAccessRequestRow).id)
    : client.from("partner_access_requests").insert(payload)

  const { data, error } = await query.select("*").single()
  if (error) {
    throw new Error(`requestOperatorEnrichment failed: ${error.message}`)
  }

  const mapped = mapEnrichmentRow(data as PartnerAccessRequestRow)
  if (!mapped) {
    throw new Error("requestOperatorEnrichment failed: unable to map row.")
  }

  return mapped
}
