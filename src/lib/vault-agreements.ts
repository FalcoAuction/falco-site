import fs from "fs"
import path from "path"

export const NDA_VERSION = "v1.0"
export const NON_CIRC_VERSION = "v1.0"

export type VaultAcceptanceRecord = {
  listingSlug: string
  fullName: string
  email: string
  ndaVersion: string
  nonCircVersion: string
  acceptedAt: string
  ipAddress: string
  userAgent: string
}

const DATA_DIR = path.join(process.cwd(), "data")
const ACCEPTANCE_LOG = path.join(DATA_DIR, "vault_acceptances.ndjson")

export function ensureVaultDataStore() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true })
  }

  if (!fs.existsSync(ACCEPTANCE_LOG)) {
    fs.writeFileSync(ACCEPTANCE_LOG, "", "utf8")
  }
}

export function appendVaultAcceptance(record: VaultAcceptanceRecord) {
  ensureVaultDataStore()
  fs.appendFileSync(ACCEPTANCE_LOG, JSON.stringify(record) + "\n", "utf8")
}

export function findVaultAcceptance(listingSlug: string, email: string) {
  ensureVaultDataStore()

  const raw = fs.readFileSync(ACCEPTANCE_LOG, "utf8")
  const lines = raw.split("\n").filter(Boolean)

  for (let i = lines.length - 1; i >= 0; i -= 1) {
    try {
      const row = JSON.parse(lines[i]) as VaultAcceptanceRecord
      if (
        row.listingSlug.toLowerCase() === listingSlug.toLowerCase() &&
        row.email.toLowerCase() === email.toLowerCase()
      ) {
        return row
      }
    } catch {
      continue
    }
  }

  return null
}