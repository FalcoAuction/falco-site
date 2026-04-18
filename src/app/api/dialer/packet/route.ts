import fs from "fs"
import path from "path"
import { NextRequest, NextResponse } from "next/server"
import { getDialerOrOperatorSession } from "@/lib/dialer-session"

export const dynamic = "force-dynamic"

const PRIVATE_PACKET_DIR = path.join(process.cwd(), "private", "vault", "packets")
const LEAD_KEY_RE = /^[a-f0-9]{8,64}$/i

export async function GET(req: NextRequest) {
  // Auth — dialer or operator session required
  const session = getDialerOrOperatorSession(req)
  if (!session) {
    return NextResponse.json({ ok: false, error: "Not authenticated." }, { status: 401 })
  }

  const leadKey = String(req.nextUrl.searchParams.get("leadKey") ?? "").trim()
  if (!leadKey) {
    return NextResponse.json({ ok: false, error: "Missing leadKey." }, { status: 400 })
  }
  // Defense in depth: lead_key is a hex hash. Reject anything else to avoid path traversal.
  if (!LEAD_KEY_RE.test(leadKey)) {
    return NextResponse.json({ ok: false, error: "Invalid leadKey." }, { status: 400 })
  }

  const filePath = path.join(PRIVATE_PACKET_DIR, `${leadKey}.pdf`)
  // Confirm we stayed inside the dir after path resolution
  if (!filePath.startsWith(PRIVATE_PACKET_DIR + path.sep) && filePath !== PRIVATE_PACKET_DIR) {
    return NextResponse.json({ ok: false, error: "Bad path." }, { status: 400 })
  }

  if (!fs.existsSync(filePath)) {
    return NextResponse.json(
      { ok: false, error: "Packet not yet generated for this lead." },
      { status: 404 }
    )
  }

  try {
    const data = fs.readFileSync(filePath)
    return new NextResponse(new Uint8Array(data), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="falco-${leadKey.slice(0, 12)}.pdf"`,
        "Cache-Control": "private, max-age=300",
      },
    })
  } catch (err) {
    console.error("dialer_packet read error:", err)
    return NextResponse.json({ ok: false, error: "Read failed." }, { status: 500 })
  }
}
