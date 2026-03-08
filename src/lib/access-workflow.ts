import crypto from "crypto"
import { supabaseAdmin, supabaseAdminConfigError } from "@/lib/supabase-admin"

export type AccessRequestStatus = "pending" | "approved" | "rejected"

export type AccessRequestRecord = {
  requestId: string
  fullName: string
  email: string
  company: string
  role: string
  marketFocus: string
  accessType: string
  executionCapacity: string
  notes: string
  submittedAt: string
  ipAddress: string
  userAgent: string
  status: AccessRequestStatus
}

export type AccessApprovalRecord = {
  requestId: string
  email: string
  approvedAt: string
  approvedBy: string
  approvalToken: string
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

type PartnerApprovalRow = {
  id: string
  email: string
  approved: boolean
  approved_at: string
  notes: string | null
}

type AccessRequestNotesPayload = {
  version: 1
  notes: string
  role: string
  marketFocus: string
  accessType: string
  executionCapacity: string
  ipAddress: string
  userAgent: string
}

function parseAccessRequestNotes(notes: string | null): AccessRequestNotesPayload | null {
  if (!notes) return null

  try {
    const parsed = JSON.parse(notes) as Partial<AccessRequestNotesPayload>
    if (parsed.version !== 1) return null

    return {
      version: 1,
      notes: typeof parsed.notes === "string" ? parsed.notes : "",
      role: typeof parsed.role === "string" ? parsed.role : "",
      marketFocus: typeof parsed.marketFocus === "string" ? parsed.marketFocus : "",
      accessType: typeof parsed.accessType === "string" ? parsed.accessType : "",
      executionCapacity:
        typeof parsed.executionCapacity === "string" ? parsed.executionCapacity : "",
      ipAddress: typeof parsed.ipAddress === "string" ? parsed.ipAddress : "",
      userAgent: typeof parsed.userAgent === "string" ? parsed.userAgent : "",
    }
  } catch {
    return null
  }
}

function buildAccessRequestNotes(
  input: Omit<AccessRequestRecord, "requestId" | "submittedAt" | "status">
) {
  return JSON.stringify({
    version: 1,
    notes: input.notes,
    role: input.role,
    marketFocus: input.marketFocus,
    accessType: input.accessType,
    executionCapacity: input.executionCapacity,
    ipAddress: input.ipAddress,
    userAgent: input.userAgent,
  } satisfies AccessRequestNotesPayload)
}

function mapRequestRow(row: PartnerAccessRequestRow): AccessRequestRecord {
  const parsedNotes = parseAccessRequestNotes(row.notes)

  return {
    requestId: row.id,
    fullName: row.full_name ?? "",
    email: row.email,
    company: row.company ?? "",
    role: parsedNotes?.role ?? "",
    marketFocus: parsedNotes?.marketFocus ?? "",
    accessType: parsedNotes?.accessType ?? "",
    executionCapacity: parsedNotes?.executionCapacity ?? "",
    notes: parsedNotes?.notes ?? row.notes ?? "",
    submittedAt: row.created_at,
    ipAddress: parsedNotes?.ipAddress ?? "",
    userAgent: parsedNotes?.userAgent ?? "",
    status:
      row.status === "approved" || row.status === "rejected"
        ? row.status
        : "pending",
  }
}

function mapApprovalRow(row: PartnerApprovalRow): AccessApprovalRecord {
  return {
    requestId: row.id,
    email: row.email,
    approvedAt: row.approved_at,
    approvedBy: row.notes ?? "FALCO Admin",
  approvalToken: row.id,
  }
}

function requireSupabaseAdmin() {
  if (!supabaseAdmin) {
    throw new Error(supabaseAdminConfigError ?? "Supabase admin client is not configured.")
  }

  return supabaseAdmin
}

export async function createAccessRequest(
  input: Omit<AccessRequestRecord, "requestId" | "submittedAt" | "status">
) {
  const client = requireSupabaseAdmin()
  const payload = {
    email: input.email.toLowerCase(),
    full_name: input.fullName,
    company: input.company,
    notes: buildAccessRequestNotes(input),
    status: "pending",
  }

  const { data, error } = await client
    .from("partner_access_requests")
    .insert(payload)
    .select("*")
    .single()

  if (error) {
    throw new Error(`createAccessRequest failed: ${error.message}`)
  }

  return mapRequestRow(data as PartnerAccessRequestRow)
}

export async function listAccessRequests() {
  if (!supabaseAdmin) {
    console.error("listAccessRequests error:", supabaseAdminConfigError)
    return []
  }

  const { data, error } = await supabaseAdmin
    .from("partner_access_requests")
    .select("*")
    .order("created_at", { ascending: false })

  if (error) {
    console.error("listAccessRequests error:", error.message)
    return []
  }

  return (data ?? []).map((row) => mapRequestRow(row as PartnerAccessRequestRow))
}

export async function listPendingAccessRequests() {
  const rows = await listAccessRequests()
  return rows.filter((r) => r.status === "pending")
}

export async function findAccessRequest(requestId: string) {
  if (!supabaseAdmin) {
    console.error("findAccessRequest error:", supabaseAdminConfigError)
    return null
  }

  const { data, error } = await supabaseAdmin
    .from("partner_access_requests")
    .select("*")
    .eq("id", requestId)
    .maybeSingle()

  if (error) {
    console.error("findAccessRequest error:", error.message)
    return null
  }

  if (!data) return null
  return mapRequestRow(data as PartnerAccessRequestRow)
}

export async function updateAccessRequestStatus(
  requestId: string,
  status: AccessRequestStatus
) {
  if (!supabaseAdmin) {
    console.error("updateAccessRequestStatus error:", supabaseAdminConfigError)
    return null
  }

  const { data, error } = await supabaseAdmin
    .from("partner_access_requests")
    .update({ status })
    .eq("id", requestId)
    .select("*")
    .maybeSingle()

  if (error) {
    console.error("updateAccessRequestStatus error:", error.message)
    return null
  }

  if (!data) return null
  return mapRequestRow(data as PartnerAccessRequestRow)
}

export async function rejectAccessRequest(requestId: string) {
  return updateAccessRequestStatus(requestId, "rejected")
}

export async function approveAccessRequest(requestId: string, approvedBy: string) {
  const req = await findAccessRequest(requestId)
  if (!req) return null

  const updated = await updateAccessRequestStatus(requestId, "approved")
  if (!updated) return null

  const existing = await findApprovalByEmail(req.email)
  if (existing) {
    return existing
  }

  const client = requireSupabaseAdmin()
  const payload = {
    email: req.email.toLowerCase(),
    approved: true,
    approved_at: new Date().toISOString(),
    notes: approvedBy,
  }

  const { data, error } = await client
    .from("partner_approvals")
    .upsert(payload, { onConflict: "email" })
    .select("*")
    .single()

  if (error) {
    console.error("approveAccessRequest error:", error.message)
    return null
  }

  return mapApprovalRow(data as PartnerApprovalRow)
}

export async function findApprovalByEmail(email: string) {
  if (!supabaseAdmin) {
    console.error("findApprovalByEmail error:", supabaseAdminConfigError)
    return null
  }

  const { data, error } = await supabaseAdmin
    .from("partner_approvals")
    .select("*")
    .eq("email", email.toLowerCase())
    .eq("approved", true)
    .maybeSingle()

  if (error) {
    console.error("findApprovalByEmail error:", error.message)
    return null
  }

  if (!data) return null
  return mapApprovalRow(data as PartnerApprovalRow)
}

export async function findApprovalByToken(token: string) {
  if (!supabaseAdmin) {
    console.error("findApprovalByToken error:", supabaseAdminConfigError)
    return null
  }

  const { data, error } = await supabaseAdmin
    .from("partner_approvals")
    .select("*")
    .eq("id", token)
    .eq("approved", true)
    .maybeSingle()

  if (error) {
    console.error("findApprovalByToken error:", error.message)
    return null
  }

  if (!data) return null
  return mapApprovalRow(data as PartnerApprovalRow)
}
