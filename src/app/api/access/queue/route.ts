import { NextResponse } from "next/server"
import { listAccessRequests } from "@/lib/access-workflow"

export async function GET() {
  try {
    const requests = listAccessRequests()
    return NextResponse.json({ ok: true, requests })
  } catch {
    return NextResponse.json(
      { ok: false, error: "Unable to load access queue." },
      { status: 500 }
    )
  }
}