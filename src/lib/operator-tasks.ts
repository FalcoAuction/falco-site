import crypto from "node:crypto"
import { supabaseAdmin, supabaseAdminConfigError } from "@/lib/supabase-admin"

export const OPERATOR_TASK_COMPANY = "__falco_operator_task__"

export type OperatorTaskSection = "approvals" | "routing" | "vault" | "outreach"

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
  if (!supabaseAdmin) {
    throw new Error(supabaseAdminConfigError ?? "Supabase admin client is not configured.")
  }

  return supabaseAdmin
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
      parsed.section === "outreach"
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

  return (data ?? [])
    .map((row) => mapTaskRow(row as PartnerAccessRequestRow))
    .filter((row): row is OperatorTaskHistoryItem => Boolean(row))
}

export async function completeOperatorTask(input: {
  taskId: string
  title: string
  detail: string
  section: OperatorTaskSection
  completedBy: string
}) {
  const client = requireSupabaseAdmin()
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
