import crypto from "node:crypto"

type SessionPayload = {
  kind: string
  exp: number
  [key: string]: unknown
}

function base64UrlEncode(value: string) {
  return Buffer.from(value, "utf8").toString("base64url")
}

function base64UrlDecode(value: string) {
  return Buffer.from(value, "base64url").toString("utf8")
}

export function getSessionSigningSecret() {
  const secret =
    process.env.FALCO_SESSION_SECRET?.trim() ||
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    process.env.FALCO_APPROVAL_SECRET?.trim()

  if (!secret) {
    throw new Error(
      "Missing FALCO_SESSION_SECRET, SUPABASE_SERVICE_ROLE_KEY, or FALCO_APPROVAL_SECRET."
    )
  }

  return secret
}

export function signSessionPayload(payload: SessionPayload) {
  const encodedPayload = base64UrlEncode(JSON.stringify(payload))
  const signature = crypto
    .createHmac("sha256", getSessionSigningSecret())
    .update(encodedPayload)
    .digest("base64url")

  return `${encodedPayload}.${signature}`
}

export function verifySessionPayload<T extends SessionPayload>(token: string): T | null {
  const trimmed = token.trim()
  if (!trimmed) return null

  const [encodedPayload, signature] = trimmed.split(".")
  if (!encodedPayload || !signature) return null

  const expected = crypto
    .createHmac("sha256", getSessionSigningSecret())
    .update(encodedPayload)
    .digest("base64url")

  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
    return null
  }

  try {
    const payload = JSON.parse(base64UrlDecode(encodedPayload)) as T
    if (!payload || typeof payload !== "object") return null
    if (typeof payload.kind !== "string" || typeof payload.exp !== "number") return null
    if (payload.exp * 1000 <= Date.now()) return null
    return payload
  } catch {
    return null
  }
}
