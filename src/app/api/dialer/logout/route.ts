import { NextResponse } from "next/server"
import { clearDialerSession } from "@/lib/dialer-session"
import { clearOperatorSession } from "@/lib/operator-access-session"

export async function POST() {
  // Clear both sessions — whichever was active. Means signing out of the
  // dialer also signs out of /operator. That's the safer default.
  const res = NextResponse.json({ ok: true })
  clearDialerSession(res)
  clearOperatorSession(res)
  return res
}
