import { NextRequest, NextResponse } from "next/server"
import { isValidDialerPassword, setDialerSession } from "@/lib/dialer-session"

export async function POST(req: NextRequest) {
  let body: { caller?: string; password?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 })
  }
  const caller = (body.caller ?? "").trim()
  const password = (body.password ?? "").trim()
  if (!caller) {
    return NextResponse.json({ error: "Name required." }, { status: 400 })
  }
  if (!password) {
    return NextResponse.json({ error: "Password required." }, { status: 400 })
  }
  if (!isValidDialerPassword(password)) {
    return NextResponse.json({ error: "Wrong password." }, { status: 401 })
  }
  const res = NextResponse.json({ ok: true })
  setDialerSession(res, caller)
  return res
}
