import crypto from "crypto"
import fs from "fs"
import path from "path"

const DATA_DIR = path.join(process.cwd(), "data")
const REQUESTS_FILE = path.join(DATA_DIR, "access_requests.ndjson")
const APPROVALS_FILE = path.join(DATA_DIR, "access_approvals.ndjson")

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

function ensureDataStore() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true })
  }

  if (!fs.existsSync(REQUESTS_FILE)) {
    fs.writeFileSync(REQUESTS_FILE, "", "utf8")
  }

  if (!fs.existsSync(APPROVALS_FILE)) {
    fs.writeFileSync(APPROVALS_FILE, "", "utf8")
  }
}

function readNdjson<T>(filePath: string): T[] {
  ensureDataStore()
  const raw = fs.readFileSync(filePath, "utf8")

  return raw
    .split("\n")
    .filter(Boolean)
    .map((line) => {
      try {
        return JSON.parse(line) as T
      } catch {
        return null
      }
    })
    .filter(Boolean) as T[]
}

function writeNdjson<T>(filePath: string, rows: T[]) {
  ensureDataStore()
  const payload = rows.map((row) => JSON.stringify(row)).join("\n")
  fs.writeFileSync(filePath, payload ? payload + "\n" : "", "utf8")
}

export function createAccessRequest(
  input: Omit<AccessRequestRecord, "requestId" | "submittedAt" | "status">
) {
  const request: AccessRequestRecord = {
    requestId: crypto.randomUUID(),
    submittedAt: new Date().toISOString(),
    status: "pending",
    ...input,
  }

  const rows = readNdjson<AccessRequestRecord>(REQUESTS_FILE)
  rows.push(request)
  writeNdjson(REQUESTS_FILE, rows)

  return request
}

export function listAccessRequests() {
  return readNdjson<AccessRequestRecord>(REQUESTS_FILE).sort((a, b) =>
    b.submittedAt.localeCompare(a.submittedAt)
  )
}

export function listPendingAccessRequests() {
  return listAccessRequests().filter((r) => r.status === "pending")
}

export function findAccessRequest(requestId: string) {
  return listAccessRequests().find((r) => r.requestId === requestId) ?? null
}

export function updateAccessRequestStatus(
  requestId: string,
  status: AccessRequestStatus
) {
  const rows = listAccessRequests()
  const idx = rows.findIndex((r) => r.requestId === requestId)

  if (idx === -1) return null

  rows[idx] = { ...rows[idx], status }
  writeNdjson(REQUESTS_FILE, rows)

  return rows[idx]
}

export function rejectAccessRequest(requestId: string) {
  return updateAccessRequestStatus(requestId, "rejected")
}

export function approveAccessRequest(requestId: string, approvedBy: string) {
  const req = findAccessRequest(requestId)
  if (!req) return null

  const updated = updateAccessRequestStatus(requestId, "approved")
  if (!updated) return null

  const existing = readNdjson<AccessApprovalRecord>(APPROVALS_FILE).find(
    (r) => r.requestId === requestId
  )

  if (existing) {
    return existing
  }

  const approval: AccessApprovalRecord = {
    requestId,
    email: req.email.toLowerCase(),
    approvedAt: new Date().toISOString(),
    approvedBy,
    approvalToken: crypto.randomBytes(24).toString("hex"),
  }

  const rows = readNdjson<AccessApprovalRecord>(APPROVALS_FILE)
  rows.push(approval)
  writeNdjson(APPROVALS_FILE, rows)

  return approval
}

export function findApprovalByEmail(email: string) {
  return (
    readNdjson<AccessApprovalRecord>(APPROVALS_FILE).find(
      (r) => r.email.toLowerCase() === email.toLowerCase()
    ) ?? null
  )
}

export function findApprovalByToken(token: string) {
  return (
    readNdjson<AccessApprovalRecord>(APPROVALS_FILE).find(
      (r) => r.approvalToken === token
    ) ?? null
  )
}