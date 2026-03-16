import { NextResponse } from "next/server"
import { clearVaultApprovalSession } from "@/lib/vault-access-session"

export async function POST() {
  const res = NextResponse.json({ ok: true })
  clearVaultApprovalSession(res)
  return res
}
