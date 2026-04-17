import { NextResponse } from "next/server"
import { clearDialerSession } from "@/lib/dialer-session"

export async function POST() {
  const res = NextResponse.json({ ok: true })
  clearDialerSession(res)
  return res
}
