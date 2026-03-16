import nodemailer from "nodemailer"
import { signSessionPayload, verifySessionPayload } from "@/lib/session-signing"

type VaultLoginLinkPayload = {
  kind: "vault_login_link"
  approvalId: string
  email: string
  exp: number
}

function createTransport() {
  const user = process.env.FALCO_GMAIL_USER?.trim()
  const pass = process.env.FALCO_GMAIL_APP_PASSWORD?.trim()

  if (!user || !pass) {
    throw new Error("Missing FALCO_GMAIL_USER or FALCO_GMAIL_APP_PASSWORD.")
  }

  return {
    transporter: nodemailer.createTransport({
      service: "gmail",
      auth: {
        user,
        pass,
      },
    }),
    user,
  }
}

export function createVaultLoginLinkToken(approvalId: string, email: string) {
  return signSessionPayload({
    kind: "vault_login_link",
    approvalId,
    email: email.trim().toLowerCase(),
    exp: Math.floor(Date.now() / 1000) + 60 * 15,
  })
}

export function verifyVaultLoginLinkToken(token: string) {
  const payload = verifySessionPayload<VaultLoginLinkPayload>(token)
  if (!payload || payload.kind !== "vault_login_link") return null
  return payload
}

export async function sendVaultLoginLinkEmail(input: {
  email: string
  approvalId: string
  origin: string
}) {
  const normalizedEmail = input.email.trim().toLowerCase()
  const normalizedOrigin = input.origin.replace(/\/+$/, "")
  const token = createVaultLoginLinkToken(input.approvalId, normalizedEmail)
  const loginUrl = `${normalizedOrigin}/api/access/verify?token=${encodeURIComponent(token)}`
  let transporter: nodemailer.Transporter | null = null
  let user = ""

  try {
    const transport = createTransport()
    transporter = transport.transporter
    user = transport.user
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.info("vault_login_link dev_fallback", { email: normalizedEmail, loginUrl })
      return
    }
    throw error
  }

  await transporter.sendMail({
    from: `"FALCO" <${user}>`,
    to: normalizedEmail,
    subject: "Your FALCO vault login link",
    text: [
      "Use the secure link below to enter the FALCO vault.",
      "",
      loginUrl,
      "",
      "This link expires in 15 minutes.",
      "If you did not request access, you can ignore this message.",
    ].join("\n"),
    html: `
      <div style="margin:0;padding:0;background:#000000;color:#ffffff;font-family:Arial,sans-serif;">
        <div style="max-width:640px;margin:0 auto;padding:40px 24px;">
          <div style="font-size:12px;letter-spacing:0.28em;text-transform:uppercase;color:rgba(255,255,255,0.45);">FALCO</div>
          <h1 style="margin:16px 0 0;font-size:32px;line-height:1.04;font-weight:600;letter-spacing:-0.04em;">Secure vault login link</h1>
          <p style="margin:18px 0 0;font-size:15px;line-height:1.8;color:rgba(255,255,255,0.72);">
            Use the link below to enter the private FALCO vault with your approved email.
          </p>
          <div style="margin-top:28px;">
            <a href="${loginUrl}" style="display:inline-block;padding:14px 18px;border-radius:12px;background:#8bffbf;color:#03120a;text-decoration:none;font-size:14px;font-weight:700;">Open FALCO Vault</a>
          </div>
          <p style="margin:22px 0 0;font-size:13px;line-height:1.8;color:rgba(255,255,255,0.5);">
            This link expires in 15 minutes. If you did not request access, you can ignore this message.
          </p>
        </div>
      </div>
    `,
  })
}
