import { NextResponse } from "next/server"
import { clearAdminSession } from "@/lib/admin-session"

export const dynamic = "force-dynamic"

export async function POST() {
  const res = NextResponse.json({ ok: true })
  clearAdminSession(res)
  return res
}
