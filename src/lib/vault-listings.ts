import fs from "fs"
import path from "path"
import {
  listVaultPartnerFeedbackRecords,
  type VaultPartnerFeedbackRecord,
} from "@/lib/vault-feedback"
import { supabaseAdmin, supabaseAdminConfigError } from "@/lib/supabase-admin"
import {
  getVaultRoutingSnapshot,
  getVaultRoutingSnapshotsForListings,
  getVaultValidationRecordByListing,
  listVaultValidationRecords,
  type VaultOperatorFeedbackSignal,
  type VaultValidationContext,
  getVaultValidationSnapshotsForListings,
  type VaultExecutionLane,
  type VaultRoutingState,
  type VaultValidationOutcome,
} from "@/lib/vault-pursuit"

export type VaultListingStatus = "active" | "claimed" | "expired"

export type VaultListing = {
  slug: string
  title: string
  market: string
  county: string
  status: VaultListingStatus
  distressType: string
  auctionWindow: string
  summary: string
  publicTeaser: string

  packetUrl: string
  packetLabel: string
  packetFileName?: string

  sourceLeadKey: string
  createdAt: string
  expiresAt?: string
  claimedAt?: string
  claimedBy?: string

  falcoScore?: number | null
  auctionReadiness?: string
  equityBand?: string
  dtsDays?: number | null
  currentSaleDate?: string
  originalSaleDate?: string
  distressRecordedAt?: string
  contactReady?: boolean
  propertyIdentifier?: string
  ownerName?: string
  ownerMail?: string
  lastSaleDate?: string
  mortgageDate?: string
  mortgageLender?: string
  mortgageAmount?: number | null
  yearBuilt?: number | null
  buildingAreaSqft?: number | null
  beds?: number | null
  baths?: number | null
  contactPathQuality?: string
  controlParty?: string
  ownerAgency?: string
  interventionWindow?: string
  lenderControlIntensity?: string
  influenceability?: string
  executionPosture?: string
  workabilityBand?: string
  debtConfidence?: string
  prefcLiveQuality?: boolean
  prefcLiveReviewReasons?: string[]
  suggestedExecutionLane?: VaultExecutionLane
  suggestedLaneConfidence?: string
  suggestedLaneReasons?: string[]
  suggestionSource?: "rules" | "operator_feedback"
  suggestedLaneFeedbackCount?: number
  validationOutcome?: VaultValidationOutcome
  executionLane?: VaultExecutionLane
  validationNote?: string
  validatedAt?: string
  validatedBy?: string
  topTierReady?: boolean
  vaultPublishReady?: boolean
  dataNotes?: string[]
  routingState?: VaultRoutingState
  routingReservedByEmail?: string
  routingReservedByName?: string
  pursuitRequestCount?: number
}

type VaultListingRow = {
  slug: string
  title: string | null
  county: string | null
  state: string | null
  falco_score: number | null
  auction_readiness: string | null
  equity_band: string | null
  dts_days: number | null
  packet_path: string | null
  is_active: boolean | null
  created_at: string
}

type LocalVaultListingOverlay = Partial<VaultListing> & {
  slug: string
}

type ListingSuggestionSummary = {
  suggestedExecutionLane?: VaultExecutionLane
  suggestedLaneConfidence?: string
  suggestedLaneReasons?: string[]
  suggestionSource?: "rules" | "operator_feedback"
  suggestedLaneFeedbackCount?: number
}

type LearningFeedbackRecord = Pick<
  VaultPartnerFeedbackRecord,
  "listingSlug" | "outcome" | "executionLane" | "feedbackSignals" | "context"
>

const LOCAL_VAULT_LISTINGS_FILE = path.join(process.cwd(), "data", "vault_listings.ndjson")
const VAULT_CANDIDATE_FILE = path.join(process.cwd(), "data", "operator", "vault_candidates.json")

function parseVaultDate(value?: string | null) {
  const raw = String(value ?? "").trim()
  if (!raw) return null

  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw)
  if (dateOnly) {
    const [, year, month, day] = dateOnly
    return new Date(Date.UTC(Number(year), Number(month) - 1, Number(day), 12))
  }

  const parsed = new Date(raw)
  if (Number.isNaN(parsed.getTime())) return null
  return parsed
}

function calculateDynamicDts(currentSaleDate?: string | null, fallback?: number | null) {
  const saleDate = parseVaultDate(currentSaleDate)
  if (!saleDate) return fallback ?? null

  const now = new Date()
  const todayAnchor = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 12)
  )
  return Math.round((saleDate.getTime() - todayAnchor.getTime()) / 86_400_000)
}

function formatSaleWindow(
  distressType?: string | null,
  currentSaleDate?: string | null,
  dtsDays?: number | null,
  fallback?: string | null
) {
  const saleDate = parseVaultDate(currentSaleDate)
  if (saleDate) {
    return `Sale ${saleDate.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      timeZone: "UTC",
    })}`
  }

  if (String(distressType ?? "").toLowerCase().includes("pre-foreclosure")) {
    return "Pre-Foreclosure"
  }

  if (typeof dtsDays === "number") {
    return dtsDays < 0 ? "Expired" : `${dtsDays} Days`
  }

  return fallback ?? "Confidential"
}

function deriveListingStatus(
  row: VaultListingRow,
  currentSaleDate?: string | null,
  dtsDays?: number | null
): VaultListingStatus {
  if (row.is_active === false) return "expired"
  if (typeof dtsDays === "number" && dtsDays < 0) return "expired"
  if (parseVaultDate(currentSaleDate) && (calculateDynamicDts(currentSaleDate, dtsDays) ?? 0) < 0) {
    return "expired"
  }
  return "active"
}

function hasRequiredDebtContext(overlay?: LocalVaultListingOverlay) {
  const lender = String(overlay?.mortgageLender ?? "").trim()
  const amount = overlay?.mortgageAmount
  return Boolean(lender) && typeof amount === "number" && Number.isFinite(amount)
}

function loadLocalVaultListingOverlay() {
  const overlays = new Map<string, LocalVaultListingOverlay>()

  if (!fs.existsSync(LOCAL_VAULT_LISTINGS_FILE)) {
    return overlays
  }

  const raw = fs.readFileSync(LOCAL_VAULT_LISTINGS_FILE, "utf8").trim()
  if (!raw) return overlays

  for (const line of raw.split("\n")) {
    const trimmed = line.trim()
    if (!trimmed) continue

    try {
      const row = JSON.parse(trimmed) as LocalVaultListingOverlay
      if (row?.slug) overlays.set(row.slug, row)
    } catch {
      continue
    }
  }

  return overlays
}

function loadVaultCandidateOverlay() {
  const overlays = new Map<string, LocalVaultListingOverlay>()

  if (!fs.existsSync(VAULT_CANDIDATE_FILE)) {
    return overlays
  }

  try {
    const raw = fs.readFileSync(VAULT_CANDIDATE_FILE, "utf8").trim()
    if (!raw) return overlays
    const parsed = JSON.parse(raw) as {
      candidates?: Array<{ slug?: string; listingPayload?: LocalVaultListingOverlay }>
    }
    for (const row of parsed.candidates ?? []) {
      const payload = row?.listingPayload
      const slug = String(row?.slug ?? payload?.slug ?? "").trim()
      if (!slug || !payload) continue
      overlays.set(slug, {
        ...payload,
        slug,
      })
    }
  } catch {
    return overlays
  }

  return overlays
}

function loadVaultListingOverlay() {
  const overlays = loadLocalVaultListingOverlay()
  const candidateOverlays = loadVaultCandidateOverlay()
  for (const [slug, payload] of candidateOverlays.entries()) {
    if (!overlays.has(slug)) overlays.set(slug, payload)
  }
  return overlays
}

function mapRowToVaultListing(
  row: VaultListingRow,
  overlay?: LocalVaultListingOverlay
): VaultListing {
  const countyBase = row.county ?? "Unknown County"
  const stateBase = row.state ?? "TN"
  const titleBase = overlay?.title ?? row.title ?? row.slug
  const auctionReadiness = overlay?.auctionReadiness ?? row.auction_readiness ?? undefined
  const currentSaleDate = overlay?.currentSaleDate
  const originalSaleDate = overlay?.originalSaleDate
  const distressRecordedAt = overlay?.distressRecordedAt
  const dtsDays = calculateDynamicDts(currentSaleDate, overlay?.dtsDays ?? row.dts_days)
  const contactReady =
    typeof overlay?.contactReady === "boolean"
      ? overlay.contactReady
      : typeof auctionReadiness === "string"
      ? auctionReadiness.toUpperCase() === "GREEN"
      : false
  // Supabase is the source of truth for vault activeness; local overlays only
  // enrich the row with packet metadata and underwriting detail.
  const status = deriveListingStatus(row, currentSaleDate, dtsDays)

  return {
    slug: row.slug,
    title: titleBase,
    market: overlay?.market ?? `${countyBase}, ${stateBase}`,
    county: countyBase,
    status,
    distressType: overlay?.distressType ?? "Distress Opportunity",
    auctionWindow: formatSaleWindow(
      overlay?.distressType,
      currentSaleDate,
      dtsDays,
      overlay?.auctionWindow
    ),
    summary:
      overlay?.summary ??
      "Auction-timed opportunity currently inside the FALCO pipeline with packet-level underwriting and restricted routing.",
    publicTeaser:
      overlay?.publicTeaser ??
      "Address-level details, packet, and contact path are restricted to approved users.",
    packetUrl: `/api/vault/packet?slug=${row.slug}`,
    packetLabel: overlay?.packetLabel ?? "Auction Opportunity Brief",
    packetFileName: overlay?.packetFileName ?? row.packet_path ?? undefined,
    sourceLeadKey: overlay?.sourceLeadKey ?? row.slug,
    createdAt: overlay?.createdAt ?? row.created_at,
    falcoScore: overlay?.falcoScore ?? row.falco_score,
    auctionReadiness,
    equityBand: overlay?.equityBand ?? row.equity_band ?? undefined,
    dtsDays,
    currentSaleDate,
    originalSaleDate,
    distressRecordedAt,
    contactReady,
    propertyIdentifier: overlay?.propertyIdentifier,
    ownerName: overlay?.ownerName,
    ownerMail: overlay?.ownerMail,
    lastSaleDate: overlay?.lastSaleDate,
    mortgageDate: overlay?.mortgageDate,
    mortgageLender: overlay?.mortgageLender,
    mortgageAmount: typeof overlay?.mortgageAmount === "number" ? overlay.mortgageAmount : null,
    yearBuilt: overlay?.yearBuilt,
    buildingAreaSqft: overlay?.buildingAreaSqft,
    beds: overlay?.beds,
    baths: overlay?.baths,
    contactPathQuality: overlay?.contactPathQuality,
    controlParty: overlay?.controlParty,
    ownerAgency: overlay?.ownerAgency,
    interventionWindow: overlay?.interventionWindow,
    lenderControlIntensity: overlay?.lenderControlIntensity,
    influenceability: overlay?.influenceability,
    executionPosture: overlay?.executionPosture,
    workabilityBand: overlay?.workabilityBand,
    debtConfidence: overlay?.debtConfidence,
    prefcLiveQuality: overlay?.prefcLiveQuality,
    prefcLiveReviewReasons: overlay?.prefcLiveReviewReasons,
    suggestedExecutionLane: overlay?.suggestedExecutionLane,
    suggestedLaneConfidence: overlay?.suggestedLaneConfidence,
    suggestedLaneReasons: overlay?.suggestedLaneReasons,
    suggestionSource: overlay?.suggestionSource,
    suggestedLaneFeedbackCount: overlay?.suggestedLaneFeedbackCount,
    topTierReady: overlay?.topTierReady,
    vaultPublishReady: overlay?.vaultPublishReady,
    dataNotes: overlay?.dataNotes,
  }
}

function normalizeComparableValue(value?: string | null) {
  return String(value ?? "")
    .trim()
    .toUpperCase()
}

function buildValidationContextFromListing(
  listing: Partial<
    Pick<
    VaultListing,
    | "county"
    | "distressType"
    | "contactPathQuality"
    | "controlParty"
    | "ownerAgency"
    | "interventionWindow"
    | "lenderControlIntensity"
    | "influenceability"
    | "executionPosture"
    | "workabilityBand"
  >
  >
): VaultValidationContext | undefined {
  const context = {
    county: listing.county ?? "",
    distressType: listing.distressType ?? "",
    contactPathQuality: listing.contactPathQuality ?? "",
    controlParty: listing.controlParty ?? "",
    ownerAgency: listing.ownerAgency ?? "",
    interventionWindow: listing.interventionWindow ?? "",
    lenderControlIntensity: listing.lenderControlIntensity ?? "",
    influenceability: listing.influenceability ?? "",
    executionPosture: listing.executionPosture ?? "",
    workabilityBand: listing.workabilityBand ?? "",
  }

  if (Object.values(context).every((value) => !String(value).trim())) {
    return undefined
  }

  return context
}

function scoreValidationSimilarity(
  current: VaultValidationContext,
  historical: VaultValidationContext
) {
  let score = 0

  if (
    normalizeComparableValue(current.county) &&
    normalizeComparableValue(current.county) === normalizeComparableValue(historical.county)
  ) {
    score += 1
  }

  if (
    normalizeComparableValue(current.distressType) &&
    normalizeComparableValue(current.distressType) === normalizeComparableValue(historical.distressType)
  ) {
    score += 1
  }

  if (
    normalizeComparableValue(current.contactPathQuality) &&
    normalizeComparableValue(current.contactPathQuality) ===
      normalizeComparableValue(historical.contactPathQuality)
  ) {
    score += 2
  }

  if (
    normalizeComparableValue(current.controlParty) &&
    normalizeComparableValue(current.controlParty) === normalizeComparableValue(historical.controlParty)
  ) {
    score += 3
  }

  if (
    normalizeComparableValue(current.ownerAgency) &&
    normalizeComparableValue(current.ownerAgency) === normalizeComparableValue(historical.ownerAgency)
  ) {
    score += 2
  }

  if (
    normalizeComparableValue(current.interventionWindow) &&
    normalizeComparableValue(current.interventionWindow) ===
      normalizeComparableValue(historical.interventionWindow)
  ) {
    score += 2
  }

  if (
    normalizeComparableValue(current.lenderControlIntensity) &&
    normalizeComparableValue(current.lenderControlIntensity) ===
      normalizeComparableValue(historical.lenderControlIntensity)
  ) {
    score += 2
  }

  if (
    normalizeComparableValue(current.influenceability) &&
    normalizeComparableValue(current.influenceability) ===
      normalizeComparableValue(historical.influenceability)
  ) {
    score += 2
  }

  if (
    normalizeComparableValue(current.executionPosture) &&
    normalizeComparableValue(current.executionPosture) ===
      normalizeComparableValue(historical.executionPosture)
  ) {
    score += 3
  }

  if (
    normalizeComparableValue(current.workabilityBand) &&
    normalizeComparableValue(current.workabilityBand) ===
      normalizeComparableValue(historical.workabilityBand)
  ) {
    score += 2
  }

  return score
}

function laneDisplayCopy(lane: VaultExecutionLane) {
  if (lane === "borrower_side") return "Borrower Side"
  if (lane === "lender_trustee") return "Lender / Trustee"
  if (lane === "auction_only") return "Auction Only"
  if (lane === "mixed") return "Mixed"
  return "Unclear"
}

function degradeConfidence(confidence?: string) {
  const normalized = normalizeComparableValue(confidence)
  if (normalized === "HIGH") return "MEDIUM"
  if (normalized === "MEDIUM") return "LOW"
  return "LOW"
}

function maxConfidence(a?: string, b?: string) {
  const rank = (value?: string) => {
    const normalized = normalizeComparableValue(value)
    if (normalized === "HIGH") return 3
    if (normalized === "MEDIUM") return 2
    return 1
  }

  return rank(a) >= rank(b) ? (a ?? "LOW") : (b ?? "LOW")
}

function outcomeWeight(outcome?: VaultValidationOutcome) {
  if (outcome === "validated_execution_path") return 1
  if (outcome === "needs_more_info") return 0.35
  if (outcome === "low_leverage") return -0.35
  if (outcome === "no_real_control_path") return -0.6
  if (outcome === "dead_lead") return -0.85
  return 0
}

function feedbackSignalWeight(signals: VaultOperatorFeedbackSignal[]) {
  let weight = 0

  for (const signal of signals) {
    if (signal === "worth_pursuing") weight += 0.45
    if (signal === "good_upstream_candidate") weight += 0.35
    if (signal === "owner_has_room") weight += 0.3
    if (signal === "needs_more_info") weight -= 0.1
    if (signal === "no_contact_path") weight -= 0.35
    if (signal === "too_lender_controlled") weight -= 0.55
    if (signal === "too_late") weight -= 0.65
    if (signal === "not_auction_lane") weight -= 0.3
    if (signal === "bad_noisy_lead") weight -= 0.75
  }

  return weight
}

function confidenceFromFeedback(score: number, sampleCount: number) {
  if (sampleCount >= 3 && score >= 12) return "HIGH"
  if (sampleCount >= 2 && score >= 6) return "MEDIUM"
  return "LOW"
}

function applyOperatorFeedbackToSuggestion(
  listing: VaultListing,
  feedbackRecords: LearningFeedbackRecord[],
  listingBySlug: Map<string, VaultListing>
): ListingSuggestionSummary {
  const baseLane = listing.suggestedExecutionLane ?? "unclear"
  const baseConfidence = listing.suggestedLaneConfidence ?? "LOW"
  const baseReasons = [...(listing.suggestedLaneReasons ?? [])]
  const currentContext = buildValidationContextFromListing(listing)

  if (!currentContext) {
    return {
      suggestedExecutionLane: baseLane,
      suggestedLaneConfidence: baseConfidence,
      suggestedLaneReasons: baseReasons,
      suggestionSource: "rules",
      suggestedLaneFeedbackCount: 0,
    }
  }

  const laneScores = new Map<VaultExecutionLane, number>()
  const laneSupport = new Map<VaultExecutionLane, number>()
  let sampleCount = 0

  for (const record of feedbackRecords) {
    if (record.listingSlug === listing.slug || record.executionLane === "unclear") continue

    const historicalContext =
      record.context ?? buildValidationContextFromListing(listingBySlug.get(record.listingSlug) ?? {})

    if (!historicalContext) continue

    const similarity = scoreValidationSimilarity(currentContext, historicalContext)
    if (similarity < 5) continue

    sampleCount += 1
    const score =
      similarity * (outcomeWeight(record.outcome) + feedbackSignalWeight(record.feedbackSignals ?? []))
    laneScores.set(record.executionLane, (laneScores.get(record.executionLane) ?? 0) + score)
    laneSupport.set(record.executionLane, (laneSupport.get(record.executionLane) ?? 0) + 1)
  }

  if (sampleCount === 0) {
    return {
      suggestedExecutionLane: baseLane,
      suggestedLaneConfidence: baseConfidence,
      suggestedLaneReasons: baseReasons,
      suggestionSource: "rules",
      suggestedLaneFeedbackCount: 0,
    }
  }

  const scoredLanes = [...laneScores.entries()].sort((a, b) => b[1] - a[1])
  const [bestLane, bestScore] = scoredLanes[0] ?? [baseLane, 0]
  const baseScore = laneScores.get(baseLane) ?? 0
  let nextLane = baseLane
  let nextConfidence = baseConfidence
  const nextReasons = [...baseReasons]

  if (bestScore > 0 && (baseLane === "unclear" || bestScore >= baseScore + 2)) {
    nextLane = bestLane
    nextConfidence = maxConfidence(baseConfidence, confidenceFromFeedback(bestScore, sampleCount))
  } else if (bestLane === baseLane && bestScore > 0) {
    nextConfidence = maxConfidence(baseConfidence, confidenceFromFeedback(bestScore, sampleCount))
  } else if (bestScore <= 0) {
    nextConfidence = degradeConfidence(baseConfidence)
  }

  if (bestScore > 0) {
    const supportCount = laneSupport.get(nextLane) ?? laneSupport.get(bestLane) ?? sampleCount
    nextReasons.unshift(
      `Operator feedback on ${supportCount} similar file${
        supportCount === 1 ? "" : "s"
      } has favored ${laneDisplayCopy(nextLane)}`
    )
  } else {
    nextReasons.unshift("Similar validated files have not yet supported a confident execution lane")
  }

  return {
    suggestedExecutionLane: nextLane,
    suggestedLaneConfidence: nextConfidence,
    suggestedLaneReasons: nextReasons.slice(0, 5),
    suggestionSource: "operator_feedback",
    suggestedLaneFeedbackCount: sampleCount,
  }
}

export async function listVaultListings() {
  if (!supabaseAdmin) {
    console.error("listVaultListings error:", supabaseAdminConfigError)
    return []
  }

  const { data, error } = await supabaseAdmin
    .from("vault_listings")
    .select("*")
    .order("created_at", { ascending: false })

  if (error) {
    console.error("listVaultListings error:", error.message)
    return []
  }

  const overlayBySlug = loadVaultListingOverlay()
  const mappedRows = (data ?? []).map((row) =>
    mapRowToVaultListing(row as VaultListingRow, overlayBySlug.get((row as VaultListingRow).slug))
  )
  const [routingSnapshots, validationSnapshots, validationHistory, partnerFeedbackHistory] =
    await Promise.all([
    getVaultRoutingSnapshotsForListings(
      mappedRows.map((listing) => ({
        slug: listing.slug,
        status: listing.status,
      }))
    ),
    getVaultValidationSnapshotsForListings(mappedRows.map((listing) => listing.slug)),
    listVaultValidationRecords(),
    listVaultPartnerFeedbackRecords(),
    ])
  const listingBySlug = new Map(mappedRows.map((listing) => [listing.slug, listing]))
  const learningHistory: LearningFeedbackRecord[] = [
    ...validationHistory,
    ...partnerFeedbackHistory,
  ]

  return mappedRows.map((listing) => {
    const snapshot = routingSnapshots.get(listing.slug)
    const validation = validationSnapshots.get(listing.slug)
    const suggestion = applyOperatorFeedbackToSuggestion(
      listing,
      learningHistory,
      listingBySlug
    )

    return {
      ...listing,
      ...suggestion,
      routingState: snapshot?.routingState ?? (listing.status === "active" ? "open" : "closed"),
      routingReservedByEmail: snapshot?.reservedByEmail,
      routingReservedByName: snapshot?.reservedByName,
      pursuitRequestCount: snapshot?.requestCount ?? 0,
      validationOutcome: validation?.outcome,
      executionLane: validation?.executionLane,
      validationNote: validation?.note,
      validatedAt: validation?.submittedAt,
      validatedBy: validation?.actedBy,
    }
  })
}

export async function listActiveVaultListings() {
  const rows = await listVaultListings()
  const now = new Date().toISOString()

  return rows.filter((listing) => {
    if (listing.status !== "active") return false
    if (listing.expiresAt && listing.expiresAt < now) return false
    return true
  })
}

export async function findVaultListing(slug: string) {
  if (!supabaseAdmin) {
    console.error("findVaultListing error:", supabaseAdminConfigError)
    return null
  }

  const { data, error } = await supabaseAdmin
    .from("vault_listings")
    .select("*")
    .eq("slug", slug)
    .maybeSingle()

  if (error) {
    console.error("findVaultListing error:", error.message)
    return null
  }

  if (!data) return null

  const overlayBySlug = loadVaultListingOverlay()
  const mapped = mapRowToVaultListing(
    data as VaultListingRow,
    overlayBySlug.get((data as VaultListingRow).slug)
  )
  if (mapped.status !== "active") {
    return null
  }
  const [snapshot, validation, validationHistory, partnerFeedbackHistory] = await Promise.all([
    getVaultRoutingSnapshot(mapped.slug, mapped.status !== "active"),
    getVaultValidationRecordByListing(mapped.slug),
    listVaultValidationRecords(),
    listVaultPartnerFeedbackRecords(),
  ])
  const suggestion = applyOperatorFeedbackToSuggestion(
    mapped,
    [...validationHistory, ...partnerFeedbackHistory],
    new Map([[mapped.slug, mapped]])
  )

  return {
    ...mapped,
    ...suggestion,
    routingState: snapshot.routingState,
    routingReservedByEmail: snapshot.reservedByEmail,
    routingReservedByName: snapshot.reservedByName,
    pursuitRequestCount: snapshot.requestCount,
    validationOutcome: validation?.outcome,
    executionLane: validation?.executionLane,
    validationNote: validation?.note,
    validatedAt: validation?.submittedAt,
    validatedBy: validation?.actedBy,
  }
}

export async function upsertVaultListing(listing: VaultListing) {
  if (!supabaseAdmin) {
    console.error("upsertVaultListing error:", supabaseAdminConfigError)
    return null
  }

  const payload = {
    slug: listing.slug,
    title: listing.title,
    county: listing.county,
    state: "TN",
    falco_score: listing.falcoScore ?? null,
    auction_readiness: listing.auctionReadiness ?? null,
    equity_band: listing.equityBand ?? null,
    dts_days: listing.dtsDays ?? null,
    packet_path: listing.packetFileName ?? null,
    is_active: listing.status === "active",
  }

  const { error } = await supabaseAdmin
    .from("vault_listings")
    .upsert(payload, { onConflict: "slug" })

  if (error) {
    console.error("upsertVaultListing error:", error.message)
    return null
  }

  return listing
}

export async function updateVaultListingStatus(
  slug: string,
  status: VaultListingStatus,
  claimedBy?: string
) {
  if (!supabaseAdmin) {
    console.error("updateVaultListingStatus error:", supabaseAdminConfigError)
    return null
  }

  const { data, error } = await supabaseAdmin
    .from("vault_listings")
    .update({
      is_active: status === "active",
      updated_at: new Date().toISOString(),
    })
    .eq("slug", slug)
    .select("*")
    .maybeSingle()

  if (error) {
    console.error("updateVaultListingStatus error:", error.message)
    return null
  }

  if (!data) return null

  return {
    ...mapRowToVaultListing(data as VaultListingRow, loadVaultListingOverlay().get(slug)),
    status,
    claimedAt: status === "claimed" ? new Date().toISOString() : undefined,
    claimedBy: status === "claimed" ? claimedBy || "unknown" : undefined,
  }
}

export async function seedVaultListingsIfEmpty() {
  const rows = await listVaultListings()
  return rows
}
