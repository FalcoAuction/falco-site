import { supabaseAdmin, supabaseAdminConfigError } from "@/lib/supabase-admin"

type WorkflowTableName =
  | "operator_intake_reviews"
  | "operator_task_history"
  | "vault_pursuit_requests"
  | "vault_validation_records"

type WorkflowErrorLike = {
  code?: string
  message?: string
}

const workflowTableAvailability = new Map<WorkflowTableName, boolean>()

export function requireWorkflowSupabaseAdmin() {
  if (!supabaseAdmin) {
    throw new Error(supabaseAdminConfigError ?? "Supabase admin client is not configured.")
  }

  return supabaseAdmin
}

export function isMissingWorkflowTableError(error: WorkflowErrorLike | null | undefined) {
  const code = String(error?.code ?? "").trim()
  const message = String(error?.message ?? "").toLowerCase()

  return (
    code === "42P01" ||
    message.includes("does not exist") ||
    message.includes("could not find the table") ||
    message.includes("relation") && message.includes("does not exist")
  )
}

export async function hasWorkflowTable(tableName: WorkflowTableName) {
  if (workflowTableAvailability.has(tableName)) {
    return workflowTableAvailability.get(tableName) ?? false
  }

  const client = requireWorkflowSupabaseAdmin()
  const { error } = await client.from(tableName).select("*").limit(1)

  if (error) {
    if (isMissingWorkflowTableError(error)) {
      workflowTableAvailability.set(tableName, false)
      return false
    }

    throw new Error(`Workflow table check failed for ${tableName}: ${error.message}`)
  }

  workflowTableAvailability.set(tableName, true)
  return true
}
