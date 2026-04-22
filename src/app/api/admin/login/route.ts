import { NextRequest, NextResponse } from "next/server"
import { isValidAdminPassword, setAdminSession } from "@/lib/admin-session"

export const dynamic = "force-dynamic"

export async function POST(req: NextRequest) {
  let body: { password?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON." }, { status: 400 })
  }
  const password = (body.password ?? "").trim()
  if (!password) {
    return NextResponse.json({ ok: false, error: "Password required." }, { status: 400 })
  }
  if (!isValidAdminPassword(password)) {
    // Constant-ish delay so password timing isn't a side-channel
    await new Promise((r) => setTimeout(r, 250))
    return NextResponse.json({ ok: false, error: "Wrong password." }, { status: 401 })
  }
  const res = NextResponse.json({ ok: true })
  setAdminSession(res)
  return res
}
