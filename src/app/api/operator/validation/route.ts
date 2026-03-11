import { NextRequest, NextResponse } from "next/server"
import { getAdminApprovalSecret } from "@/lib/admin-approval-secret"
import {
  clearVaultValidationRecord,
  upsertVaultValidationRecord,
  type VaultExecutionLane,
  type VaultValidationOutcome,
} from "@/lib/vault-pursuit"

function isValidationOutcome(value: string): value is VaultValidationOutcome {
  return [
    "validated_execution_path",
    "needs_more_info",
    "no_real_control_path",
    "low_leverage",
    "dead_lead",
  ].includes(value)
}

function isExecutionLane(value: string): value is VaultExecutionLane {
  return ["borrower_side", "lender_trustee", "auction_only", "mixed", "unclear"].includes(value)
}

export async function POST(req: NextRequest) {
  try {
    const adminApprovalSecret = getAdminApprovalSecret()
    const body = await req.json()
    const secret = String(body?.secret ?? "").trim()
    const action = String(body?.action ?? "record").trim()
    const listingSlug = String(body?.listingSlug ?? "").trim()
    const actedBy = String(body?.actedBy ?? "FALCO Admin").trim() || "FALCO Admin"

    if (!secret || secret !== adminApprovalSecret) {
      return NextResponse.json(
        { ok: false, error: "Unauthorized validation request." },
        { status: 401 }
      )
    }

    if (!listingSlug) {
      return NextResponse.json(
        { ok: false, error: "Listing slug is required." },
        { status: 400 }
      )
    }

    if (action === "clear") {
      await clearVaultValidationRecord(listingSlug, actedBy)
      return NextResponse.json({ ok: true })
    }

    const outcome = String(body?.outcome ?? "").trim()
    const executionLane = String(body?.executionLane ?? "unclear").trim()
    const note = String(body?.note ?? "").trim()

    if (!isValidationOutcome(outcome)) {
      return NextResponse.json(
        { ok: false, error: "Validation outcome is required." },
        { status: 400 }
      )
    }

    if (!isExecutionLane(executionLane)) {
      return NextResponse.json(
        { ok: false, error: "Execution lane is invalid." },
        { status: 400 }
      )
    }

    const record = await upsertVaultValidationRecord({
      listingSlug,
      outcome,
      executionLane,
      note,
      actedBy,
    })

    return NextResponse.json({ ok: true, record })
  } catch (error) {
    if (error instanceof Error && error.message === "Missing FALCO_APPROVAL_SECRET.") {
      return NextResponse.json(
        { ok: false, error: "Approval secret is not configured." },
        { status: 500 }
      )
    }

    console.error("operator_validation error", error)
    return NextResponse.json(
      { ok: false, error: "Unable to record operator validation." },
      { status: 500 }
    )
  }
}
