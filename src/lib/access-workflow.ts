import crypto from "crypto"
import { supabaseAdmin } from "@/lib/supabase-admin"

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

function mapRequestRow(row: PartnerAccessRequestRow): AccessRequestRecord {
  return {
    requestId: row.id,
    fullName: row.full_name ?? "",
    email: row.email,
    company: row.company ?? "",
    role: "",
    marketFocus: "",
    accessType: "",
    executionCapacity: "",
    notes: row.notes ?? "",
    submittedAt: row.created_at,
    ipAddress: "",
    userAgent: "",
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

export async function createAccessRequest(
  input: Omit<AccessRequestRecord, "requestId" | "submittedAt" | "status">
) {
  const payload = {
    email: input.email.toLowerCase(),
    full_name: input.fullName,
    company: input.company,
    notes: input.notes,
    status: "pending",
  }

  const { data, error } = await supabaseAdmin
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

  const payload = {
    email: req.email.toLowerCase(),
    approved: true,
    approved_at: new Date().toISOString(),
    notes: approvedBy,
  }

  const { data, error } = await supabaseAdmin
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