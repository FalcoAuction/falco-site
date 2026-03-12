import { NextRequest, NextResponse } from "next/server"
import { getAdminApprovalSecret } from "@/lib/admin-approval-secret"
import { listAccessRequests } from "@/lib/access-workflow"
import { listOperatorIntakeDecisions } from "@/lib/operator-intake"
import { getOperatorReport } from "@/lib/operator-report"
import { listOperatorTaskHistory } from "@/lib/operator-tasks"
import { listActiveVaultListings } from "@/lib/vault-listings"
import { listVaultPursuitRequests, listVaultValidationRecords } from "@/lib/vault-pursuit"

function buildRoutingQueue(
  rows: Awaited<ReturnType<typeof listVaultPursuitRequests>>
) {
  const grouped = new Map<
    string,
    {
      listingSlug: string
      requests: typeof rows
    }
  >()

  for (const row of rows) {
    const bucket = grouped.get(row.listingSlug) ?? {
      listingSlug: row.listingSlug,
      requests: [],
    }
    bucket.requests.push(row)
    grouped.set(row.listingSlug, bucket)
  }

  return [...grouped.values()].sort((a, b) => a.listingSlug.localeCompare(b.listingSlug))
}

export async function POST(req: NextRequest) {
  try {
    const adminApprovalSecret = getAdminApprovalSecret()
    const body = await req.json()
    const secret = String(body?.secret ?? "").trim()

    if (!secret) {
      return NextResponse.json(
        { ok: false, error: "Approval secret is required." },
        { status: 400 }
      )
    }

    if (secret !== adminApprovalSecret) {
      return NextResponse.json(
        { ok: false, error: "Unauthorized operator request." },
        { status: 401 }
      )
    }

    const [report, accessRequests, vaultPursuitRequests, liveListings, taskHistory, intakeDecisions, validationRecords] = await Promise.all([
      getOperatorReport(),
      listAccessRequests(),
      listVaultPursuitRequests(),
      listActiveVaultListings(),
      listOperatorTaskHistory(),
      listOperatorIntakeDecisions(),
      listVaultValidationRecords(),
    ])

    return NextResponse.json({
      ok: true,
      workspace: {
        report,
        accessRequests,
        routingQueue: buildRoutingQueue(vaultPursuitRequests),
        liveListings,
        taskHistory,
        intakeDecisions,
        validationRecords,
      },
    })
  } catch (error) {
    if (error instanceof Error && error.message === "Missing FALCO_APPROVAL_SECRET.") {
      return NextResponse.json(
        { ok: false, error: "Approval secret is not configured." },
        { status: 500 }
      )
    }

    console.error("operator_workspace error", error)
    return NextResponse.json(
      { ok: false, error: "Unable to build operator workspace." },
      { status: 500 }
    )
  }
}
