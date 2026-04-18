import { NextRequest, NextResponse } from "next/server"
import { isValidDialerPassword, setDialerSession } from "@/lib/dialer-session"
import { findDialerAcceptance } from "@/lib/dialer-acceptance"

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function POST(req: NextRequest) {
  let body: { caller?: string; email?: string; password?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 })
  }
  const caller = (body.caller ?? "").trim()
  const email = (body.email ?? "").trim().toLowerCase()
  const password = (body.password ?? "").trim()
  if (!caller) {
    return NextResponse.json({ error: "Name required." }, { status: 400 })
  }
  if (!email || !EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "Valid email required." }, { status: 400 })
  }
  if (!password) {
    return NextResponse.json({ error: "Password required." }, { status: 400 })
  }
  if (!isValidDialerPassword(password)) {
    return NextResponse.json({ error: "Wrong password." }, { status: 401 })
  }

  // Has this email already signed the agreement?
  const acceptance = await findDialerAcceptance(email)
  const requiresAgreement = !acceptance

  const res = NextResponse.json({
    ok: true,
    requiresAgreement,
    nextPath: requiresAgreement ? "/dialer/agreement" : "/dialer",
  })
  setDialerSession(res, caller, email)
  return res
}
