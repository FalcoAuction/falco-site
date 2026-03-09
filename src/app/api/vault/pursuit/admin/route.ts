import { NextRequest, NextResponse } from "next/server"
import { getAdminApprovalSecret } from "@/lib/admin-approval-secret"
import {
  declineVaultPursuitRequest,
  listVaultPursuitRequests,
  releaseVaultPursuitReservation,
  reserveVaultPursuitRequest,
} from "@/lib/vault-pursuit"

async function buildQueue() {
  const rows = await listVaultPursuitRequests()
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
    const action = String(body?.action ?? "").trim()
    const requestId = String(body?.requestId ?? "").trim()
    const actedBy = String(body?.actedBy ?? "FALCO Admin").trim() || "FALCO Admin"

    if (!secret || secret !== adminApprovalSecret) {
      return NextResponse.json(
        { ok: false, error: "Unauthorized routing request." },
        { status: 401 }
      )
    }

    if (action === "queue") {
      return NextResponse.json({ ok: true, listings: await buildQueue() })
    }

    if (!requestId) {
      return NextResponse.json(
        { ok: false, error: "Request id is required." },
        { status: 400 }
      )
    }

    if (action === "reserve") {
      await reserveVaultPursuitRequest(requestId, actedBy)
    } else if (action === "decline") {
      await declineVaultPursuitRequest(requestId, actedBy)
    } else if (action === "release") {
      await releaseVaultPursuitReservation(requestId, actedBy)
    } else {
      return NextResponse.json(
        { ok: false, error: "Unsupported routing action." },
        { status: 400 }
      )
    }

    return NextResponse.json({ ok: true, listings: await buildQueue() })
  } catch (error) {
    if (error instanceof Error && error.message === "Missing FALCO_APPROVAL_SECRET.") {
      return NextResponse.json(
        { ok: false, error: "Approval secret is not configured." },
        { status: 500 }
      )
    }

    console.error("vault_pursuit_admin error", error)
    return NextResponse.json(
      { ok: false, error: "Unable to manage pursuit routing." },
      { status: 500 }
    )
  }
}
