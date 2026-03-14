import { supabaseAdmin, supabaseAdminConfigError } from "@/lib/supabase-admin"

type SystemStateKey = "operator_report" | "vault_candidates"

type PartnerAccessRequestStateRow = {
  id: string
  email: string
  full_name: string | null
  company: string | null
  notes: string | null
  status: string
  created_at: string
}

type StoredSystemStateEnvelope<T> = {
  version: 1
  key: SystemStateKey
  updatedAt: string
  payload: T
}

const SYSTEM_STATE_COMPANY = "__falco_system_state__"

function requireSupabaseAdmin() {
  if (!supabaseAdmin) {
    throw new Error(supabaseAdminConfigError ?? "Supabase admin client is not configured.")
  }

  return supabaseAdmin
}

function getSystemStateEmail(key: SystemStateKey) {
  return `state+${key}@falco.local`
}

function buildEnvelope<T>(key: SystemStateKey, payload: T): StoredSystemStateEnvelope<T> {
  return {
    version: 1,
    key,
    updatedAt: new Date().toISOString(),
    payload,
  }
}

function parseEnvelope<T>(key: SystemStateKey, notes: string | null) {
  if (!notes) return null

  try {
    const parsed = JSON.parse(notes) as Partial<StoredSystemStateEnvelope<T>>
    if (parsed.version !== 1 || parsed.key !== key || parsed.payload === undefined) {
      return null
    }

    return {
      version: 1 as const,
      key,
      updatedAt: typeof parsed.updatedAt === "string" ? parsed.updatedAt : "",
      payload: parsed.payload as T,
    }
  } catch {
    return null
  }
}

export async function readSystemState<T>(key: SystemStateKey): Promise<T | null> {
  if (!supabaseAdmin) {
    return null
  }

  const client = requireSupabaseAdmin()
  const { data, error } = await client
    .from("partner_access_requests")
    .select("id,email,full_name,company,notes,status,created_at")
    .eq("company", SYSTEM_STATE_COMPANY)
    .eq("status", "state_snapshot")
    .eq("email", getSystemStateEmail(key))
    .order("created_at", { ascending: false })
    .limit(1)

  if (error) {
    console.error(`readSystemState(${key}) failed:`, error.message)
    return null
  }

  const row = ((data ?? [])[0] ?? null) as PartnerAccessRequestStateRow | null
  if (!row) return null

  return parseEnvelope<T>(key, row.notes)?.payload ?? null
}

export async function writeSystemState<T>(key: SystemStateKey, payload: T): Promise<void> {
  const client = requireSupabaseAdmin()
  const email = getSystemStateEmail(key)
  const envelope = JSON.stringify(buildEnvelope(key, payload))

  const { data: existingRows, error: fetchError } = await client
    .from("partner_access_requests")
    .select("id")
    .eq("company", SYSTEM_STATE_COMPANY)
    .eq("status", "state_snapshot")
    .eq("email", email)
    .order("created_at", { ascending: false })

  if (fetchError) {
    throw new Error(`writeSystemState(${key}) lookup failed: ${fetchError.message}`)
  }

  const existing = (existingRows ?? []) as Array<{ id: string }>
  const latestId = existing[0]?.id ?? null

  if (latestId) {
    const { error } = await client
      .from("partner_access_requests")
      .update({
        full_name: key,
        company: SYSTEM_STATE_COMPANY,
        notes: envelope,
        status: "state_snapshot",
      })
      .eq("id", latestId)

    if (error) {
      throw new Error(`writeSystemState(${key}) update failed: ${error.message}`)
    }

    const duplicateIds = existing.slice(1).map((row) => row.id).filter(Boolean)
    if (duplicateIds.length) {
      const { error: deleteError } = await client
        .from("partner_access_requests")
        .delete()
        .in("id", duplicateIds)

      if (deleteError) {
        console.warn(`writeSystemState(${key}) duplicate cleanup failed:`, deleteError.message)
      }
    }

    return
  }

  const { error } = await client.from("partner_access_requests").insert({
    email,
    full_name: key,
    company: SYSTEM_STATE_COMPANY,
    notes: envelope,
    status: "state_snapshot",
  })

  if (error) {
    throw new Error(`writeSystemState(${key}) insert failed: ${error.message}`)
  }
}

