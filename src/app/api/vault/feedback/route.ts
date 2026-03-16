import { NextRequest, NextResponse } from "next/server"
import { findVaultAcceptance } from "@/lib/vault-agreements"
import { getVaultApprovalSession } from "@/lib/vault-access-session"
import {
  clearVaultPartnerFeedbackRecord,
  findVaultPartnerFeedbackRecord,
  getVaultPartnerFeedbackSummary,
  upsertVaultPartnerFeedbackRecord,
} from "@/lib/vault-feedback"
import { recordVaultActivity } from "@/lib/vault-activity"
import { findVaultListing } from "@/lib/vault-listings"
import type {
  VaultExecutionLane,
  VaultOperatorFeedbackSignal,
  VaultValidationContext,
  VaultValidationOutcome,
} from "@/lib/vault-pursuit"

const VALID_OUTCOMES = new Set<VaultValidationOutcome>([
  "validated_execution_path",
  "needs_more_info",
  "no_real_control_path",
  "low_leverage",
  "dead_lead",
])

const VALID_LANES = new Set<VaultExecutionLane>([
  "borrower_side",
  "lender_trustee",
  "auction_only",
  "mixed",
  "unclear",
])

const VALID_SIGNALS = new Set<VaultOperatorFeedbackSignal>([
  "worth_pursuing",
  "too_late",
  "too_lender_controlled",
  "owner_has_room",
  "no_contact_path",
  "needs_more_info",
  "bad_noisy_lead",
  "good_upstream_candidate",
  "not_auction_lane",
])

function parseSignals(value: unknown) {
  if (!Array.isArray(value)) return []
  return value.filter(
    (entry): entry is VaultOperatorFeedbackSignal =>
      typeof entry === "string" && VALID_SIGNALS.has(entry as VaultOperatorFeedbackSignal)
  )
}

function parseContext(value: unknown): VaultValidationContext | undefined {
  if (!value || typeof value !== "object") return undefined

  const raw = value as Partial<VaultValidationContext>
  const normalized = {
    county: typeof raw.county === "string" ? raw.county.trim() : "",
    distressType: typeof raw.distressType === "string" ? raw.distressType.trim() : "",
    contactPathQuality:
      typeof raw.contactPathQuality === "string" ? raw.contactPathQuality.trim() : "",
    controlParty: typeof raw.controlParty === "string" ? raw.controlParty.trim() : "",
    ownerAgency: typeof raw.ownerAgency === "string" ? raw.ownerAgency.trim() : "",
    interventionWindow:
      typeof raw.interventionWindow === "string" ? raw.interventionWindow.trim() : "",
    lenderControlIntensity:
      typeof raw.lenderControlIntensity === "string" ? raw.lenderControlIntensity.trim() : "",
    influenceability:
      typeof raw.influenceability === "string" ? raw.influenceability.trim() : "",
    executionPosture:
      typeof raw.executionPosture === "string" ? raw.executionPosture.trim() : "",
    workabilityBand:
      typeof raw.workabilityBand === "string" ? raw.workabilityBand.trim() : "",
    saleStatus: typeof raw.saleStatus === "string" ? raw.saleStatus.trim() : "",
    sourceLeadKey: typeof raw.sourceLeadKey === "string" ? raw.sourceLeadKey.trim() : "",
  }

  if (Object.values(normalized).every((entry) => !entry)) {
    return undefined
  }

  return normalized
}

async function requireAcceptedVaultUser(req: NextRequest, listingSlug: string) {
  const approval = await getVaultApprovalSession(req)
  const approvedEmail = approval?.email?.trim().toLowerCase() || ""

  if (!approvedEmail) {
    return {
      ok: false as const,
      response: NextResponse.json(
        { ok: false, error: "Approved vault access required." },
        { status: 401 }
      ),
    }
  }

  if (!approval) {
    return {
      ok: false as const,
      response: NextResponse.json(
        { ok: false, error: "Email is not approved for vault access." },
        { status: 403 }
      ),
    }
  }

  const listing = await findVaultListing(listingSlug)
  if (!listing) {
    return {
      ok: false as const,
      response: NextResponse.json(
        { ok: false, error: "Listing not found." },
        { status: 404 }
      ),
    }
  }

  const acceptance = await findVaultAcceptance(listingSlug, approvedEmail)
  if (!acceptance) {
    return {
      ok: false as const,
      response: NextResponse.json(
        { ok: false, error: "Agreement acceptance required before submitting feedback." },
        { status: 403 }
      ),
    }
  }

  return {
    ok: true as const,
    approvedEmail,
  }
}

export async function GET(req: NextRequest) {
  try {
    const listingSlug = String(req.nextUrl.searchParams.get("slug") ?? "").trim()
    if (!listingSlug) {
      return NextResponse.json(
        { ok: false, error: "Missing listing slug." },
        { status: 400 }
      )
    }

    const auth = await requireAcceptedVaultUser(req, listingSlug)
    if (!auth.ok) return auth.response

    const [record, summary] = await Promise.all([
      findVaultPartnerFeedbackRecord(listingSlug, auth.approvedEmail),
      getVaultPartnerFeedbackSummary(listingSlug),
    ])

    return NextResponse.json({
      ok: true,
      record,
      summary,
    })
  } catch (error) {
    console.error("vault_feedback GET error", error)
    return NextResponse.json(
      { ok: false, error: "Unable to load partner feedback." },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const listingSlug = String(body?.listingSlug ?? "").trim()
    const action = String(body?.action ?? "record").trim().toLowerCase()

    if (!listingSlug) {
      return NextResponse.json(
        { ok: false, error: "Listing slug is required." },
        { status: 400 }
      )
    }

    const auth = await requireAcceptedVaultUser(req, listingSlug)
    if (!auth.ok) return auth.response

    if (action === "clear") {
      await clearVaultPartnerFeedbackRecord(listingSlug, auth.approvedEmail)
      const summary = await getVaultPartnerFeedbackSummary(listingSlug)
      const forwardedFor = req.headers.get("x-forwarded-for") ?? ""
      const ipAddress = forwardedFor.split(",")[0]?.trim() || "unknown"
      const userAgent = req.headers.get("user-agent") ?? "unknown"
      await recordVaultActivity({
        eventType: "vault_feedback_cleared",
        email: auth.approvedEmail,
        partnerName: auth.approvedEmail,
        listingSlug,
        detail: `Cleared partner feedback for ${listingSlug}.`,
        ipAddress,
        userAgent,
        actedBy: auth.approvedEmail,
      })
      return NextResponse.json({
        ok: true,
        record: null,
        summary,
      })
    }

    const outcome = String(body?.outcome ?? "").trim() as VaultValidationOutcome
    const executionLane = String(body?.executionLane ?? "").trim() as VaultExecutionLane
    const note = String(body?.note ?? "").trim()
    const partnerName = String(body?.partnerName ?? "").trim() || auth.approvedEmail
    const feedbackSignals = parseSignals(body?.feedbackSignals)
    const contactAttempted = body?.contactAttempted === true
    const context = parseContext(body?.context)

    if (!VALID_OUTCOMES.has(outcome)) {
      return NextResponse.json(
        { ok: false, error: "Valid partner feedback outcome is required." },
        { status: 400 }
      )
    }

    if (!VALID_LANES.has(executionLane)) {
      return NextResponse.json(
        { ok: false, error: "Valid execution lane is required." },
        { status: 400 }
      )
    }

    const record = await upsertVaultPartnerFeedbackRecord({
      listingSlug,
      email: auth.approvedEmail,
      partnerName,
      outcome,
      executionLane,
      note,
      feedbackSignals,
      contactAttempted,
      actedBy: auth.approvedEmail,
      context,
    })
    const forwardedFor = req.headers.get("x-forwarded-for") ?? ""
    const ipAddress = forwardedFor.split(",")[0]?.trim() || "unknown"
    const userAgent = req.headers.get("user-agent") ?? "unknown"
    await recordVaultActivity({
      eventType: "vault_feedback_recorded",
      email: auth.approvedEmail,
      partnerName,
      listingSlug,
      detail: `${outcome.replace(/_/g, " ")} feedback saved for ${listingSlug}.`,
      ipAddress,
      userAgent,
      actedBy: auth.approvedEmail,
      context: {
        outcome,
        executionLane,
      },
    })

    const summary = await getVaultPartnerFeedbackSummary(listingSlug)

    return NextResponse.json({
      ok: true,
      record,
      summary,
    })
  } catch (error) {
    console.error("vault_feedback POST error", error)
    return NextResponse.json(
      { ok: false, error: "Unable to save partner feedback." },
      { status: 500 }
    )
  }
}
