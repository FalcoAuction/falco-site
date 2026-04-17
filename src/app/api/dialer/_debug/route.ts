// TEMPORARY diagnostic endpoint — remove after fixing dialer auth.
// Tells us whether the env var is actually set in the running build.
import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

export async function GET() {
  const dialerPw = process.env.FALCO_DIALER_PASSWORD
  const opPw = process.env.FALCO_OPERATOR_PASSWORD
  const sessionSecret = process.env.FALCO_SESSION_SECRET
  const approvalSecret = process.env.FALCO_APPROVAL_SECRET

  function describe(v: string | undefined) {
    if (v === undefined) return { set: false }
    return {
      set: true,
      length: v.length,
      trimmedLength: v.trim().length,
      firstChar: v.length > 0 ? v.charCodeAt(0) : null,
      lastChar: v.length > 0 ? v.charCodeAt(v.length - 1) : null,
      hasNonAscii: /[^\x20-\x7e]/.test(v),
      hasLeadingOrTrailingWhitespace: v !== v.trim(),
    }
  }

  return NextResponse.json({
    note: "Diagnostic only — delete this endpoint after debugging.",
    nodeEnv: process.env.NODE_ENV,
    vercelEnv: process.env.VERCEL_ENV,
    deployedCommit: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7),
    falcoDialerPassword: describe(dialerPw),
    falcoOperatorPassword: describe(opPw),
    falcoSessionSecret: { set: !!sessionSecret, length: sessionSecret?.length ?? 0 },
    falcoApprovalSecret: { set: !!approvalSecret, length: approvalSecret?.length ?? 0 },
  })
}
