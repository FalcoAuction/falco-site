import { readdir, readFile } from "node:fs/promises"
import path from "node:path"

export type OutreachCandidate = {
  track: "auction_partner" | "principal_broker"
  rank: number
  score: number
  organization: string
  contact_name: string
  email: string
  website: string
  domain: string
  city: string
  state: string
  reason: string
  snippet: string
  personalized_line: string
  subject: string
  body: string
  query?: string
}

export type OutreachTrackReport = {
  track: "auction_partner" | "principal_broker"
  generatedAt: string | null
  fileName: string | null
  candidates: OutreachCandidate[]
}

export type OutreachReport = {
  generatedAt: string
  sourceMode: "full" | "fallback"
  sourceNote: string
  sourceDir: string
  tracks: OutreachTrackReport[]
}

const TRACKS: Array<OutreachTrackReport["track"]> = [
  "auction_partner",
  "principal_broker",
]

async function readLatestTrackFile(
  outreachDir: string,
  track: OutreachTrackReport["track"]
): Promise<OutreachTrackReport> {
  const names = await readdir(outreachDir)
  const latest = names
    .filter((name) => name.startsWith(`${track}_`) && name.endsWith(".json"))
    .sort()
    .at(-1)

  if (!latest) {
    return {
      track,
      generatedAt: null,
      fileName: null,
      candidates: [],
    }
  }

  const fullPath = path.join(outreachDir, latest)
  const raw = await readFile(fullPath, "utf8")
  const parsed = JSON.parse(raw) as OutreachCandidate[]
  const generatedAt = latest
    .replace(`${track}_`, "")
    .replace(".json", "")

  return {
    track,
    generatedAt,
    fileName: latest,
    candidates: parsed,
  }
}

export async function getOutreachReport(): Promise<OutreachReport> {
  const outreachDir = path.join(process.cwd(), "..", "falco-distress-bots", "out", "outreach")

  try {
    const tracks = await Promise.all(
      TRACKS.map((track) => readLatestTrackFile(outreachDir, track))
    )

    return {
      generatedAt: new Date().toISOString(),
      sourceMode: "full",
      sourceNote:
        "Full outreach mode. Reading the latest review-first auction-partner and principal-broker draft queues from the bots workspace.",
      sourceDir: outreachDir,
      tracks,
    }
  } catch (error) {
    console.warn("getOutreachReport falling back to empty mode", error)
    return {
      generatedAt: new Date().toISOString(),
      sourceMode: "fallback",
      sourceNote:
        "Outreach files are only available in the shared workspace/local environment. The hosted site cannot see the local bots outreach directory.",
      sourceDir: outreachDir,
      tracks: TRACKS.map((track) => ({
        track,
        generatedAt: null,
        fileName: null,
        candidates: [],
      })),
    }
  }
}
