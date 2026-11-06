import { NextRequest, NextResponse } from "next/server"
import { clearAdminSession } from "@/lib/admin-session"

export const dynamic = "force-dynamic"

// The CRM's Sign out button is a plain form post: clear the session and
// land on the sign-in page (303 so the browser follows with a GET).
export async function POST(req: NextRequest) {
  const res = NextResponse.redirect(new URL("/crm/login", req.url), 303)
  clearAdminSession(res)
  return res
}
