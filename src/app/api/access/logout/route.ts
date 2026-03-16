import { NextRequest, NextResponse } from "next/server"
import { getVaultApprovalSession } from "@/lib/vault-access-session"
import { recordVaultActivity } from "@/lib/vault-activity"
import { clearVaultApprovalSession } from "@/lib/vault-access-session"

export async function POST(req: NextRequest) {
  const res = NextResponse.json({ ok: true })
  const approval = await getVaultApprovalSession(req)
  const approvedEmail = approval?.email?.trim().toLowerCase() || ""
  if (approvedEmail) {
    const forwardedFor = req.headers.get("x-forwarded-for") ?? ""
    const ipAddress = forwardedFor.split(",")[0]?.trim() || "unknown"
    const userAgent = req.headers.get("user-agent") ?? "unknown"
    await recordVaultActivity({
      eventType: "vault_logout",
      email: approvedEmail,
      partnerName: approvedEmail,
      detail: "Vault session ended.",
      ipAddress,
      userAgent,
      actedBy: approvedEmail,
    })
  }
  clearVaultApprovalSession(res)
  return res
}
