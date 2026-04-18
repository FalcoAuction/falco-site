import { supabaseAdmin } from "@/lib/supabase-admin"

export const DIALER_NDA_VERSION = "v1"
export const DIALER_NONCIRC_VERSION = "v1"

export type DialerAcceptance = {
  email: string
  callerName: string
  ndaVersion: string
  noncircVersion: string
  acceptedAt: string
}

function normEmail(email: string): string {
  return email.trim().toLowerCase()
}

export async function findDialerAcceptance(email: string): Promise<DialerAcceptance | null> {
  if (!supabaseAdmin) return null
  const { data, error } = await supabaseAdmin
    .from("dialer_acceptances")
    .select("*")
    .eq("email", normEmail(email))
    .maybeSingle()
  if (error) {
    if (error.code === "42P01" || error.code === "PGRST116") return null
    console.error("findDialerAcceptance error:", error.message)
    return null
  }
  if (!data) return null
  return {
    email: String(data.email ?? ""),
    callerName: String(data.caller_name ?? ""),
    ndaVersion: String(data.nda_version ?? ""),
    noncircVersion: String(data.noncirc_version ?? ""),
    acceptedAt: String(data.accepted_at ?? ""),
  }
}

export async function recordDialerAcceptance(args: {
  email: string
  callerName: string
  ipAddress?: string | null
  userAgent?: string | null
}): Promise<DialerAcceptance | null> {
  if (!supabaseAdmin) return null
  const row = {
    email: normEmail(args.email),
    caller_name: args.callerName?.trim() || "",
    nda_version: DIALER_NDA_VERSION,
    noncirc_version: DIALER_NONCIRC_VERSION,
    accepted_at: new Date().toISOString(),
    ip_address: args.ipAddress ?? null,
    user_agent: args.userAgent ?? null,
  }
  const { data, error } = await supabaseAdmin
    .from("dialer_acceptances")
    .upsert(row, { onConflict: "email" })
    .select("*")
    .single()
  if (error) {
    console.error("recordDialerAcceptance error:", error.message)
    return null
  }
  return {
    email: String(data.email),
    callerName: String(data.caller_name),
    ndaVersion: String(data.nda_version),
    noncircVersion: String(data.noncirc_version),
    acceptedAt: String(data.accepted_at),
  }
}
