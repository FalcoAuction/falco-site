import fs from "fs"
import path from "path"
import { readSystemState } from "@/lib/system-state-store"

type CandidateManifestItem = {
  leadKey: string
  address?: string | null
  county?: string | null
  distressType?: string | null
  saleStatus?: string | null
  canonicalPropertyKey?: string | null
  slug: string
  packetFileName: string
  listingPayload: Record<string, unknown>
  supabaseRow: Record<string, unknown>
}

type CandidateManifest = {
  generatedAt: string
  count: number
  candidates: CandidateManifestItem[]
}

const VAULT_CANDIDATES_FILE = path.join(process.cwd(), "data", "operator", "vault_candidates.json")

function readManifest(): CandidateManifest {
  if (!fs.existsSync(VAULT_CANDIDATES_FILE)) {
    return { generatedAt: "", count: 0, candidates: [] }
  }

  try {
    const raw = fs.readFileSync(VAULT_CANDIDATES_FILE, "utf8").trim()
    if (!raw) return { generatedAt: "", count: 0, candidates: [] }
    const parsed = JSON.parse(raw) as Partial<CandidateManifest>
    return {
      generatedAt: typeof parsed.generatedAt === "string" ? parsed.generatedAt : "",
      count: Array.isArray(parsed.candidates) ? parsed.candidates.length : 0,
      candidates: Array.isArray(parsed.candidates) ? (parsed.candidates as CandidateManifestItem[]) : [],
    }
  } catch {
    return { generatedAt: "", count: 0, candidates: [] }
  }
}

function normalizeManifest(input: Partial<CandidateManifest> | null | undefined): CandidateManifest {
  return {
    generatedAt: typeof input?.generatedAt === "string" ? input.generatedAt : "",
    count: Array.isArray(input?.candidates) ? input.candidates.length : 0,
    candidates: Array.isArray(input?.candidates) ? (input.candidates as CandidateManifestItem[]) : [],
  }
}

export function listOperatorVaultCandidates() {
  return readManifest().candidates
}

export function findOperatorVaultCandidateByLeadKey(leadKey: string) {
  const target = String(leadKey || "").trim()
  if (!target) return null
  return readManifest().candidates.find((row) => row.leadKey === target) ?? null
}

export async function listOperatorVaultCandidatesLive() {
  const stored = await readSystemState<CandidateManifest>("vault_candidates")
  if (stored?.candidates?.length) {
    return normalizeManifest(stored).candidates
  }

  return listOperatorVaultCandidates()
}

export async function findOperatorVaultCandidateByLeadKeyLive(leadKey: string) {
  const target = String(leadKey || "").trim()
  if (!target) return null

  const candidates = await listOperatorVaultCandidatesLive()
  return candidates.find((row) => row.leadKey === target) ?? null
}
