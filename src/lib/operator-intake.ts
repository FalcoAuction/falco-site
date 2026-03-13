import crypto from "node:crypto"
import { supabaseAdmin, supabaseAdminConfigError } from "@/lib/supabase-admin"
import {
  hasWorkflowTable,
  isMissingWorkflowTableError,
  requireWorkflowSupabaseAdmin,
} from "@/lib/workflow-store"

export const OPERATOR_INTAKE_COMPANY = "__falco_operator_intake__"

export type OperatorIntakeDecision = "promote" | "hold" | "needs_more_info"

export type OperatorIntakeRecord = {
  leadKey: string
  decision: OperatorIntakeDecision
  note: string
  actedBy: string
  decidedAt: string
}

type PartnerAccessRequestRow = {
  id: string
  email: string
  company: string | null
  notes: string | null
  status: string
  created_at: string
}

type OperatorIntakeNotesPayload = {
  version: 1
  type: "operator_intake"
  leadKey: string
  decision: OperatorIntakeDecision
  note: string
  actedBy: string
}

function requireSupabaseAdmin() {
  return requireWorkflowSupabaseAdmin()
}

function buildIntakeEmail(leadKey: string) {
  const digest = crypto.createHash("sha1").update(leadKey).digest("hex").slice(0, 20)
  return `intake+${digest}@falco.local`
}

function parseIntakeNotes(notes: string | null) {
  if (!notes) return null

  try {
    const parsed = JSON.parse(notes) as Partial<OperatorIntakeNotesPayload>
    if (parsed.version !== 1 || parsed.type !== "operator_intake") return null
    if (typeof parsed.leadKey !== "string") return null
    if (
      parsed.decision !== "promote" &&
      parsed.decision !== "hold" &&
      parsed.decision !== "needs_more_info"
    ) {
      return null
    }

    return {
      version: 1 as const,
      type: "operator_intake" as const,
      leadKey: parsed.leadKey,
      decision: parsed.decision,
      note: typeof parsed.note === "string" ? parsed.note : "",
      actedBy: typeof parsed.actedBy === "string" ? parsed.actedBy : "",
    }
  } catch {
    return null
  }
}

function buildIntakeNotes(payload: Omit<OperatorIntakeNotesPayload, "version" | "type">) {
  return JSON.stringify({
    version: 1,
    type: "operator_intake",
    leadKey: payload.leadKey,
    decision: payload.decision,
    note: payload.note,
    actedBy: payload.actedBy,
  } satisfies OperatorIntakeNotesPayload)
}

function mapIntakeRow(row: PartnerAccessRequestRow): OperatorIntakeRecord | null {
  const notes = parseIntakeNotes(row.notes)
  if (!notes || row.status !== "intake_reviewed") return null

  return {
    leadKey: notes.leadKey,
    decision: notes.decision,
    note: notes.note,
    actedBy: notes.actedBy,
    decidedAt: row.created_at,
  }
}

export async function listOperatorIntakeDecisions() {
  if (!supabaseAdmin) {
    console.error("listOperatorIntakeDecisions error:", supabaseAdminConfigError)
    return []
  }

  const dedicatedRows: OperatorIntakeRecord[] = []

  try {
    if (await hasWorkflowTable("operator_intake_reviews")) {
      const { data, error } = await supabaseAdmin
        .from("operator_intake_reviews")
        .select("*")
        .order("decided_at", { ascending: false })

      if (error) {
        if (!isMissingWorkflowTableError(error)) {
          console.error("listOperatorIntakeDecisions dedicated error:", error.message)
        }
      } else {
        for (const row of data ?? []) {
          dedicatedRows.push({
            leadKey: String(row.lead_key ?? "").trim(),
            decision: row.decision as OperatorIntakeDecision,
            note: String(row.note ?? ""),
            actedBy: String(row.acted_by ?? ""),
            decidedAt: String(row.decided_at ?? ""),
          })
        }
      }
    }
  } catch (error) {
    console.error("listOperatorIntakeDecisions dedicated error:", error)
  }

  const { data, error } = await supabaseAdmin
    .from("partner_access_requests")
    .select("*")
    .eq("company", OPERATOR_INTAKE_COMPANY)
    .eq("status", "intake_reviewed")
    .order("created_at", { ascending: false })

  if (error) {
    console.error("listOperatorIntakeDecisions error:", error.message)
    return []
  }

  const rows = (data ?? [])
    .map((row) => mapIntakeRow(row as PartnerAccessRequestRow))
    .filter((row): row is OperatorIntakeRecord => Boolean(row))

  const deduped = new Map<string, OperatorIntakeRecord>()
  for (const row of dedicatedRows) {
    if (row.leadKey && !deduped.has(row.leadKey)) deduped.set(row.leadKey, row)
  }
  for (const row of rows) {
    if (!deduped.has(row.leadKey)) deduped.set(row.leadKey, row)
  }
  return [...deduped.values()]
}

export async function recordOperatorIntakeDecision(input: {
  leadKey: string
  decision: OperatorIntakeDecision
  note?: string
  actedBy: string
}) {
  const client = requireSupabaseAdmin()

  try {
    if (await hasWorkflowTable("operator_intake_reviews")) {
      const { data, error } = await client
        .from("operator_intake_reviews")
        .upsert(
          {
            lead_key: input.leadKey,
            decision: input.decision,
            note: String(input.note ?? "").trim(),
            acted_by: input.actedBy,
          },
          { onConflict: "lead_key" }
        )
        .select("*")
        .single()

      if (error) {
        if (!isMissingWorkflowTableError(error)) {
          throw new Error(`recordOperatorIntakeDecision failed: ${error.message}`)
        }
      } else {
        return {
          leadKey: String(data.lead_key ?? "").trim(),
          decision: data.decision as OperatorIntakeDecision,
          note: String(data.note ?? ""),
          actedBy: String(data.acted_by ?? ""),
          decidedAt: String(data.decided_at ?? ""),
        }
      }
    }
  } catch (error) {
    if (error instanceof Error) throw error
    throw new Error("recordOperatorIntakeDecision failed.")
  }

  const email = buildIntakeEmail(input.leadKey)

  const { data: existing, error: existingError } = await client
    .from("partner_access_requests")
    .select("*")
    .eq("company", OPERATOR_INTAKE_COMPANY)
    .eq("email", email)
    .maybeSingle()

  if (existingError) {
    throw new Error(`recordOperatorIntakeDecision lookup failed: ${existingError.message}`)
  }

  const payload = {
    email,
    full_name: input.leadKey,
    company: OPERATOR_INTAKE_COMPANY,
    notes: buildIntakeNotes({
      leadKey: input.leadKey,
      decision: input.decision,
      note: String(input.note ?? "").trim(),
      actedBy: input.actedBy,
    }),
    status: "intake_reviewed",
  }

  const query = existing
    ? client.from("partner_access_requests").update(payload).eq("id", (existing as PartnerAccessRequestRow).id)
    : client.from("partner_access_requests").insert(payload)

  const { data, error } = await query.select("*").single()
  if (error) {
    throw new Error(`recordOperatorIntakeDecision failed: ${error.message}`)
  }

  const mapped = mapIntakeRow(data as PartnerAccessRequestRow)
  if (!mapped) {
    throw new Error("recordOperatorIntakeDecision failed: unable to map row.")
  }

  return mapped
}

export async function clearOperatorIntakeDecision(leadKey: string) {
  const client = requireSupabaseAdmin()

  try {
    if (await hasWorkflowTable("operator_intake_reviews")) {
      const { error } = await client
        .from("operator_intake_reviews")
        .delete()
        .eq("lead_key", leadKey)

      if (error) {
        if (!isMissingWorkflowTableError(error)) {
          throw new Error(`clearOperatorIntakeDecision failed: ${error.message}`)
        }
      } else {
        return true
      }
    }
  } catch (error) {
    if (error instanceof Error) throw error
    throw new Error("clearOperatorIntakeDecision failed.")
  }

  const email = buildIntakeEmail(leadKey)

  const { error } = await client
    .from("partner_access_requests")
    .delete()
    .eq("company", OPERATOR_INTAKE_COMPANY)
    .eq("email", email)

  if (error) {
    throw new Error(`clearOperatorIntakeDecision failed: ${error.message}`)
  }

  return true
}
