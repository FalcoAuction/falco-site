export function getAdminApprovalSecret() {
  const secret = process.env.FALCO_APPROVAL_SECRET?.trim()

  if (!secret) {
    throw new Error("Missing FALCO_APPROVAL_SECRET.")
  }

  return secret
}
