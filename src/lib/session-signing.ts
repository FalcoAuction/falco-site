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
  // FALCO_SESSION_SECRET is REQUIRED. Never fall back to other env vars —
  // doing so couples session validity to the lifecycle of unrelated
  // credentials (e.g., rotating the Supabase service-role key would
  // silently invalidate every signed session, and the `.env.local` concat
  // bug could leak the wrong value into the signing path).
  const secret = process.env.FALCO_SESSION_SECRET?.trim()
  if (!secret) {
    throw new Error(
      "FALCO_SESSION_SECRET is required and must be set in environment."
    )
  }
  if (secret.length < 32) {
    throw new Error(
      "FALCO_SESSION_SECRET must be at least 32 chars of high-entropy data."
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

  // timingSafeEqual throws RangeError on length mismatch — that crashes
  // the request handler with a 500. A tampered/malformed cookie should
  // simply return null (treated as logged-out).
  const sigBuf = Buffer.from(signature)
  const expBuf = Buffer.from(expected)
  if (sigBuf.length !== expBuf.length) return null
  if (!crypto.timingSafeEqual(sigBuf, expBuf)) {
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
