import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin, supabaseAdminConfigError } from "@/lib/supabase-admin"

export const dynamic = "force-dynamic"

const APPROVAL_SECRET = process.env.FALCO_APPROVAL_SECRET ?? ""
const SYSTEM_STATE_COMPANY = "__falco_system_state__"

type PublishBody = {
  secret?: string
  key?: string
  payload?: unknown
}

/**
 * Publishes a system-state envelope into the partner_access_requests table.
 * Mirrors the original bot-side _publish_system_state but runs server-side
 * with the production Supabase admin client, so the bot doesn't need a
 * direct Supabase key.
 */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as PublishBody
    const secret = String(body?.secret ?? "").trim()

    if (!APPROVAL_SECRET || secret !== APPROVAL_SECRET) {
      return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 })
    }

    const key = String(body?.key ?? "").trim()
    if (!key) {
      return NextResponse.json({ ok: false, error: "Missing 'key'." }, { status: 400 })
    }
    if (body.payload === undefined) {
      return NextResponse.json({ ok: false, error: "Missing 'payload'." }, { status: 400 })
    }

    if (!supabaseAdmin) {
      return NextResponse.json(
        { ok: false, error: supabaseAdminConfigError ?? "Supabase admin not configured." },
        { status: 500 }
      )
    }

    const envelope = {
      version: 1,
      key,
      updatedAt: new Date().toISOString(),
      payload: body.payload,
    }
    const email = `state+${key}@falco.local`

    // Find any existing snapshot row for this key
    const { data: existingRows, error: lookupError } = await supabaseAdmin
      .from("partner_access_requests")
      .select("id")
      .eq("company", SYSTEM_STATE_COMPANY)
      .eq("status", "state_snapshot")
      .eq("email", email)
      .order("created_at", { ascending: false })
      .limit(10)

    if (lookupError) {
      return NextResponse.json(
        { ok: false, error: `lookup failed: ${lookupError.message}` },
        { status: 500 }
      )
    }

    const stateRow = {
      email,
      full_name: key,
      company: SYSTEM_STATE_COMPANY,
      notes: JSON.stringify(envelope),
      status: "state_snapshot" as const,
    }

    const latestId = existingRows?.[0]?.id
    if (latestId) {
      const { error } = await supabaseAdmin
        .from("partner_access_requests")
        .update(stateRow)
        .eq("id", latestId)
      if (error) {
        return NextResponse.json(
          { ok: false, error: `update failed: ${error.message}` },
          { status: 500 }
        )
      }
    } else {
      const { error } = await supabaseAdmin.from("partner_access_requests").insert(stateRow)
      if (error) {
        return NextResponse.json(
          { ok: false, error: `insert failed: ${error.message}` },
          { status: 500 }
        )
      }
    }

    return NextResponse.json({ ok: true, key, mode: latestId ? "update" : "insert" })
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    )
  }
}
