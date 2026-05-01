// CRUD for the daily_todos list shown on /admin/today.
// All operations admin-gated.

import { NextRequest, NextResponse } from "next/server"
import { getAdminSession } from "@/lib/admin-session"
import { supabaseAdmin } from "@/lib/supabase-admin"

export const dynamic = "force-dynamic"

export async function POST(req: NextRequest) {
  if (!getAdminSession(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }
  if (!supabaseAdmin) {
    return NextResponse.json({ error: "db not configured" }, { status: 500 })
  }
  let body: { content?: string; priority?: number; context?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "bad json" }, { status: 400 })
  }
  const content = (body.content ?? "").trim()
  if (!content) {
    return NextResponse.json({ error: "content required" }, { status: 400 })
  }
  const { data, error } = await supabaseAdmin
    .from("daily_todos")
    .insert({
      content,
      priority: typeof body.priority === "number" ? body.priority : 0,
      context: body.context?.trim() || null,
    })
    .select("*")
    .single()
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ ok: true, todo: data })
}

export async function PATCH(req: NextRequest) {
  if (!getAdminSession(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }
  if (!supabaseAdmin) {
    return NextResponse.json({ error: "db not configured" }, { status: 500 })
  }
  let body: { id?: string; complete?: boolean; uncomplete?: boolean }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "bad json" }, { status: 400 })
  }
  if (!body.id) {
    return NextResponse.json({ error: "id required" }, { status: 400 })
  }
  const update: Record<string, unknown> = {}
  if (body.complete) update.completed_at = new Date().toISOString()
  if (body.uncomplete) update.completed_at = null
  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "nothing to update" }, { status: 400 })
  }
  const { error } = await supabaseAdmin
    .from("daily_todos")
    .update(update)
    .eq("id", body.id)
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  if (!getAdminSession(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }
  if (!supabaseAdmin) {
    return NextResponse.json({ error: "db not configured" }, { status: 500 })
  }
  const id = req.nextUrl.searchParams.get("id")
  if (!id) {
    return NextResponse.json({ error: "id required" }, { status: 400 })
  }
  const { error } = await supabaseAdmin.from("daily_todos").delete().eq("id", id)
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
