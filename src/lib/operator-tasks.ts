import crypto from "node:crypto"
import { supabaseAdmin, supabaseAdminConfigError } from "@/lib/supabase-admin"
import {
  hasWorkflowTable,
  isMissingWorkflowTableError,
  requireWorkflowSupabaseAdmin,
} from "@/lib/workflow-store"

export const OPERATOR_TASK_COMPANY = "__falco_operator_task__"

export type OperatorTaskSection = "intake" | "approvals" | "routing" | "vault"

export type OperatorTaskHistoryItem = {
  id: string
  title: string
  detail: string
  section: OperatorTaskSection
  completedAt: string
  completedBy: string
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

type OperatorTaskNotesPayload = {
  version: 1
  type: "operator_task"
  taskId: string
  title: string
  detail: string
  section: OperatorTaskSection
  completedBy: string
}

function requireSupabaseAdmin() {
  return requireWorkflowSupabaseAdmin()
}

function parseOperatorTaskNotes(notes: string | null) {
  if (!notes) return null

  try {
    const parsed = JSON.parse(notes) as Partial<OperatorTaskNotesPayload>
    if (parsed.version !== 1 || parsed.type !== "operator_task") return null

    const section =
      parsed.section === "approvals" ||
      parsed.section === "routing" ||
      parsed.section === "vault" ||
      parsed.section === "intake"
        ? parsed.section
        : "vault"

    return {
      version: 1 as const,
      type: "operator_task" as const,
      taskId: typeof parsed.taskId === "string" ? parsed.taskId : "",
      title: typeof parsed.title === "string" ? parsed.title : "",
      detail: typeof parsed.detail === "string" ? parsed.detail : "",
      section,
      completedBy: typeof parsed.completedBy === "string" ? parsed.completedBy : "",
    }
  } catch {
    return null
  }
}

function buildOperatorTaskNotes(payload: Omit<OperatorTaskNotesPayload, "version" | "type">) {
  return JSON.stringify({
    version: 1,
    type: "operator_task",
    taskId: payload.taskId,
    title: payload.title,
    detail: payload.detail,
    section: payload.section,
    completedBy: payload.completedBy,
  } satisfies OperatorTaskNotesPayload)
}

function buildTaskEmail(taskId: string) {
  const digest = crypto.createHash("sha1").update(taskId).digest("hex").slice(0, 20)
  return `task+${digest}@falco.local`
}

function mapTaskRow(row: PartnerAccessRequestRow): OperatorTaskHistoryItem | null {
  const notes = parseOperatorTaskNotes(row.notes)
  if (!notes || row.status !== "task_completed") return null

  return {
    id: notes.taskId,
    title: notes.title,
    detail: notes.detail,
    section: notes.section,
    completedAt: row.created_at,
    completedBy: notes.completedBy,
  }
}

export async function listOperatorTaskHistory() {
  if (!supabaseAdmin) {
    console.error("listOperatorTaskHistory error:", supabaseAdminConfigError)
    return []
  }

  const dedicatedRows: OperatorTaskHistoryItem[] = []

  try {
    if (await hasWorkflowTable("operator_task_history")) {
      const { data, error } = await supabaseAdmin
        .from("operator_task_history")
        .select("*")
        .order("completed_at", { ascending: false })

      if (error) {
        if (!isMissingWorkflowTableError(error)) {
          console.error("listOperatorTaskHistory dedicated error:", error.message)
        }
      } else {
        for (const row of data ?? []) {
          dedicatedRows.push({
            id: String(row.task_id ?? "").trim(),
            title: String(row.title ?? ""),
            detail: String(row.detail ?? ""),
            section: row.section as OperatorTaskSection,
            completedAt: String(row.completed_at ?? ""),
            completedBy: String(row.completed_by ?? ""),
          })
        }
      }
    }
  } catch (error) {
    console.error("listOperatorTaskHistory dedicated error:", error)
  }

  const { data, error } = await supabaseAdmin
    .from("partner_access_requests")
    .select("*")
    .eq("company", OPERATOR_TASK_COMPANY)
    .eq("status", "task_completed")
    .order("created_at", { ascending: false })

  if (error) {
    console.error("listOperatorTaskHistory error:", error.message)
    return []
  }

  const legacyRows = (data ?? [])
    .map((row) => mapTaskRow(row as PartnerAccessRequestRow))
    .filter((row): row is OperatorTaskHistoryItem => Boolean(row))

  const deduped = new Map<string, OperatorTaskHistoryItem>()
  for (const row of dedicatedRows) {
    if (row.id && !deduped.has(row.id)) deduped.set(row.id, row)
  }
  for (const row of legacyRows) {
    if (!deduped.has(row.id)) deduped.set(row.id, row)
  }

  return [...deduped.values()]
}

export async function completeOperatorTask(input: {
  taskId: string
  title: string
  detail: string
  section: OperatorTaskSection
  completedBy: string
}) {
  const client = requireSupabaseAdmin()

  try {
    if (await hasWorkflowTable("operator_task_history")) {
      const { data, error } = await client
        .from("operator_task_history")
        .upsert(
          {
            task_id: input.taskId,
            title: input.title,
            detail: input.detail,
            section: input.section,
            completed_by: input.completedBy,
          },
          { onConflict: "task_id" }
        )
        .select("*")
        .single()

      if (error) {
        if (!isMissingWorkflowTableError(error)) {
          throw new Error(`completeOperatorTask failed: ${error.message}`)
        }
      } else {
        return {
          id: String(data.task_id ?? "").trim(),
          title: String(data.title ?? ""),
          detail: String(data.detail ?? ""),
          section: data.section as OperatorTaskSection,
          completedAt: String(data.completed_at ?? ""),
          completedBy: String(data.completed_by ?? ""),
        }
      }
    }
  } catch (error) {
    if (error instanceof Error) throw error
    throw new Error("completeOperatorTask failed.")
  }

  const email = buildTaskEmail(input.taskId)

  const { data: existing, error: existingError } = await client
    .from("partner_access_requests")
    .select("*")
    .eq("company", OPERATOR_TASK_COMPANY)
    .eq("email", email)
    .maybeSingle()

  if (existingError) {
    throw new Error(`completeOperatorTask lookup failed: ${existingError.message}`)
  }

  const payload = {
    email,
    full_name: input.title,
    company: OPERATOR_TASK_COMPANY,
    notes: buildOperatorTaskNotes(input),
    status: "task_completed",
  }

  const query = existing
    ? client
        .from("partner_access_requests")
        .update(payload)
        .eq("id", (existing as PartnerAccessRequestRow).id)
    : client.from("partner_access_requests").insert(payload)

  const { data, error } = await query.select("*").single()

  if (error) {
    throw new Error(`completeOperatorTask failed: ${error.message}`)
  }

  const mapped = mapTaskRow(data as PartnerAccessRequestRow)
  if (!mapped) {
    throw new Error("completeOperatorTask failed: unable to map row.")
  }

  return mapped
}

export async function restoreOperatorTask(taskId: string) {
  const client = requireSupabaseAdmin()

  try {
    if (await hasWorkflowTable("operator_task_history")) {
      const { error } = await client
        .from("operator_task_history")
        .delete()
        .eq("task_id", taskId)

      if (error) {
        if (!isMissingWorkflowTableError(error)) {
          throw new Error(`restoreOperatorTask failed: ${error.message}`)
        }
      } else {
        return true
      }
    }
  } catch (error) {
    if (error instanceof Error) throw error
    throw new Error("restoreOperatorTask failed.")
  }

  const email = buildTaskEmail(taskId)

  const { error } = await client
    .from("partner_access_requests")
    .delete()
    .eq("company", OPERATOR_TASK_COMPANY)
    .eq("email", email)

  if (error) {
    throw new Error(`restoreOperatorTask failed: ${error.message}`)
  }

  return true
}
